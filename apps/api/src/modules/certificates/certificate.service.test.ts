// @ts-nocheck
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppError } from '../../errors/AppError';
import { errorMiddleware } from '../../middleware/error.middleware';
import { createRequireAuth, createRequireIssuerAdmin } from '../../middleware/auth.middleware';
import { sha256Hex } from '../../utils/hash';
import { parseIssueCertificateBody, parseRevokeCertificateBody } from './certificate.dto';
import { createCertificateService, createUploadCertificateService, createVerifyCertificateByNumberService, type FabricGateway } from './certificate.service';
import type { AuthenticatedIssuer } from './certificate.repository';

type Call = {
  readonly mode: 'evaluate' | 'submit';
  readonly functionName: string;
  readonly args: readonly string[];
};


const authenticatedIssuer: AuthenticatedIssuer = {
  issuerId: 'UNDIP',
  organizationName: 'Universitas Diponegoro',
  departmentName: 'Fakultas Kedokteran',
  mspId: 'Org1MSP',
  username: 'undip-admin',
  email: 'admin@undip.test',
  passwordHash: 'hash',
  isActive: true,
  status: 'ACTIVE'
};

function createMockGateway(results: Record<string, unknown> = {}): { gateway: FabricGateway; calls: Call[] } {
  const calls: Call[] = [];

  function readResult(functionName: string): unknown {
    return results[functionName] ?? results[functionName.replace('SmartContract:', '')] ?? null;
  }

  return {
    calls,
    gateway: {
      async evaluateTransaction(functionName: string, ...args: string[]): Promise<unknown> {
        calls.push({ mode: 'evaluate', functionName, args });

        return readResult(functionName);
      },
      async submitTransaction(functionName: string, ...args: string[]): Promise<unknown> {
        calls.push({ mode: 'submit', functionName, args });

        return readResult(functionName);
      },
      async submitTransactionWithTxId(functionName: string, ...args: string[]): Promise<{ transactionId: string; result: unknown }> {
        calls.push({ mode: 'submit', functionName, args });

        return { transactionId: 'mock-tx-id', result: readResult(functionName) };
      }
    }
  };
}

