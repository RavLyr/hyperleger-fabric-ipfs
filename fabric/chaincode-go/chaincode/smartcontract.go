package chaincode

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

const (
	docTypeCertificate = "certificate"
	docTypeIssuer      = "issuer"
	docTypeRevocation  = "revocation"
	docTypeReissue     = "reissue"

	statusActive    = "ACTIVE"
	statusRevoked   = "REVOKED"
	statusReissued  = "REISSUED"
	statusExpired   = "EXPIRED"
	statusSuspended = "SUSPENDED"
)

// SmartContract provides certificate lifecycle functions for an academic
// certificate verification system.
type SmartContract struct {
	contractapi.Contract
}

type CertificateAsset struct {
	DocType                  string `json:"docType"`
	CertificateID            string `json:"certificateId"`
	CertificateNumber        string `json:"certificateNumber"`
	StudentIDHash            string `json:"studentIdHash"`
	IssuerID                 string `json:"issuerId"`
	CertificateType          string `json:"certificateType"`
	Title                    string `json:"title"`
	IPFSCID                  string `json:"ipfsCid"`
	Status                   string `json:"status"`
	IssuedAt                 string `json:"issuedAt"`
	ExpiredAt                string `json:"expiredAt"`
	PreviousCertificateID    string `json:"previousCertificateId"`
	ReplacementCertificateID string `json:"replacementCertificateId"`
	CreatedAt                string `json:"createdAt"`
	UpdatedAt                string `json:"updatedAt"`
}

type IssuerAsset struct {
	DocType          string `json:"docType"`
	IssuerID         string `json:"issuerId"`
	OrganizationName string `json:"organizationName"`
	DepartmentName   string `json:"departmentName"`
	MSPID            string `json:"mspId"`
	Status           string `json:"status"`
	RegisteredAt     string `json:"registeredAt"`
	UpdatedAt        string `json:"updatedAt"`
}

type RevocationRecord struct {
	DocType       string `json:"docType"`
	RevocationID  string `json:"revocationId"`
	CertificateID string `json:"certificateId"`
	RevokedBy     string `json:"revokedBy"`
	ReasonHash    string `json:"reasonHash"`
	RevokedAt     string `json:"revokedAt"`
}

type ReissueRecord struct {
	DocType          string `json:"docType"`
	ReissueID        string `json:"reissueId"`
	OldCertificateID string `json:"oldCertificateId"`
	NewCertificateID string `json:"newCertificateId"`
	ReissuedBy       string `json:"reissuedBy"`
	ReasonHash       string `json:"reasonHash"`
	ReissuedAt       string `json:"reissuedAt"`
}

type VerificationResult struct {
	CertificateID   string `json:"certificateId"`
	Valid           bool   `json:"valid"`
	Status          string `json:"status"`
	IssuerID        string `json:"issuerId"`
	CertificateType string `json:"certificateType"`
	Message         string `json:"message"`
	IssuedAt        string `json:"issuedAt"`
	Revoked         bool   `json:"revoked"`
	Tampered        bool   `json:"tampered"`
}

type HistoryRecord struct {
	TxID      string `json:"txId"`
	Timestamp string `json:"timestamp"`
	IsDelete  bool   `json:"isDelete"`
	Value     string `json:"value"`
}

func certificateKey(certificateID string) string {
	return "CERT_" + certificateID
}

func issuerKey(issuerID string) string {
	return "ISSUER_" + issuerID
}

func revocationKey(certificateID string) string {
	return "REVOKE_" + certificateID
}

func reissueKey(oldCertificateID, newCertificateID string) string {
	return "REISSUE_" + oldCertificateID + "_" + newCertificateID
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	now, err := txTimestamp(ctx)
	if err != nil {
		return err
	}

	exists, err := s.IssuerExists(ctx, "DEMO_ISSUER")
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	issuer := IssuerAsset{
		DocType:          docTypeIssuer,
		IssuerID:         "DEMO_ISSUER",
		OrganizationName: "Demo University",
		DepartmentName:   "Academic Office",
		MSPID:            "Org1MSP",
		Status:           statusActive,
		RegisteredAt:     now,
		UpdatedAt:        now,
	}

	return putJSON(ctx, issuerKey(issuer.IssuerID), issuer)
}

