import { randomUUID } from 'node:crypto';

import { AppError } from '../../errors/AppError';
import type { FabricResult } from '../../infrastructure/fabric/fabric-result';
import { cidExists, getIPFSGatewayUrl, uploadToIPFS } from '../../infrastructure/ipfs/ipfs.service';
import { fabricGatewayForMsp } from '../fabric/fabric.service';
import { sha256Hex } from '../../utils/hash';
import { evaluateTransaction, submitTransaction, submitTransactionWithTxId } from '../fabric/fabric.service';
import type {
  Certificate,
  CertificateTextInput,
  CreateCertificateInput,
  IssueCertificateInput,
  RegisterIssuerInput,
  RevokeCertificateInput,
  VerifyCertificateInput
} from './certificate.dto';
import {
  findAllCertificates,
  findCertificateByCertificateNumber,
  insertCertificate,
  insertRecoveredCertificate,
  markCertificateRevoked,
  type AuthenticatedIssuer,
} from './certificate.repository';

export type FabricGateway = {
  readonly evaluateTransaction: (functionName: string, ...args: string[]) => Promise<FabricResult>;
  readonly submitTransaction: (functionName: string, ...args: string[]) => Promise<FabricResult>;
  readonly submitTransactionWithTxId: (
    functionName: string,
    ...args: string[]
  ) => Promise<{ readonly transactionId: string; readonly result: FabricResult }>;
};

const defaultGateway: FabricGateway = {
  evaluateTransaction,
  submitTransaction,
  submitTransactionWithTxId
};

const REQUIRED_UPLOAD_FIELDS = [
  'certificateNumber',
  'issuerId',
  'organizationName',
  'departmentName',
  'mspId',
  'certificateType',
  'degreeTitle',
  'studentId',
  'studentName',
  'faculty',
  'studyProgram',
  'educationLevel',
  'issuedAt',
] as const;

type RawBody = Record<string, unknown>;

function chaincodeFunction(name: string): string {
  return `SmartContract:${name}`;
}

function isTrueFabricResult(result: FabricResult): boolean {
  return result === true || result === 'true';
}

function mapFabricError(err: unknown): never {
  if (err instanceof AppError) {
    throw err;
  }

  if (!(err instanceof Error)) {
    throw new AppError('Fabric transaction failed', 502);
  }

  const message = err.message || 'Fabric transaction failed';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('does not exist') || lowerMessage.includes('not found')) {
    throw new AppError(message, 404);
  }

  if (
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('not active') ||
    lowerMessage.includes('not authorized') ||
    lowerMessage.includes('msp id') ||
    lowerMessage.includes('must be active') ||
    lowerMessage.includes('is required')
  ) {
    throw new AppError(message, 409);
  }

  throw new AppError(message, 502);
}

async function runFabric<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    mapFabricError(err);
  }
}

export function createCertificateService(gateway: FabricGateway = defaultGateway) {
  return {
    initLedger(): Promise<FabricResult> {
      return runFabric(() => gateway.submitTransaction(chaincodeFunction('InitLedger')));
    },

    registerIssuer(input: RegisterIssuerInput): Promise<FabricResult> {
      return runFabric(() =>
        gateway.submitTransaction(
          chaincodeFunction('RegisterIssuer'),
          input.issuerId,
          input.organizationName,
          input.departmentName,
          input.mspId
        )
      );
    },

    getIssuer(issuerId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('GetIssuer'), issuerId));
    },

    issuerExists(issuerId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('IssuerExists'), issuerId));
    },

    issueCertificate(input: IssueCertificateInput): Promise<FabricResult> {
      return runFabric(() =>
        gateway.submitTransaction(
          chaincodeFunction('IssueCertificate'),
          input.certificateId,
          input.certificateNumber,
          input.studentIdHash,
          input.issuerId,
          input.certificateType,
          input.title,
          input.ipfsCid,
          input.issuedAt,
          input.expiredAt
        )
      );
    },

    issueCertificateWithTxId(
      input: IssueCertificateInput
    ): Promise<{ readonly transactionId: string; readonly result: FabricResult }> {
      return runFabric(() =>
        gateway.submitTransactionWithTxId(
          chaincodeFunction('IssueCertificate'),
          input.certificateId,
          input.certificateNumber,
          input.studentIdHash,
          input.issuerId,
          input.certificateType,
          input.title,
          input.ipfsCid,
          input.issuedAt,
          input.expiredAt
        )
      );
    },

    getCertificate(certificateId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('GetCertificate'), certificateId));
    },

    certificateExists(certificateId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('CertificateExists'), certificateId));
    },

    verifyCertificate(input: VerifyCertificateInput): Promise<FabricResult> {
      return runFabric(() =>
        gateway.evaluateTransaction(chaincodeFunction('VerifyCertificate'), input.certificateId, input.ipfsCid)
      );
    },

    revokeCertificate(input: RevokeCertificateInput): Promise<FabricResult> {
      return runFabric(() =>
        gateway.submitTransaction(chaincodeFunction('RevokeCertificate'), input.certificateId, input.reasonHash, input.revokedAt)
      );
    },

    revokeCertificateWithTxId(
      input: RevokeCertificateInput
    ): Promise<{ readonly transactionId: string; readonly result: FabricResult }> {
      return runFabric(() =>
        gateway.submitTransactionWithTxId(
          chaincodeFunction("RevokeCertificate"),
          input.certificateId,
          input.reasonHash,
          input.revokedAt
        )
      );
    },

    getRevocationInfo(certificateId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('GetRevocationInfo'), certificateId));
    },

    getCertificateHistory(certificateId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('GetCertificateHistory'), certificateId));
    },

    getAllCertificates(): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('GetAllCertificates')));
    },

    getCertificatesByIssuer(issuerId: string): Promise<FabricResult> {
      return runFabric(() => gateway.evaluateTransaction(chaincodeFunction('GetCertificatesByIssuer'), issuerId));
    }
  };
}

