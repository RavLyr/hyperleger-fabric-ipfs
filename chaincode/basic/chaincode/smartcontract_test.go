package chaincode_test

import (
	"crypto/x509"
	"encoding/json"
	"fmt"
	"sort"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
	"github.com/hyperledger/fabric-protos-go-apiv2/ledger/queryresult"
	"github.com/hyperledger/fabric-samples/asset-transfer-basic/chaincode-go/chaincode"
	"github.com/hyperledger/fabric-samples/asset-transfer-basic/chaincode-go/chaincode/mocks"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/timestamppb"
)

//go:generate counterfeiter -o mocks/transaction.go -fake-name TransactionContext . transactionContext
type transactionContext interface {
	contractapi.TransactionContextInterface
}

//go:generate counterfeiter -o mocks/chaincodestub.go -fake-name ChaincodeStub . chaincodeStub
type chaincodeStub interface {
	shim.ChaincodeStubInterface
}

//go:generate counterfeiter -o mocks/statequeryiterator.go -fake-name StateQueryIterator . stateQueryIterator
type stateQueryIterator interface {
	shim.StateQueryIteratorInterface
}

type testClientIdentity struct {
	mspID string
}

func (t testClientIdentity) GetID() (string, error) {
	return "test-client", nil
}

func (t testClientIdentity) GetMSPID() (string, error) {
	return t.mspID, nil
}

func (t testClientIdentity) GetAttributeValue(string) (string, bool, error) {
	return "", false, nil
}

func (t testClientIdentity) AssertAttributeValue(string, string) error {
	return nil
}

func (t testClientIdentity) GetX509Certificate() (*x509.Certificate, error) {
	return nil, nil
}

func newTestContext() (*mocks.TransactionContext, *mocks.ChaincodeStub, map[string][]byte) {
	state := map[string][]byte{}
	stub := &mocks.ChaincodeStub{}

	stub.GetStateCalls(func(key string) ([]byte, error) {
		value, ok := state[key]
		if !ok {
			return nil, nil
		}

		valueCopy := make([]byte, len(value))
		copy(valueCopy, value)
		return valueCopy, nil
	})
	stub.PutStateCalls(func(key string, value []byte) error {
		valueCopy := make([]byte, len(value))
		copy(valueCopy, value)
		state[key] = valueCopy
		return nil
	})
	stub.GetTxTimestampReturns(timestamppb.New(timestamppb.Now().AsTime()), nil)
	stub.SetEventReturns(nil)

	ctx := &mocks.TransactionContext{}
	ctx.GetStubReturns(stub)
	ctx.GetClientIdentityReturns(testClientIdentity{mspID: "Org1MSP"})

	return ctx, stub, state
}

func getCertificateFromState(t *testing.T, state map[string][]byte, certificateID string) chaincode.CertificateAsset {
	t.Helper()

	var certificate chaincode.CertificateAsset
	err := json.Unmarshal(state["CERT_"+certificateID], &certificate)
	require.NoError(t, err)
	return certificate
}

func TestRegisterIssuerSuccess(t *testing.T) {
	ctx, _, state := newTestContext()
	contract := chaincode.SmartContract{}

	err := contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP")
	require.NoError(t, err)

	var issuer chaincode.IssuerAsset
	err = json.Unmarshal(state["ISSUER_ISSUER_1"], &issuer)
	require.NoError(t, err)
	require.Equal(t, "ISSUER_1", issuer.IssuerID)
	require.Equal(t, "ACTIVE", issuer.Status)
	require.Equal(t, "Org1MSP", issuer.MSPID)
}

func TestIssueCertificateSuccess(t *testing.T) {
	ctx, stub, state := newTestContext()
	contract := chaincode.SmartContract{}

	err := contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP")
	require.NoError(t, err)

	err = contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", "")
	require.NoError(t, err)

	certificate := getCertificateFromState(t, state, "CERT_1")
	require.Equal(t, "CERT_1", certificate.CertificateID)
	require.Equal(t, "ACTIVE", certificate.Status)
	require.Equal(t, "student-hash", certificate.StudentIDHash)
	require.Empty(t, certificate.PreviousCertificateID)

	eventName, eventPayload := stub.SetEventArgsForCall(0)
	require.Equal(t, "CertificateIssued", eventName)
	require.Contains(t, string(eventPayload), `"certificateId":"CERT_1"`)
}

func TestIssueCertificateFailsIfIssuerMissing(t *testing.T) {
	ctx, _, _ := newTestContext()
	contract := chaincode.SmartContract{}

	err := contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "MISSING_ISSUER", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", "")
	require.EqualError(t, err, "issuer MISSING_ISSUER does not exist")
}