func (s *SmartContract) RegisterIssuer(ctx contractapi.TransactionContextInterface, issuerID, organizationName, departmentName, mspID string) error {
	if err := requireNonEmpty(map[string]string{
		"issuerID":         issuerID,
		"organizationName": organizationName,
		"departmentName":   departmentName,
		"mspID":            mspID,
	}); err != nil {
		return err
	}

	if err := authorizeMSP(ctx, mspID); err != nil {
		return err
	}

	exists, err := s.IssuerExists(ctx, issuerID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("issuer %s already exists", issuerID)
	}

	now, err := txTimestamp(ctx)
	if err != nil {
		return err
	}

	issuer := IssuerAsset{
		DocType:          docTypeIssuer,
		IssuerID:         issuerID,
		OrganizationName: organizationName,
		DepartmentName:   departmentName,
		MSPID:            mspID,
		Status:           statusActive,
		RegisteredAt:     now,
		UpdatedAt:        now,
	}

	return putJSON(ctx, issuerKey(issuerID), issuer)
}

func (s *SmartContract) GetIssuer(ctx contractapi.TransactionContextInterface, issuerID string) (*IssuerAsset, error) {
	if err := requireNonEmpty(map[string]string{"issuerID": issuerID}); err != nil {
		return nil, err
	}

	issuerJSON, err := ctx.GetStub().GetState(issuerKey(issuerID))
	if err != nil {
		return nil, fmt.Errorf("failed to read issuer %s from world state: %w", issuerID, err)
	}
	if issuerJSON == nil {
		return nil, fmt.Errorf("issuer %s does not exist", issuerID)
	}

	var issuer IssuerAsset
	if err := json.Unmarshal(issuerJSON, &issuer); err != nil {
		return nil, fmt.Errorf("failed to unmarshal issuer %s: %w", issuerID, err)
	}

	return &issuer, nil
}

func (s *SmartContract) IssuerExists(ctx contractapi.TransactionContextInterface, issuerID string) (bool, error) {
	if strings.TrimSpace(issuerID) == "" {
		return false, fmt.Errorf("issuerID is required")
	}

	issuerJSON, err := ctx.GetStub().GetState(issuerKey(issuerID))
	if err != nil {
		return false, fmt.Errorf("failed to read issuer %s from world state: %w", issuerID, err)
	}

	return issuerJSON != nil, nil
}

func (s *SmartContract) IssueCertificate(ctx contractapi.TransactionContextInterface, certificateID, certificateNumber, studentIDHash, issuerID, certificateType, title, ipfsCid, issuedAt, expiredAt string) error {
	if err := requireNonEmpty(map[string]string{
		"certificateID":     certificateID,
		"certificateNumber": certificateNumber,
		"studentIDHash":     studentIDHash,
		"issuerID":          issuerID,
		"certificateType":   certificateType,
		"title":             title,
		"ipfsCid":           ipfsCid,
		"issuedAt":          issuedAt,
	}); err != nil {
		return err
	}

	exists, err := s.CertificateExists(ctx, certificateID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("certificate %s already exists", certificateID)
	}

	issuer, err := s.GetIssuer(ctx, issuerID)
	if err != nil {
		return err
	}
	if issuer.Status != statusActive {
		return fmt.Errorf("issuer %s is not active", issuerID)
	}
	if err := authorizeMSP(ctx, issuer.MSPID); err != nil {
		return err
	}

	now, err := txTimestamp(ctx)
	if err != nil {
		return err
	}

	certificate := CertificateAsset{
		DocType:           docTypeCertificate,
		CertificateID:     certificateID,
		CertificateNumber: certificateNumber,
		StudentIDHash:     studentIDHash,
		IssuerID:          issuerID,
		CertificateType:   certificateType,
		Title:             title,
		IPFSCID:           ipfsCid,
		Status:            statusActive,
		IssuedAt:          issuedAt,
		ExpiredAt:         expiredAt,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := putJSON(ctx, certificateKey(certificateID), certificate); err != nil {
		return err
	}

	return emitJSONEvent(ctx, "CertificateIssued", certificate)
}

func (s *SmartContract) GetCertificate(ctx contractapi.TransactionContextInterface, certificateID string) (*CertificateAsset, error) {
	if err := requireNonEmpty(map[string]string{"certificateID": certificateID}); err != nil {
		return nil, err
	}

	certificateJSON, err := ctx.GetStub().GetState(certificateKey(certificateID))
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate %s from world state: %w", certificateID, err)
	}
	if certificateJSON == nil {
		return nil, fmt.Errorf("certificate %s does not exist", certificateID)
	}

	var certificate CertificateAsset
	if err := json.Unmarshal(certificateJSON, &certificate); err != nil {
		return nil, fmt.Errorf("failed to unmarshal certificate %s: %w", certificateID, err)
	}

	return &certificate, nil
}