export const certificateService = createCertificateService();

export type UploadCertificateDependencies = {
  readonly uploadToIPFS: (buffer: Buffer, fileName: string) => Promise<string>;
  readonly findCertificateByCertificateNumber: typeof findCertificateByCertificateNumber;
  readonly insertCertificate: typeof insertCertificate;
  readonly createGateway: (mspId: string) => FabricGateway;
};

const uploadDependencies: UploadCertificateDependencies = {
  uploadToIPFS,
  findCertificateByCertificateNumber,
  insertCertificate,
  createGateway: fabricGatewayForMsp
};

export function createUploadCertificateService(dependencies: UploadCertificateDependencies = uploadDependencies) {
  return async function uploadCertificateWithDependencies(
    body: RawBody,
    file: Express.Multer.File | undefined,
    authenticatedIssuer: AuthenticatedIssuer
  ): Promise<Certificate> {
    if (!file) {
      throw new Error('file_ijazah is required');
    }

    const input = validateCertificateBody({
      ...body,
      issuerId: authenticatedIssuer.issuerId,
      organizationName: authenticatedIssuer.organizationName,
      departmentName: authenticatedIssuer.departmentName,
      mspId: authenticatedIssuer.mspId
    });
    const existingCertificate = await dependencies.findCertificateByCertificateNumber(input.certificateNumber);

    if (existingCertificate) {
      throw new Error(`certificateNumber already exists: ${input.certificateNumber}`);
    }

    const gateway = dependencies.createGateway(authenticatedIssuer.mspId);
    const service = createCertificateService(gateway);
    const ipfsCid = await dependencies.uploadToIPFS(file.buffer, file.originalname);
    const issuerExists = await service.issuerExists(input.issuerId);

    if (!isTrueFabricResult(issuerExists)) {
      await service.registerIssuer({
        issuerId: input.issuerId,
        organizationName: input.organizationName,
        departmentName: input.departmentName,
        mspId: input.mspId,
      });
    }

    const fabricTransaction = await service.issueCertificateWithTxId({
      certificateId: input.certificateId,
      certificateNumber: input.certificateNumber,
      studentIdHash: sha256Hex(input.studentId),
      issuerId: input.issuerId,
      certificateType: input.certificateType,
      title: input.degreeTitle,
      ipfsCid,
      issuedAt: input.issuedAt,
      expiredAt: ''
    });

    return dependencies.insertCertificate({
      ...input,
      ipfsCid,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      ledger_tx_id: fabricTransaction.transactionId,
      status: 'VALID',
    });
  };
}

export const uploadCertificate = createUploadCertificateService();

export async function uploadCertificateLegacy(
  body: RawBody,
  file: Express.Multer.File | undefined
): Promise<Certificate> {
  if (!file) {
    throw new Error('file_ijazah is required');
  }

  const input = validateCertificateBody(body);

  return uploadCertificate(body, file, {
    issuerId: input.issuerId,
    organizationName: input.organizationName,
    departmentName: input.departmentName,
    mspId: input.mspId,
    username: '',
    email: '',
    passwordHash: '',
    isActive: true,
    status: 'ACTIVE'
  });
}

