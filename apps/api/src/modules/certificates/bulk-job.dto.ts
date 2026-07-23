import { randomUUID } from 'node:crypto';
import { AppError } from '../../errors/AppError';

export type CreateBulkJobResponse = {
  readonly jobId: string;
  readonly status: string;
};

export type UploadPresignedUrlItem = {
  readonly pdfFileName: string;
  readonly stagedObjectKey: string;
  readonly uploadUrl: string;
};

export type GetPresignedUrlsResponse = {
  readonly urls: UploadPresignedUrlItem[];
};

export function parseJobIdParams(params: unknown): string {
  if (typeof params !== 'object' || params === null) {
    throw new AppError('Invalid params', 400);
  }
  const jobId = (params as Record<string, unknown>).jobId;
  if (typeof jobId !== 'string' || jobId.trim().length === 0) {
    throw new AppError('jobId is required', 400);
  }
  return jobId.trim();
}