func (s *SmartContract) CertificateExists(ctx contractapi.TransactionContextInterface, certificateID string) (bool, error) {
	if strings.TrimSpace(certificateID) == "" {
		return false, fmt.Errorf("certificateID is required")
	}

	certificateJSON, err := ctx.GetStub().GetState(certificateKey(certificateID))
	if err != nil {
		return false, fmt.Errorf("failed to read certificate %s from world state: %w", certificateID, err)
	}

	return certificateJSON != nil, nil
}

func (s *SmartContract) VerifyCertificate(ctx contractapi.TransactionContextInterface, certificateID, ipfsCid string) (*VerificationResult, error) {
	if err := requireNonEmpty(map[string]string{"certificateID": certificateID}); err != nil {
		return nil, err
	}

	result := &VerificationResult{
		CertificateID: certificateID,
		Valid:         false,
		Message:       "certificate not found",
	}

	certificateJSON, err := ctx.GetStub().GetState(certificateKey(certificateID))
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate %s from world state: %w", certificateID, err)
	}
	if certificateJSON == nil {
		return result, nil
	}

	var certificate CertificateAsset
	if err := json.Unmarshal(certificateJSON, &certificate); err != nil {
		return nil, fmt.Errorf("failed to unmarshal certificate %s: %w", certificateID, err)
	}

	result.Status = certificate.Status
	result.IssuerID = certificate.IssuerID
	result.CertificateType = certificate.CertificateType
	result.IssuedAt = certificate.IssuedAt
	result.Revoked = certificate.Status == statusRevoked

	if strings.TrimSpace(ipfsCid) != "" && ipfsCid != certificate.IPFSCID {
		result.Tampered = true
		result.Message = "IPFS CID does not match certificate record"
		return result, nil
	}

	switch certificate.Status {
	case statusRevoked:
		result.Message = "certificate has been revoked"
		return result, nil
	case statusReissued:
		result.Message = "certificate has been replaced by a reissued certificate"
		return result, nil
	case statusExpired:
		result.Message = "certificate has expired"
		return result, nil
	case statusActive:
	default:
		result.Message = fmt.Sprintf("certificate has unsupported status %s", certificate.Status)
		return result, nil
	}

	issuer, err := s.GetIssuer(ctx, certificate.IssuerID)
	if err != nil {
		result.Message = err.Error()
		return result, nil
	}
	if issuer.Status != statusActive {
		result.Message = "issuer is not active"
		return result, nil
	}

	result.Valid = true
	result.Message = "certificate is valid"
	return result, nil
}

func (s *SmartContract) RevokeCertificate(ctx contractapi.TransactionContextInterface, certificateID, reasonHash, revokedAt string) error {
	if err := requireNonEmpty(map[string]string{
		"certificateID": certificateID,
		"reasonHash":    reasonHash,
		"revokedAt":     revokedAt,
	}); err != nil {
		return err
	}

	certificate, err := s.GetCertificate(ctx, certificateID)
	if err != nil {
		return err
	}
	if certificate.Status != statusActive {
		return fmt.Errorf("certificate %s must be ACTIVE to revoke, current status is %s", certificateID, certificate.Status)
	}

	issuer, err := s.GetIssuer(ctx, certificate.IssuerID)
	if err != nil {
		return err
	}
	if err := authorizeMSP(ctx, issuer.MSPID); err != nil {
		return err
	}

	now, err := txTimestamp(ctx)
	if err != nil {
		return err
	}

	certificate.Status = statusRevoked
	certificate.UpdatedAt = now
	if err := putJSON(ctx, certificateKey(certificateID), certificate); err != nil {
		return err
	}

	record := RevocationRecord{
		DocType:       docTypeRevocation,
		RevocationID:  "REVOKE_" + certificateID,
		CertificateID: certificateID,
		RevokedBy:     issuer.IssuerID,
		ReasonHash:    reasonHash,
		RevokedAt:     revokedAt,
	}
	if err := putJSON(ctx, revocationKey(certificateID), record); err != nil {
		return err
	}

	return emitJSONEvent(ctx, "CertificateRevoked", record)
}