export async function revokeCertificateAndSync(input: RevokeCertificateInput, mspId?: string): Promise<{
  readonly fabricResult: FabricResult;
  readonly certificate: Certificate;
}> {
  const service = mspId ? createCertificateService(fabricGatewayForMsp(mspId)) : certificateService;
  const fabricTransaction = await service.revokeCertificateWithTxId(input);
  const certificate = await markCertificateRevoked({
    certificateId: input.certificateId,
    reasonHash: input.reasonHash,
    ledgerTxId: fabricTransaction.transactionId,
    revokedAt: input.revokedAt,
  });

  return {
    fabricResult: fabricTransaction.result,
    certificate,
  };
}

export async function verifyCertificateService(
  certificateNumber: string
): Promise<Certificate | null> {
  const cleanCertificateNumber = certificateNumber.trim();

  if (!cleanCertificateNumber) {
    throw new Error('certificateNumber is required');
  }

  return findCertificateByCertificateNumber(cleanCertificateNumber);
}

export type PublicVerificationResult = {
  readonly success: true;
  readonly valid: boolean;
  readonly message: string;
  readonly ledgerData?: unknown;
  readonly dbData?: Certificate | null;
  readonly data?: null;
  readonly documentUrl?: string | null;
  readonly documentStatus?: 'AVAILABLE' | 'FILE_NOT_FOUND' | 'NOT_CHECKED';
  readonly documentError?: string;
  readonly integrityStatus?: 'OK' | 'DB_LEDGER_MISMATCH' | 'LEDGER_RECOVERED';
};

type LedgerCertificate = {
  readonly certificateId?: string;
  readonly certificateNumber?: string;
  readonly issuerId?: string;
  readonly certificateType?: string;
  readonly title?: string;
  readonly ipfsCid?: string;
  readonly status?: string;
  readonly issuedAt?: string;
};

const ledgerLookupCache = new Map<string, { readonly expiresAt: number; readonly promise: Promise<LedgerCertificate | null> }>();

type VerifyByNumberDependencies = {
  readonly findCertificateByCertificateNumber: typeof findCertificateByCertificateNumber;
  readonly insertRecoveredCertificate: typeof insertRecoveredCertificate;
  readonly service: ReturnType<typeof createCertificateService>;
  readonly cidExists: (cid: string) => Promise<boolean>;
};

const verifyByNumberDependencies: VerifyByNumberDependencies = {
  findCertificateByCertificateNumber,
  insertRecoveredCertificate,
  service: certificateService,
  cidExists,
};

export function createVerifyCertificateByNumberService(dependencies: VerifyByNumberDependencies = verifyByNumberDependencies) {
  return async function verifyCertificateByNumber(certificateNumber: string): Promise<PublicVerificationResult> {
    const cleanCertificateNumber = certificateNumber.trim();

    if (!cleanCertificateNumber) {
      throw new Error('certificateNumber is required');
    }

    let certificate = await dependencies.findCertificateByCertificateNumber(cleanCertificateNumber);
    let integrityStatus: PublicVerificationResult['integrityStatus'] = 'OK';

    if (!certificate) {
      const ledgerCertificate = await findLedgerCertificateByNumber(cleanCertificateNumber, dependencies.service);

      if (!ledgerCertificate) {
        return { success: true, valid: false, message: 'Certificate not found in database or ledger', data: null };
      }

      certificate = await dependencies.insertRecoveredCertificate(recoveredCertificateInput(ledgerCertificate));
      integrityStatus = 'LEDGER_RECOVERED';
    }

    if (!certificate) {
      throw new AppError('Certificate recovery failed', 500);
    }

    const ledgerResult = await dependencies.service.verifyCertificate({
      certificateId: certificate.certificateId,
      ipfsCid: certificate.ipfsCid,
    }) as Record<string, unknown> | null;

    if (ledgerResult?.valid === false && /not found/i.test(String(ledgerResult.message ?? ''))) {
      return {
        success: true,
        valid: false,
        message: 'Certificate exists in PostgreSQL but not in ledger; possible manipulation/illegal data',
        ledgerData: ledgerResult,
        dbData: certificate,
        documentUrl: null,
        documentStatus: 'NOT_CHECKED',
        integrityStatus: 'DB_LEDGER_MISMATCH',
      };
    }

    const valid = ledgerResult?.valid === true;

    if (!valid) {
      return {
        success: true,
        valid: false,
        message: String(ledgerResult?.message ?? 'Ledger verification failed'),
        ledgerData: ledgerResult,
        dbData: certificate,
        documentUrl: null,
        documentStatus: 'NOT_CHECKED',
        integrityStatus,
      };
    }

    const documentExists = await dependencies.cidExists(certificate.ipfsCid);

    return {
      success: true,
      valid: true,
      message: String(ledgerResult?.message ?? 'certificate is valid'),
      ledgerData: ledgerResult,
      dbData: certificate,
      documentUrl: documentExists ? getIPFSGatewayUrl(certificate.ipfsCid) : null,
      documentStatus: documentExists ? 'AVAILABLE' : 'FILE_NOT_FOUND',
      documentError: documentExists ? undefined : 'File Not Found in IPFS',
      integrityStatus,
    };
  };
}

