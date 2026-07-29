import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../errors/AppError';
import { parseAndValidateManifestExcel } from './bulk-excel.service';
import { stagingStorageService } from '../../infrastructure/storage/staging-storage.service';
import { getBulkIssuanceQueue } from './bulk-issuance.worker';
import type { AuthenticatedIssuer } from './certificate.repository';

export async function createBulkJob(issuer: AuthenticatedIssuer) {
  const jobId = `JOB-${randomUUID()}`;

  const job = await prisma.bulkUploadJob.create({
    data: {
      jobId,
      issuerId: issuer.issuerId,
      status: 'CREATED',
    },
  });

  return job;
}

export async function uploadBulkManifest(
  jobId: string,
  file: Express.Multer.File | undefined,
  issuer: AuthenticatedIssuer
) {
  if (!file) {
    throw new AppError('Excel file is required', 400);
  }

  const job = await prisma.bulkUploadJob.findUnique({
    where: { jobId },
  });

  if (!job) {
    throw new AppError('Bulk job not found', 404);
  }

  if (job.issuerId !== issuer.issuerId) {
    throw new AppError('Unauthorized job access', 403);
  }

  if (job.status !== 'CREATED' && job.status !== 'UPLOADING') {
    throw new AppError(`Cannot upload manifest for job in status ${job.status}`, 400);
  }

  // 1. Upload Excel to Staging Storage (MinIO/S3)
  const manifestObjectKey = `manifests/${jobId}/${file.originalname}`;
  await stagingStorageService.uploadObject(
    manifestObjectKey,
    file.buffer,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  // 2. Parse and Validate Excel
  const validationResult = await parseAndValidateManifestExcel(file.buffer);

  // 3. Clear existing items if re-uploading
  await prisma.bulkUploadItem.deleteMany({
    where: { jobId },
  });

  // 4. Batch insert valid rows into database
  const itemsData = validationResult.validRows.map((row) => ({
    itemId: `ITEM-${randomUUID()}`,
    jobId,
    certificateNumber: row.certificateNumber,
    pdfFileName: row.pdfFileName,
    metadata: {
      certificateType: row.certificateType,
      degreeTitle: row.degreeTitle,
      studentId: row.studentId,
      studentName: row.studentName,
      faculty: row.faculty,
      studyProgram: row.studyProgram,
      educationLevel: row.educationLevel,
      issuedAt: row.issuedAt,
      graduationDate: row.graduationDate,
    },
    status: 'VALIDATED' as const,
  }));

  await prisma.bulkUploadItem.createMany({
    data: itemsData,
  });

  // 5. Update Job Status
  const updatedJob = await prisma.bulkUploadJob.update({
    where: { jobId },
    data: {
      status: 'UPLOADING',
      totalItems: validationResult.totalRows,
      manifestPath: manifestObjectKey,
      errorMessage:
        validationResult.invalidRows.length > 0
          ? `${validationResult.invalidRows.length} rows failed validation`
          : null,
    },
  });

  return {
    job: updatedJob,
    validation: {
      totalRows: validationResult.totalRows,
      validRowsCount: validationResult.validRows.length,
      invalidRows: validationResult.invalidRows,
    },
  };
}

export async function requestUploadUrls(
  jobId: string,
  pdfFileNames: string[],
  issuer: AuthenticatedIssuer
) {
  const job = await prisma.bulkUploadJob.findUnique({
    where: { jobId },
  });

  if (!job) {
    throw new AppError('Bulk job not found', 404);
  }

  if (job.issuerId !== issuer.issuerId) {
    throw new AppError('Unauthorized job access', 403);
  }

  // Find items matching requested file names
  const items = await prisma.bulkUploadItem.findMany({
    where: {
      jobId,
      pdfFileName: { in: pdfFileNames },
    },
  });

  const urls = await Promise.all(
    items.map(async (item) => {
      const stagedObjectKey = `pdfs/${jobId}/${item.pdfFileName}`;
      const uploadUrl = await stagingStorageService.generatePresignedUploadUrl(
        stagedObjectKey,
        'application/pdf',
        3600
      );

      // Save staged object key to item
      await prisma.bulkUploadItem.update({
        where: { itemId: item.itemId },
        data: { stagedObjectKey },
      });

      return {
        itemId: item.itemId,
        pdfFileName: item.pdfFileName,
        stagedObjectKey,
        uploadUrl,
      };
    })
  );

  return { urls };
}

export async function completeBulkUpload(jobId: string, issuer: AuthenticatedIssuer) {
  const job = await prisma.bulkUploadJob.findUnique({
    where: { jobId },
  });

  if (!job) {
    throw new AppError('Bulk job not found', 404);
  }

  if (job.issuerId !== issuer.issuerId) {
    throw new AppError('Unauthorized job access', 403);
  }

  const updatedJob = await prisma.bulkUploadJob.update({
    where: { jobId },
    data: { status: 'READY' },
  });

  return updatedJob;
}

export async function startBulkJobProcessing(jobId: string, issuer: AuthenticatedIssuer) {
  const job = await prisma.bulkUploadJob.findUnique({
    where: { jobId },
    include: { items: true },
  });

  if (!job) {
    throw new AppError('Bulk job not found', 404);
  }

  if (job.issuerId !== issuer.issuerId) {
    throw new AppError('Unauthorized job access', 403);
  }

  if (job.status !== 'READY' && job.status !== 'UPLOADING') {
    throw new AppError(`Cannot start job processing in status ${job.status}`, 400);
  }

  const itemsToProcess = job.items.filter(
    (item) => item.status === 'VALIDATED' || item.status === 'STAGED' || item.status === 'PENDING'
  );

  if (itemsToProcess.length === 0) {
    throw new AppError('No valid items to process', 400);
  }

  // 1. Update Job Status to PROCESSING
  await prisma.bulkUploadJob.update({
    where: { jobId },
    data: { status: 'PROCESSING' },
  });

  // 2. Add jobs to BullMQ queue
  const queue = getBulkIssuanceQueue();
  const queueJobs = itemsToProcess.map((item) => ({
    name: `issue-${item.certificateNumber}`,
    data: { itemId: item.itemId },
  }));

  await queue.addBulk(queueJobs);

  return {
    jobId,
    status: 'PROCESSING',
    enqueuedItemsCount: queueJobs.length,
  };
}

export async function getBulkJobStatus(jobId: string, issuer: AuthenticatedIssuer) {
  const job = await prisma.bulkUploadJob.findUnique({
    where: { jobId },
  });

  if (!job) {
    throw new AppError('Bulk job not found', 404);
  }

  if (job.issuerId !== issuer.issuerId) {
    throw new AppError('Unauthorized job access', 403);
  }

  return job;
}

export async function getBulkJobItems(
  jobId: string,
  page: number = 1,
  limit: number = 50,
  issuer: AuthenticatedIssuer
) {
  const job = await prisma.bulkUploadJob.findUnique({
    where: { jobId },
  });

  if (!job) {
    throw new AppError('Bulk job not found', 404);
  }

  if (job.issuerId !== issuer.issuerId) {
    throw new AppError('Unauthorized job access', 403);
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.bulkUploadItem.findMany({
      where: { jobId },
      skip,
      take: limit,
      orderBy: { id: 'asc' },
    }),
    prisma.bulkUploadItem.count({
      where: { jobId },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