func (s *SmartContract) GetRevocationInfo(ctx contractapi.TransactionContextInterface, certificateID string) (*RevocationRecord, error) {
	if err := requireNonEmpty(map[string]string{"certificateID": certificateID}); err != nil {
		return nil, err
	}

	recordJSON, err := ctx.GetStub().GetState(revocationKey(certificateID))
	if err != nil {
		return nil, fmt.Errorf("failed to read revocation for certificate %s from world state: %w", certificateID, err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("revocation for certificate %s does not exist", certificateID)
	}

	var record RevocationRecord
	if err := json.Unmarshal(recordJSON, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal revocation for certificate %s: %w", certificateID, err)
	}

	return &record, nil
}

func (s *SmartContract) ReissueCertificate(ctx contractapi.TransactionContextInterface, oldCertificateID, newCertificateID, newCertificateNumber, newIpfsCid, reasonHash, reissuedAt string) error {
	if err := requireNonEmpty(map[string]string{
		"oldCertificateID":     oldCertificateID,
		"newCertificateID":     newCertificateID,
		"newCertificateNumber": newCertificateNumber,
		"newIpfsCid":           newIpfsCid,
		"reasonHash":           reasonHash,
		"reissuedAt":           reissuedAt,
	}); err != nil {
		return err
	}

	oldCertificate, err := s.GetCertificate(ctx, oldCertificateID)
	if err != nil {
		return err
	}
	if oldCertificate.Status != statusActive {
		return fmt.Errorf("certificate %s must be ACTIVE to reissue, current status is %s", oldCertificateID, oldCertificate.Status)
	}

	exists, err := s.CertificateExists(ctx, newCertificateID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("certificate %s already exists", newCertificateID)
	}

	issuer, err := s.GetIssuer(ctx, oldCertificate.IssuerID)
	if err != nil {
		return err
	}
	if err := authorizeMSP(ctx, issuer.MSPID); err != nil {
		return err
	}

	now, err := txTimestamp(ctx)
	if err != nil {
		return err
	}

	newCertificate := CertificateAsset{
		DocType:               docTypeCertificate,
		CertificateID:         newCertificateID,
		CertificateNumber:     newCertificateNumber,
		StudentIDHash:         oldCertificate.StudentIDHash,
		IssuerID:              oldCertificate.IssuerID,
		CertificateType:       oldCertificate.CertificateType,
		Title:                 oldCertificate.Title,
		IPFSCID:               newIpfsCid,
		Status:                statusActive,
		IssuedAt:              reissuedAt,
		ExpiredAt:             oldCertificate.ExpiredAt,
		PreviousCertificateID: oldCertificateID,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	oldCertificate.Status = statusReissued
	oldCertificate.ReplacementCertificateID = newCertificateID
	oldCertificate.UpdatedAt = now

	if err := putJSON(ctx, certificateKey(oldCertificateID), oldCertificate); err != nil {
		return err
	}
	if err := putJSON(ctx, certificateKey(newCertificateID), newCertificate); err != nil {
		return err
	}

	record := ReissueRecord{
		DocType:          docTypeReissue,
		ReissueID:        reissueKey(oldCertificateID, newCertificateID),
		OldCertificateID: oldCertificateID,
		NewCertificateID: newCertificateID,
		ReissuedBy:       issuer.IssuerID,
		ReasonHash:       reasonHash,
		ReissuedAt:       reissuedAt,
	}
	if err := putJSON(ctx, reissueKey(oldCertificateID, newCertificateID), record); err != nil {
		return err
	}

	return emitJSONEvent(ctx, "CertificateReissued", record)
}

func (s *SmartContract) GetCertificateHistory(ctx contractapi.TransactionContextInterface, certificateID string) ([]HistoryRecord, error) {
	if err := requireNonEmpty(map[string]string{"certificateID": certificateID}); err != nil {
		return nil, err
	}

	iterator, err := ctx.GetStub().GetHistoryForKey(certificateKey(certificateID))
	if err != nil {
		return nil, fmt.Errorf("failed to get history for certificate %s: %w", certificateID, err)
	}
	defer iterator.Close()

	var history []HistoryRecord
	for iterator.HasNext() {
		modification, err := iterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to read history for certificate %s: %w", certificateID, err)
		}

		timestamp := ""
		if modification.Timestamp != nil {
			timestamp = modification.Timestamp.AsTime().UTC().Format(time.RFC3339)
		}

		history = append(history, HistoryRecord{
			TxID:      modification.TxId,
			Timestamp: timestamp,
			IsDelete:  modification.IsDelete,
			Value:     string(modification.Value),
		})
	}

	return history, nil
}

func (s *SmartContract) GetAllCertificates(ctx contractapi.TransactionContextInterface) (string, error) {
	certificates, err := s.getAllCertificateAssets(ctx)
	if err != nil {
		return "", err
	}

	certificatesJSON, err := json.Marshal(certificates)
	if err != nil {
		return "", fmt.Errorf("failed to marshal certificates: %w", err)
	}

	return string(certificatesJSON), nil
}

func (s *SmartContract) GetCertificatesByIssuer(ctx contractapi.TransactionContextInterface, issuerID string) (string, error) {
	if err := requireNonEmpty(map[string]string{"issuerID": issuerID}); err != nil {
		return "", err
	}

	certificates, err := s.getAllCertificateAssets(ctx)
	if err != nil {
		return "", err
	}

	var filtered []*CertificateAsset
	for _, certificate := range certificates {
		if certificate.IssuerID == issuerID {
			filtered = append(filtered, certificate)
		}
	}

	filteredJSON, err := json.Marshal(filtered)
	if err != nil {
		return "", fmt.Errorf("failed to marshal certificates for issuer %s: %w", issuerID, err)
	}

	return string(filteredJSON), nil
}

func (s *SmartContract) getAllCertificateAssets(ctx contractapi.TransactionContextInterface) ([]*CertificateAsset, error) {
	iterator, err := ctx.GetStub().GetStateByRange("CERT_", "CERT_~")
	if err != nil {
		return nil, fmt.Errorf("failed to get certificate range: %w", err)
	}
	defer iterator.Close()

	var certificates []*CertificateAsset
	for iterator.HasNext() {
		queryResponse, err := iterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to read next certificate: %w", err)
		}

		var certificate CertificateAsset
		if err := json.Unmarshal(queryResponse.Value, &certificate); err != nil {
			return nil, fmt.Errorf("failed to unmarshal certificate %s: %w", queryResponse.Key, err)
		}
		if certificate.DocType == docTypeCertificate {
			certificates = append(certificates, &certificate)
		}
	}

	return certificates, nil
}

