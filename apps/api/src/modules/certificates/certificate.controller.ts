import type { Request, Response } from 'express';

import {
  parseCertificateIdParams,
  parseIssueCertificateBody,
  parseIssuerIdParams,
  parseRegisterIssuerBody,
  parseRevokeCertificateBody,
  parseVerifyCertificateBody,
} from './certificate.dto';
import {
  certificateService,
  getAllCertificatesService,
  revokeCertificateAndSync,
  uploadCertificate,
  verifyCertificateByNumber,
} from './certificate.service';
import { AppError } from '../../errors/AppError';

function removeDocumentHash<T extends object>(certificate: T): Omit<T, 'documentHash'> {
  const { documentHash: _documentHash, ...cleanCertificate } = certificate as T & { readonly documentHash?: unknown };

  return cleanCertificate as Omit<T, 'documentHash'>;
}

export async function initLedger(_req: Request, res: Response): Promise<void> {
  const result = await certificateService.initLedger();

  res.json({ success: true, message: 'Ledger initialized successfully', data: result });
}

export async function registerIssuer(req: Request, res: Response): Promise<void> {
  const input = parseRegisterIssuerBody(req.body as unknown);
  const result = await certificateService.registerIssuer(input);

  res.status(201).json({ success: true, message: 'Issuer registered successfully', data: result });
}

export async function getIssuer(req: Request, res: Response): Promise<void> {
  const issuerId = parseIssuerIdParams(req.params);
  const result = await certificateService.getIssuer(issuerId);

  res.json({ success: true, data: result });
}

export async function issuerExists(req: Request, res: Response): Promise<void> {
  const issuerId = parseIssuerIdParams(req.params);
  const result = await certificateService.issuerExists(issuerId);

  res.json({ success: true, data: result });
}

export async function issueCertificate(req: Request, res: Response): Promise<void> {
  const input = parseIssueCertificateBody(req.body as unknown);
  const result = await certificateService.issueCertificate(input);

  res.status(201).json({
    success: true,
    message: 'Certificate issued successfully',
    data: {
      certificateId: input.certificateId,
      fabricResult: result
    }
  });
}

export async function getCertificate(req: Request, res: Response): Promise<void> {
  const certificateId = parseCertificateIdParams(req.params);
  const result = await certificateService.getCertificate(certificateId);

  res.json({ success: true, data: result });
}

export async function certificateExists(req: Request, res: Response): Promise<void> {
  const certificateId = parseCertificateIdParams(req.params);
  const result = await certificateService.certificateExists(certificateId);

  res.json({ success: true, data: result });
}

export async function verifyCertificate(req: Request, res: Response): Promise<void> {
  const input = parseVerifyCertificateBody(req.params, req.body as unknown);
  const result = await certificateService.verifyCertificate(input);

  res.json({ success: true, data: result });
}

export async function revokeCertificate(req: Request, res: Response): Promise<void> {
  const input = parseRevokeCertificateBody(req.params, req.body as unknown);
  const issuer = req.auth!.issuer;
  const certificate = await certificateService.getCertificate(input.certificateId) as { readonly issuerId?: string };

  if (certificate.issuerId !== issuer.issuerId) {
    throw new AppError('You can only revoke certificates for your own issuer', 403);
  }

  const result = await revokeCertificateAndSync(input, issuer.mspId);

  res.json({
    success: true,
    message: 'Certificate revoked successfully',
    data: {
      ...result,
      certificate: removeDocumentHash(result.certificate)
    }
  });
}

export async function getRevocationInfo(req: Request, res: Response): Promise<void> {
  const certificateId = parseCertificateIdParams(req.params);
  const result = await certificateService.getRevocationInfo(certificateId);

  res.json({ success: true, data: result });
}

export async function getCertificateHistory(req: Request, res: Response): Promise<void> {
  const certificateId = parseCertificateIdParams(req.params);
  const result = await certificateService.getCertificateHistory(certificateId);

  res.json({ success: true, data: result });
}

export async function getAllCertificates(req: Request, res: Response): Promise<void> {
  const issuerId = typeof req.query.issuerId === 'string' ? req.query.issuerId.trim() : undefined;
  const result = issuerId
    ? await certificateService.getCertificatesByIssuer(issuerId)
    : await certificateService.getAllCertificates();

  res.json({ success: true, data: result });
}

export async function getCertificatesByIssuer(req: Request, res: Response): Promise<void> {
  const issuerId = parseIssuerIdParams(req.params);
  const result = await certificateService.getCertificatesByIssuer(issuerId);

  res.json({ success: true, data: result });
}



export async function uploadCertificateController(
  req: Request,
  res: Response
): Promise<void> {
  const issuer = req.auth!.issuer;

  if (req.body.issuerId !== issuer.issuerId || req.body.mspId !== issuer.mspId) {
    throw new AppError('You can only upload certificates for your own issuer', 403);
  }

  const certificate = await uploadCertificate(req.body, req.file, issuer);
  const cleanData = removeDocumentHash(certificate);

  res.status(201).json({
    success: true,
    message: "Certificate uploaded successfully",
    data: cleanData,
  });
}

type VerifyCertificateParams = {
  nomorIjazah: string;
};

export async function verifyCertificateController(
  req: Request,
  res: Response
): Promise<void> {
  const nomorIjazah = typeof req.params.nomorIjazah === 'string' ? req.params.nomorIjazah : '';
  const result = await verifyCertificateByNumber(nomorIjazah);

  res.json(result);
}

export async function getAllCertificatesController(
  req: Request,
  res: Response
): Promise<void> {
  const issuerId = typeof req.query.issuerId === 'string' ? req.query.issuerId.trim() : undefined;
  const certificates = await getAllCertificatesService(issuerId);

  res.json({
    success: true,
    data: certificates.map(removeDocumentHash),
  });
}