func TestVerifyValidCertificate(t *testing.T) {
	ctx, _, _ := newTestContext()
	contract := chaincode.SmartContract{}
	require.NoError(t, contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP"))
	require.NoError(t, contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", ""))

	result, err := contract.VerifyCertificate(ctx, "CERT_1", "ipfs-cid")
	require.NoError(t, err)
	require.True(t, result.Valid)
	require.False(t, result.Tampered)
	require.Equal(t, "certificate is valid", result.Message)
}

func TestVerifyFailsIfIPFSCIDDiffers(t *testing.T) {
	ctx, _, _ := newTestContext()
	contract := chaincode.SmartContract{}
	require.NoError(t, contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP"))
	require.NoError(t, contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", ""))

	result, err := contract.VerifyCertificate(ctx, "CERT_1", "changed-ipfs-cid")
	require.NoError(t, err)
	require.False(t, result.Valid)
	require.True(t, result.Tampered)
	require.Equal(t, "IPFS CID does not match certificate record", result.Message)
}

func TestRevokeCertificate(t *testing.T) {
	ctx, stub, state := newTestContext()
	contract := chaincode.SmartContract{}
	require.NoError(t, contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP"))
	require.NoError(t, contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", ""))

	err := contract.RevokeCertificate(ctx, "CERT_1", "reason-hash", "2026-02-01T00:00:00Z")
	require.NoError(t, err)

	certificate := getCertificateFromState(t, state, "CERT_1")
	require.Equal(t, "REVOKED", certificate.Status)

	var revocation chaincode.RevocationRecord
	err = json.Unmarshal(state["REVOKE_CERT_1"], &revocation)
	require.NoError(t, err)
	require.Equal(t, "CERT_1", revocation.CertificateID)
	require.Equal(t, "reason-hash", revocation.ReasonHash)

	eventName, _ := stub.SetEventArgsForCall(1)
	require.Equal(t, "CertificateRevoked", eventName)
}

func TestVerifyRevokedCertificateInvalid(t *testing.T) {
	ctx, _, _ := newTestContext()
	contract := chaincode.SmartContract{}
	require.NoError(t, contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP"))
	require.NoError(t, contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", ""))
	require.NoError(t, contract.RevokeCertificate(ctx, "CERT_1", "reason-hash", "2026-02-01T00:00:00Z"))

	result, err := contract.VerifyCertificate(ctx, "CERT_1", "ipfs-cid")
	require.NoError(t, err)
	require.False(t, result.Valid)
	require.True(t, result.Revoked)
	require.Equal(t, "certificate has been revoked", result.Message)
}

func TestReissueCertificate(t *testing.T) {
	ctx, stub, state := newTestContext()
	contract := chaincode.SmartContract{}
	require.NoError(t, contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP"))
	require.NoError(t, contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", ""))

	err := contract.ReissueCertificate(ctx, "CERT_1", "CERT_2", "CERT-NO-2", "new-ipfs-cid", "reason-hash", "2026-03-01T00:00:00Z")
	require.NoError(t, err)

	oldCertificate := getCertificateFromState(t, state, "CERT_1")
	newCertificate := getCertificateFromState(t, state, "CERT_2")

	require.Equal(t, "REISSUED", oldCertificate.Status)
	require.Equal(t, "CERT_2", oldCertificate.ReplacementCertificateID)
	require.Equal(t, "ACTIVE", newCertificate.Status)
	require.Equal(t, "CERT_1", newCertificate.PreviousCertificateID)
	require.Equal(t, oldCertificate.StudentIDHash, newCertificate.StudentIDHash)
	require.Equal(t, "new-ipfs-cid", newCertificate.IPFSCID)

	var reissue chaincode.ReissueRecord
	err = json.Unmarshal(state["REISSUE_CERT_1_CERT_2"], &reissue)
	require.NoError(t, err)
	require.Equal(t, "CERT_1", reissue.OldCertificateID)
	require.Equal(t, "CERT_2", reissue.NewCertificateID)

	eventName, _ := stub.SetEventArgsForCall(1)
	require.Equal(t, "CertificateReissued", eventName)
}

func TestGetAllCertificates(t *testing.T) {
	ctx, stub, state := newTestContext()
	contract := chaincode.SmartContract{}
	require.NoError(t, contract.RegisterIssuer(ctx, "ISSUER_1", "Example University", "Registrar", "Org1MSP"))
	require.NoError(t, contract.IssueCertificate(ctx, "CERT_1", "CERT-NO-1", "student-hash", "ISSUER_1", "DIPLOMA", "Bachelor Degree", "ipfs-cid", "2026-01-01T00:00:00Z", ""))

	stub.GetStateByRangeCalls(func(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
		var values [][]byte
		for key, value := range state {
			if key >= startKey && key < endKey {
				values = append(values, value)
			}
		}
		sort.Slice(values, func(i, j int) bool {
			return string(values[i]) < string(values[j])
		})

		iterator := &mocks.StateQueryIterator{}
		index := 0
		iterator.HasNextCalls(func() bool {
			return index < len(values)
		})
		iterator.NextCalls(func() (*queryresult.KV, error) {
			if index >= len(values) {
				return nil, fmt.Errorf("no more values")
			}
			value := values[index]
			index++
			return &queryresult.KV{Value: value}, nil
		})
		return iterator, nil
	})

	certificatesJSON, err := contract.GetAllCertificates(ctx)
	require.NoError(t, err)

	var certificates []chaincode.CertificateAsset
	require.NoError(t, json.Unmarshal([]byte(certificatesJSON), &certificates))
	require.Len(t, certificates, 1)
	require.Equal(t, "CERT_1", certificates[0].CertificateID)
}