func requireNonEmpty(fields map[string]string) error {
	for name, value := range fields {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("%s is required", name)
		}
	}
	return nil
}

func authorizeMSP(ctx contractapi.TransactionContextInterface, requiredMSPID string) error {
	// TODO: Integrate Fabric CA attribute-based access control for roles such as
	// admin, issuer, and auditor. For now, mutating transactions require caller
	// MSP ID to match the issuer MSP ID.
	clientIdentity := ctx.GetClientIdentity()
	if clientIdentity == nil {
		return fmt.Errorf("client identity is required")
	}

	callerMSPID, err := clientIdentity.GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get caller MSP ID: %w", err)
	}
	if callerMSPID != requiredMSPID {
		return fmt.Errorf("caller MSP ID %s is not authorized for issuer MSP ID %s", callerMSPID, requiredMSPID)
	}

	return nil
}

func txTimestamp(ctx contractapi.TransactionContextInterface) (string, error) {
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get transaction timestamp: %w", err)
	}
	if timestamp == nil {
		return "", fmt.Errorf("transaction timestamp is required")
	}

	return timestamp.AsTime().UTC().Format(time.RFC3339), nil
}

func putJSON(ctx contractapi.TransactionContextInterface, key string, value interface{}) error {
	valueJSON, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal %s: %w", key, err)
	}

	if err := ctx.GetStub().PutState(key, valueJSON); err != nil {
		return fmt.Errorf("failed to put %s to world state: %w", key, err)
	}

	return nil
}

func emitJSONEvent(ctx contractapi.TransactionContextInterface, eventName string, payload interface{}) error {
	eventJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal event %s: %w", eventName, err)
	}

	if err := ctx.GetStub().SetEvent(eventName, eventJSON); err != nil {
		return fmt.Errorf("failed to emit event %s: %w", eventName, err)
	}

	return nil
}