export const verifyCertificateByNumber = createVerifyCertificateByNumberService();

async function findLedgerCertificateByNumber(certificateNumber: string, service: ReturnType<typeof createCertificateService>): Promise<LedgerCertificate | null> {
  const cached = ledgerLookupCache.get(certificateNumber);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  // ponytail: O(n) ledger scan with short promise cache; add chaincode GetCertificateByNumber if certificate volume grows.
  const promise = service.getAllCertificates()
    .then(parseLedgerCertificates)
    .then((certificates) => certificates.find((certificate) => certificate.certificateNumber === certificateNumber) ?? null)
    .catch((error) => {
      ledgerLookupCache.delete(certificateNumber);
      throw error;
    });

  ledgerLookupCache.set(certificateNumber, { expiresAt: Date.now() + 2_000, promise });

  return promise;
}

function parseLedgerCertificates(value: unknown): LedgerCertificate[] {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;

  return Array.isArray(parsed) ? parsed as LedgerCertificate[] : [];
}

function recoveredCertificateInput(certificate: LedgerCertificate): CreateCertificateInput {
  return {
    certificateId: requiredLedgerField(certificate.certificateId, 'certificateId'),
    certificateNumber: requiredLedgerField(certificate.certificateNumber, 'certificateNumber'),
    issuerId: requiredLedgerField(certificate.issuerId, 'issuerId'),
    organizationName: requiredLedgerField(certificate.issuerId, 'issuerId'),
    departmentName: 'Recovered from ledger',
    mspId: 'UNKNOWN_MSP',
    certificateType: requiredLedgerField(certificate.certificateType, 'certificateType'),
    degreeTitle: requiredLedgerField(certificate.title, 'title'),
    studentId: 'Recovered from ledger',
    studentName: 'Recovered from ledger',
    faculty: 'Recovered from ledger',
    studyProgram: 'Recovered from ledger',
    educationLevel: 'Recovered from ledger',
    graduationDate: '',
    ipfsCid: requiredLedgerField(certificate.ipfsCid, 'ipfsCid'),
    file_name: 'Recovered from ledger',
    mime_type: 'application/pdf',
    file_size: 0,
    ledger_tx_id: 'recovered-from-ledger',
    status: certificate.status === 'REVOKED' ? 'REVOKED' : 'VALID',
    issuedAt: requiredLedgerField(certificate.issuedAt, 'issuedAt').slice(0, 10),
  };
}

function requiredLedgerField(value: string | undefined, field: string): string {
  if (!value) {
    throw new AppError('Ledger certificate is missing ' + field, 502);
  }

  return value;
}

export async function getAllCertificatesService(issuerId?: string): Promise<Certificate[]> {
  return findAllCertificates(issuerId);
}

function validateCertificateBody(body: RawBody): CertificateTextInput {
  const missingFields = REQUIRED_UPLOAD_FIELDS.filter((field) => {
    const value = body[field];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  const issuedAt = clean(body.issuedAt);
  const graduationDate = clean(body.graduationDate);

  if (!isValidDateOnly(issuedAt)) {
    throw new Error('issuedAt must use YYYY-MM-DD format');
  }

  if (graduationDate && !isValidDateOnly(graduationDate)) {
    throw new Error('graduationDate must use YYYY-MM-DD format');
  }

  return {
    certificateId: clean(body.certificateId) || randomUUID(),
    certificateNumber: clean(body.certificateNumber),
    issuerId: clean(body.issuerId),
    organizationName: clean(body.organizationName),
    departmentName: clean(body.departmentName),
    mspId: clean(body.mspId),
    certificateType: clean(body.certificateType),
    degreeTitle: clean(body.degreeTitle),
    studentId: clean(body.studentId),
    studentName: clean(body.studentName),
    faculty: clean(body.faculty),
    studyProgram: clean(body.studyProgram),
    educationLevel: clean(body.educationLevel),
    graduationDate,
    issuedAt,
  };
}

function clean(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function readHashOrRaw(body: RawBody, hashField: string, rawField: string): string {
  const hash = clean(body[hashField]);

  if (hash) {
    return hash;
  }

  const raw = clean(body[rawField]);

  return raw ? sha256Hex(raw) : '';
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime());
}
