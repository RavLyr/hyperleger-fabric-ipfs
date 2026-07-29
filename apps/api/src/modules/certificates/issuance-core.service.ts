import { AppError } from '../../errors/AppError';
import type { FabricResult } from '../../infrastructure/fabric/fabric-result';
import { uploadToIPFS } from '../../infrastructure/ipfs/ipfs.service';
import { fabricGatewayForMsp } from '../fabric/fabric.service';
import { sha256Hex } from '../../utils/hash';
import type { Certificate, CertificateTextInput } from './certificate.dto';
import {
  findCertificateByCertificateNumber,
  insertCertificate,
  type AuthenticatedIssuer,
} from './certificate.repository';
import { createCertificateService, type FabricGateway } from './certificate.service';

export type CoreIssuanceInput = {
  readonly certificateTextInput: CertificateTextInput;
  readonly pdfBuffer: Buffer;
  readonly fileName: string;
  readonly mimeType?: string;
  readonly fileSize?: number;
  readonly authenticatedIssuer: AuthenticatedIssuer;
};

export type CoreIssuanceDependencies = {
  readonly uploadToIPFS: typeof uploadToIPFS;
  readonly findCertificateByCertificateNumber: typeof findCertificateByCertificateNumber;
  readonly insertCertificate: typeof insertCertificate;
  readonly createGateway: (mspId: string) => FabricGateway;
};

const defaultDependencies: CoreIssuanceDependencies = {
  uploadToIPFS,
  findCertificateByCertificateNumber,
  insertCertificate,
  createGateway: fabricGatewayForMsp,
};

function isTrueFabricResult(result: FabricResult): boolean {
  return result === true || result === 'true';
}

export function createProcessCertificateIssuance(
  dependencies: CoreIssuanceDependencies = defaultDependencies
) {
  return async function processCertificateIssuance(
    input: CoreIssuanceInput
  ): Promise<Certificate> {
    const textInput = input.certificateTextInput;
    const existingCertificate = await dependencies.findCertificateByCertificateNumber(
      textInput.certificateNumber
    );

    if (existingCertificate) {
      throw new AppError(`certificateNumber already exists: ${textInput.certificateNumber}`, 409);
    }

    const gateway = dependencies.createGateway(input.authenticatedIssuer.mspId);
    const service = createCertificateService(gateway);

    // 1. Upload file buffer to IPFS
    const ipfsCid = await dependencies.uploadToIPFS(input.pdfBuffer, input.fileName);

    // 2. Verify / Register issuer on Fabric
    const issuerExists = await service.issuerExists(textInput.issuerId);
    if (!isTrueFabricResult(issuerExists)) {
      await service.registerIssuer({
        issuerId: textInput.issuerId,
        organizationName: textInput.organizationName,
        departmentName: textInput.departmentName,
        mspId: textInput.mspId,
      });
    }

    // 3. Submit transaction to Fabric
    const fabricTransaction = await service.issueCertificateWithTxId({
      certificateId: textInput.certificateId,
      certificateNumber: textInput.certificateNumber,
      studentIdHash: sha256Hex(textInput.studentId),
      issuerId: textInput.issuerId,
      certificateType: textInput.certificateType,
      title: textInput.degreeTitle,
      ipfsCid,
      issuedAt: textInput.issuedAt,
      expiredAt: '',
    });

    // 4. Record to Postgres
    return dependencies.insertCertificate({
      ...textInput,
      ipfsCid,
      file_name: input.fileName,
      mime_type: input.mimeType || 'application/pdf',
      file_size: input.fileSize || input.pdfBuffer.length,
      ledger_tx_id: fabricTransaction.transactionId,
      status: 'VALID',
    });
  };
}

export const processCertificateIssuance = createProcessCertificateIssuance();