describe('certificate lifecycle chaincode mapping', () => {
  it('registers issuer with RegisterIssuer argument order', async () => {
    const { gateway, calls } = createMockGateway();
    const service = createCertificateService(gateway);

    await service.registerIssuer({
      issuerId: 'DEMO_ISSUER',
      organizationName: 'Demo University',
      departmentName: 'Academic Office',
      mspId: 'Org1MSP'
    });

    assert.deepEqual(calls, [
      {
        mode: 'submit',
        functionName: 'SmartContract:RegisterIssuer',
        args: ['DEMO_ISSUER', 'Demo University', 'Academic Office', 'Org1MSP']
      }
    ]);
  });

  it('issues certificate with IssueCertificate argument order and hashes raw inputs before ledger call', async () => {
    const { gateway, calls } = createMockGateway();
    const service = createCertificateService(gateway);
    const input = parseIssueCertificateBody({
      certificateId: 'CERT-001',
      certificateNumber: 'NO-001',
      studentId: 'NIM-RAW-001',
      issuerId: 'DEMO_ISSUER',
      certificateType: 'DIPLOMA',
      degreeTitle: 'Bachelor Certificate',
      ipfsCid: 'bafy-certificate',
      issuedAt: '2026-06-18T00:00:00Z'
    });

    await service.issueCertificate(input);

    assert.deepEqual(calls, [
      {
        mode: 'submit',
        functionName: 'SmartContract:IssueCertificate',
        args: [
          'CERT-001',
          'NO-001',
          sha256Hex('NIM-RAW-001'),
          'DEMO_ISSUER',
          'DIPLOMA',
          'Bachelor Certificate',
          'bafy-certificate',
          '2026-06-18T00:00:00Z',
          ''
        ]
      }
    ]);
  });

  it('maps missing issuer error when issue certificate fails', async () => {
    const gateway: FabricGateway = {
      async evaluateTransaction(): Promise<unknown> {
        return null;
      },
      async submitTransaction(): Promise<unknown> {
        throw new Error('issuer UNKNOWN does not exist');
      },
      async submitTransactionWithTxId(): Promise<{ transactionId: string; result: unknown }> {
        throw new Error('issuer UNKNOWN does not exist');
      }
    };
    const service = createCertificateService(gateway);

    await assert.rejects(
      service.issueCertificate({
        certificateId: 'CERT-001',
        certificateNumber: 'NO-001',
        studentIdHash: 'student-hash',
        issuerId: 'UNKNOWN',
        certificateType: 'DIPLOMA',
        degreeTitle: 'Bachelor Certificate',
        ipfsCid: 'bafy-certificate',
        issuedAt: '2026-06-18T00:00:00Z',
        expiredAt: ''
      }),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });

  it('verifies certificate with VerifyCertificate evaluate transaction', async () => {
    const expected = {
      certificateId: 'CERT-001',
      valid: true,
      status: 'ACTIVE',
      issuerId: 'DEMO_ISSUER',
      certificateType: 'DIPLOMA',
      message: 'certificate is valid',
      issuedAt: '2026-06-18T00:00:00Z',
      revoked: false,
      tampered: false
    };
    const { gateway, calls } = createMockGateway({ VerifyCertificate: expected });
    const service = createCertificateService(gateway);

    const result = await service.verifyCertificate({ certificateId: 'CERT-001', ipfsCid: 'ipfs-cid' });

    assert.equal(result, expected);
    assert.deepEqual(calls, [
      {
        mode: 'evaluate',
        functionName: 'SmartContract:VerifyCertificate',
        args: ['CERT-001', 'ipfs-cid']
      }
    ]);
  });

  it('returns tampered verification result from chaincode unchanged', async () => {
    const expected = {
      certificateId: 'CERT-001',
      valid: false,
      status: 'ACTIVE',
      issuerId: 'DEMO_ISSUER',
      certificateType: 'DIPLOMA',
      message: 'IPFS CID does not match certificate record',
      issuedAt: '2026-06-18T00:00:00Z',
      revoked: false,
      tampered: true
    };
    const { gateway } = createMockGateway({ VerifyCertificate: expected });
    const service = createCertificateService(gateway);

    const result = await service.verifyCertificate({ certificateId: 'CERT-001', ipfsCid: 'wrong-cid' });

    assert.equal(result, expected);
  });

  it('revokes certificate with reasonHash only', async () => {
    const { gateway, calls } = createMockGateway();
    const service = createCertificateService(gateway);
    const input = parseRevokeCertificateBody(
      { certificateId: 'CERT-001' },
      { reason: 'typed revocation reason', revokedAt: '2026-06-18T01:00:00Z' }
    );

    await service.revokeCertificate(input);

    assert.deepEqual(calls, [
      {
        mode: 'submit',
        functionName: 'SmartContract:RevokeCertificate',
        args: ['CERT-001', sha256Hex('typed revocation reason'), '2026-06-18T01:00:00Z']
      }
    ]);
  });

  it('returns revoked verification invalid result from chaincode unchanged', async () => {
    const expected = {
      certificateId: 'CERT-001',
      valid: false,
      status: 'REVOKED',
      issuerId: 'DEMO_ISSUER',
      certificateType: 'DIPLOMA',
      message: 'certificate has been revoked',
      issuedAt: '2026-06-18T00:00:00Z',
      revoked: true,
      tampered: false
    };
    const { gateway } = createMockGateway({ VerifyCertificate: expected });
    const service = createCertificateService(gateway);

    const result = await service.verifyCertificate({ certificateId: 'CERT-001', ipfsCid: 'ipfs-cid' });

    assert.equal(result, expected);
  });

  it('derives issuer compatibility fields from authenticated issuer during upload', async () => {
    const findCalls: string[] = [];
    const uploaded: Record<string, unknown>[] = [];
    const { gateway, calls } = createMockGateway({ IssuerExists: false, IssueCertificate: true });
    const uploadService = createUploadCertificateService({
      uploadToIPFS: async () => 'bafy-uploaded',
      findCertificateByCertificateNumber: async (certificateNumber: string) => {
        findCalls.push(certificateNumber);
        return null;
      },
      createGateway: () => gateway,
      insertCertificate: async (data) => {
        uploaded.push(data as unknown as Record<string, unknown>);
        return {
          id: 1,
          certificateId: data.certificateId,
          certificateNumber: data.certificateNumber,
          issuerId: data.issuerId,
          certificateType: data.certificateType,
          degreeTitle: data.degreeTitle,
          studentId: data.studentId,
          studentName: data.studentName,
          organizationName: data.organizationName,
          faculty: data.faculty,
          studyProgram: data.studyProgram,
          educationLevel: data.educationLevel,
          graduationDate: data.graduationDate || null,

          ipfsCid: data.ipfsCid,
          file_name: data.file_name,
          mime_type: data.mime_type,
          file_size: data.file_size,
          ledger_tx_id: data.ledger_tx_id,
          status: data.status,
          issuedAt: data.issuedAt,
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-01T00:00:00.000Z',
        };
      }
    });

    const result = await uploadService(
      {
        certificateId: 'CERT-UP-1',
        certificateNumber: 'NO-UP-1',
        issuerId: 'SHOULD-NOT-BE-USED',
        organizationName: 'Fake Org',
        departmentName: 'Fakultas Kedokteran',
        mspId: 'FakeMSP',
        certificateType: 'DIPLOMA',
        degreeTitle: 'Sarjana Teknik',
        studentId: 'NIM-001',
        studentName: 'Budi',
        faculty: 'Fakultas Teknik',
        studyProgram: 'Teknik Sipil',
        educationLevel: 'S1',
        issuedAt: '2026-06-27',
      },
      {
        fieldname: 'file_ijazah',
        originalname: 'ijazah.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1234,
        buffer: Buffer.from('pdf'),
        stream: undefined as never,
        destination: '',
        filename: '',
        path: ''
      },
      authenticatedIssuer
    );

    assert.deepEqual(findCalls, ['NO-UP-1']);
    assert.equal(result.issuerId, 'UNDIP');
    assert.equal(result.organizationName, 'Universitas Diponegoro');
    assert.equal(uploaded[0]?.['issuerId'], 'UNDIP');
    assert.equal(uploaded[0]?.['organizationName'], 'Universitas Diponegoro');
    assert.deepEqual(calls.map((call) => ({ functionName: call.functionName, args: call.args })), [
      { functionName: 'SmartContract:IssuerExists', args: ['UNDIP'] },
      { functionName: 'SmartContract:RegisterIssuer', args: ['UNDIP', 'Universitas Diponegoro', 'Fakultas Kedokteran', 'Org1MSP'] },
      {
        functionName: 'SmartContract:IssueCertificate',
        args: ['CERT-UP-1', 'NO-UP-1', sha256Hex('NIM-001'), 'UNDIP', 'DIPLOMA', 'Sarjana Teknik', 'bafy-uploaded', '2026-06-27', '']
      }
    ]);
  });

  it('uses the authenticated issuer MSP when uploading as Org2', async () => {
    const selectedMsps: string[] = [];
    const { gateway } = createMockGateway({ IssuerExists: false, IssueCertificate: true });
    const uploadService = createUploadCertificateService({
      createGateway: (mspId) => {
        selectedMsps.push(mspId);
        return gateway;
      },
      uploadToIPFS: async () => 'bafy-org2',
      findCertificateByCertificateNumber: async () => null,
      insertCertificate: async (data) => ({
        id: 2,
        certificateId: data.certificateId,
        certificateNumber: data.certificateNumber,
        issuerId: data.issuerId,
        certificateType: data.certificateType,
        degreeTitle: data.degreeTitle,
        studentId: data.studentId,
        studentName: data.studentName,
        organizationName: data.organizationName,
        faculty: data.faculty,
        studyProgram: data.studyProgram,
        educationLevel: data.educationLevel,
        graduationDate: data.graduationDate || null,
        ipfsCid: data.ipfsCid,
        file_name: data.file_name,
        mime_type: data.mime_type,
        file_size: data.file_size,
        ledger_tx_id: data.ledger_tx_id,
        status: data.status,
        issuedAt: data.issuedAt,
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z',
      })
    });

    await uploadService(
      {
        certificateId: 'CERT-ORG2-1',
        certificateNumber: 'NO-ORG2-1',
        issuerId: 'ORG2_ISSUER',
        organizationName: 'Org2 University',
        departmentName: 'QA',
        mspId: 'Org2MSP',
        certificateType: 'DIPLOMA',
        degreeTitle: 'Sarjana Teknik',
        studentId: 'NIM-ORG2',
        studentName: 'Siti',
        faculty: 'Fakultas Teknik',
        studyProgram: 'Teknik Sipil',
        educationLevel: 'S1',
        issuedAt: '2026-06-27',
      },
      {
        fieldname: 'file_ijazah',
        originalname: 'ijazah.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1234,
        buffer: Buffer.from('pdf'),
        stream: undefined as never,
        destination: '',
        filename: '',
        path: ''
      },
      {
        ...authenticatedIssuer,
        issuerId: 'ORG2_ISSUER',
        organizationName: 'Org2 University',
        departmentName: 'QA',
        mspId: 'Org2MSP'
      }
    );

    assert.deepEqual(selectedMsps, ['Org2MSP']);
  });

});


function certificateFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    certificateId: 'CERT-001',
    certificateNumber: 'NO-001',
    issuerId: 'UNDIP',
    certificateType: 'DIPLOMA',
    degreeTitle: 'Sarjana Teknik',
    studentId: 'NIM-001',
    studentName: 'Budi',
    organizationName: 'Universitas Diponegoro',
    faculty: 'Fakultas Teknik',
    studyProgram: 'Teknik Informatika',
    educationLevel: 'S1',
    graduationDate: null,
    ipfsCid: 'bafy-cid',
    file_name: 'ijazah.pdf',
    mime_type: 'application/pdf',
    file_size: 123,
    ledger_tx_id: 'tx-1',
    status: 'VALID',
    issuedAt: '2026-07-13T00:00:00.000Z',
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('public certificate verification', () => {
  it('recovers a ledger-only certificate into the database before verifying it', async () => {
    const recovered: Record<string, unknown>[] = [];
    const service = createVerifyCertificateByNumberService({
      findCertificateByCertificateNumber: async () => null,
      insertRecoveredCertificate: async (data) => {
        recovered.push(data as unknown as Record<string, unknown>);
        return certificateFixture({
          certificateId: data.certificateId,
          certificateNumber: data.certificateNumber,
          issuerId: data.issuerId,
          ipfsCid: data.ipfsCid,
          degreeTitle: data.degreeTitle,
        });
      },
      cidExists: async () => true,
      service: createCertificateService(createMockGateway({
        GetAllCertificates: JSON.stringify([{
          certificateId: 'CERT-LEDGER',
          certificateNumber: 'NO-LEDGER',
          issuerId: 'UNDIP',
          certificateType: 'DIPLOMA',
          title: 'Sarjana Ledger',
          ipfsCid: 'bafy-ledger',
          status: 'ACTIVE',
          issuedAt: '2026-07-13',
        }]),
        VerifyCertificate: { valid: true, message: 'certificate is valid', status: 'ACTIVE' },
      }).gateway),
    });

    const result = await service('NO-LEDGER');

    assert.equal(result.valid, true);
    assert.equal(result.integrityStatus, 'LEDGER_RECOVERED');
    assert.equal(result.dbData?.certificateNumber, 'NO-LEDGER');
    assert.equal(recovered[0]?.['certificateId'], 'CERT-LEDGER');
  });

  it('flags database-only certificates as possible manipulation', async () => {
    const service = createVerifyCertificateByNumberService({
      findCertificateByCertificateNumber: async () => certificateFixture(),
      insertRecoveredCertificate: async () => certificateFixture(),
      cidExists: async () => true,
      service: createCertificateService(createMockGateway({
        VerifyCertificate: { valid: false, message: 'certificate not found' },
      }).gateway),
    });

    const result = await service('NO-001');

    assert.equal(result.valid, false);
    assert.equal(result.integrityStatus, 'DB_LEDGER_MISMATCH');
    assert.match(result.message, /manipulation|illegal/i);
  });

  it('keeps text verification valid but reports missing IPFS files', async () => {
    const service = createVerifyCertificateByNumberService({
      findCertificateByCertificateNumber: async () => certificateFixture(),
      insertRecoveredCertificate: async () => certificateFixture(),
      cidExists: async () => false,
      service: createCertificateService(createMockGateway({
        VerifyCertificate: { valid: true, message: 'certificate is valid', status: 'ACTIVE' },
      }).gateway),
    });

    const result = await service('NO-001');

    assert.equal(result.valid, true);
    assert.equal(result.documentStatus, 'FILE_NOT_FOUND');
    assert.equal(result.documentUrl, null);
  });
});

describe('error middleware', () => {
  it('maps upload validation errors to client status codes', () => {
    const statuses: number[] = [];
    const response = {
      status(code: number) { statuses.push(code); return this; },
      json() { return this; },
    };

    errorMiddleware(new Error('Only PDF files are allowed'), {} as never, response as never, (() => undefined) as never);

    assert.deepEqual(statuses, [415]);
  });
});

describe('auth middleware', () => {
  it('rejects invalid JWT', async () => {
    const middleware = createRequireAuth({
      verifyToken: () => {
        throw new Error('bad token');
      },
      findIssuerByIssuerId: async () => authenticatedIssuer,
    });

    await new Promise<void>((resolve, reject) => {
      middleware(
        {
          header: () => 'Bearer invalid-token',
        } as never,
        {} as never,
        (err?: unknown) => {
          try {
            assert.ok(err instanceof AppError);
            assert.equal(err.statusCode, 401);
            assert.equal(err.message, 'Invalid or expired token');
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  });

  it('allows issuer admin and attaches authenticated issuer', async () => {
    const middleware = createRequireIssuerAdmin({
      verifyToken: () => ({ issuerId: 'UNDIP', role: 'ISSUER_ADMIN' }),
      findIssuerByIssuerId: async () => authenticatedIssuer,
    });

    const req = {
      header: () => 'Bearer valid-token',
      auth: undefined,
    } as unknown as Parameters<ReturnType<typeof createRequireIssuerAdmin>>[0];

    await new Promise<void>((resolve, reject) => {
      middleware(req, {} as never, (err?: unknown) => {
        try {
          assert.equal(err, undefined);
          assert.equal(req.auth?.issuer.issuerId, 'UNDIP');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
