import type { Request, Response } from 'express';
import { parseJobIdParams } from './bulk-job.dto';
import * as bulkJobService from './bulk-job.service';

export async function createBulkJobController(req: Request, res: Response): Promise<void> {
  const issuer = req.auth!.issuer;
  const job = await bulkJobService.createBulkJob(issuer);

  res.status(201).json({
    success: true,
    message: 'Bulk upload job created successfully',
    data: job,
  });
}

export async function uploadBulkManifestController(req: Request, res: Response): Promise<void> {
  const jobId = parseJobIdParams(req.params);
  const issuer = req.auth!.issuer;

  const result = await bulkJobService.uploadBulkManifest(jobId, req.file, issuer);

  res.json({
    success: true,
    message: 'Manifest uploaded and validated successfully',
    data: result,
  });
}

export async function requestUploadUrlsController(req: Request, res: Response): Promise<void> {
  const jobId = parseJobIdParams(req.params);
  const issuer = req.auth!.issuer;
  const pdfFileNames = Array.isArray(req.body.pdfFileNames)
    ? (req.body.pdfFileNames as string[])
    : [];

  const result = await bulkJobService.requestUploadUrls(jobId, pdfFileNames, issuer);

  res.json({
    success: true,
    data: result,
  });
}

export async function completeBulkUploadController(req: Request, res: Response): Promise<void> {
  const jobId = parseJobIdParams(req.params);
  const issuer = req.auth!.issuer;

  const job = await bulkJobService.completeBulkUpload(jobId, issuer);

  res.json({
    success: true,
    message: 'Bulk file upload completed. Job ready to start.',
    data: job,
  });
}

export async function startBulkJobController(req: Request, res: Response): Promise<void> {
  const jobId = parseJobIdParams(req.params);
  const issuer = req.auth!.issuer;

  const result = await bulkJobService.startBulkJobProcessing(jobId, issuer);

  res.json({
    success: true,
    message: 'Bulk job processing started',
    data: result,
  });
}

export async function getBulkJobStatusController(req: Request, res: Response): Promise<void> {
  const jobId = parseJobIdParams(req.params);
  const issuer = req.auth!.issuer;

  const job = await bulkJobService.getBulkJobStatus(jobId, issuer);

  res.json({
    success: true,
    data: job,
  });
}

export async function getBulkJobItemsController(req: Request, res: Response): Promise<void> {
  const jobId = parseJobIdParams(req.params);
  const issuer = req.auth!.issuer;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;

  const result = await bulkJobService.getBulkJobItems(jobId, page, limit, issuer);

  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
}
