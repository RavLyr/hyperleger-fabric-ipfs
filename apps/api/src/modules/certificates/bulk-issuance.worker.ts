import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../infrastructure/queue/bullmq.config';
import { prisma } from '../../config/prisma';
import { stagingStorageService } from '../../infrastructure/storage/staging-storage.service';
import { processCertificateIssuance } from '../certificates/issuance-core.service';
import type { CertificateTextInput } from '../certificates/certificate.dto';
import type { AuthenticatedIssuer } from '../certificates/certificate.repository';

export const BULK_ISSUANCE_QUEUE_NAME = 'bulk-certificate-issuance';

export type BulkIssuanceJobData = {
  readonly itemId: string;
};

let bulkQueue: Queue<BulkIssuanceJobData> | null = null;

export function getBulkIssuanceQueue(): Queue<BulkIssuanceJobData> {
  if (!bulkQueue) {
    bulkQueue = new Queue<BulkIssuanceJobData>(BULK_ISSUANCE_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return bulkQueue;
}

export function startBulkIssuanceWorker(): Worker<BulkIssuanceJobData> {
  const worker = new Worker<BulkIssuanceJobData>(
    BULK_ISSUANCE_QUEUE_NAME,
    async (job: Job<BulkIssuanceJobData>) => {
      const { itemId } = job.data;

      const item = await prisma.bulkUploadItem.findUnique({
        where: { itemId },
        include: { job: true },
      });

      if (!item) {
        throw new Error(`BulkUploadItem not found: ${itemId}`);
      }

      if (item.status === 'COMPLETED') {
        return;
      }

      // Check if job is cancelled
      if (item.job.status === 'CANCELLED') {
        await prisma.bulkUploadItem.update({
          where: { itemId },
          data: { status: 'FAILED', errorMessage: 'Job was cancelled' },
        });
        return;
      }

      // Fetch issuer data
      const issuer = await prisma.issuer.findUnique({
        where: { issuerId: item.job.issuerId },
      });

      if (!issuer) {
        throw new Error(`Issuer not found: ${item.job.issuerId}`);
      }

      const authenticatedIssuer: AuthenticatedIssuer = {
        issuerId: issuer.issuerId,
        organizationName: issuer.organizationName,
        departmentName: issuer.departmentName,
        mspId: issuer.mspId,
        username: issuer.username || '',
        email: issuer.email || '',
        passwordHash: issuer.passwordHash || '',
        isActive: issuer.isActive,
        status: issuer.status,
      };

      const metadata = item.metadata as Record<string, unknown>;

        const certificateId = typeof metadata.certificateId === 'string' && metadata.certificateId.trim()
          ? metadata.certificateId.trim()
          : item.itemId;

        const textInput: CertificateTextInput = {
          certificateId,
          certificateNumber: item.certificateNumber,
          issuerId: issuer.issuerId,
          organizationName: issuer.organizationName,
          departmentName: issuer.departmentName,
          mspId: issuer.mspId,
          certificateType: (metadata.certificateType as string) || 'IJAZAH',
          degreeTitle: (metadata.degreeTitle as string) || '',
          studentId: (metadata.studentId as string) || '',
          studentName: (metadata.studentName as string) || '',
          faculty: (metadata.faculty as string) || '',
          studyProgram: (metadata.studyProgram as string) || '',
          educationLevel: (metadata.educationLevel as string) || '',
          issuedAt: (metadata.issuedAt as string) || new Date().toISOString().slice(0, 10),
          graduationDate: typeof metadata.graduationDate === 'string' ? metadata.graduationDate : '',
        };

      try {
        if (!item.stagedObjectKey) {
          throw new Error(`Item ${itemId} has no staged object key`);
        }

        // 1. Retrieve file from MinIO/S3 Staging
        const pdfBuffer = await stagingStorageService.getObjectBuffer(item.stagedObjectKey);

        // Update item status to STAGED if pending
        if (item.status === 'PENDING' || item.status === 'VALIDATED') {
          await prisma.bulkUploadItem.update({
            where: { itemId },
            data: { status: 'STAGED' },
          });
        }

        // 2. Process Core Issuance (IPFS -> Fabric -> DB)
        await processCertificateIssuance({
          certificateTextInput: textInput,
          pdfBuffer,
          fileName: item.pdfFileName,
          authenticatedIssuer,
        });

        // 3. Mark Item as Completed
        await prisma.bulkUploadItem.update({
          where: { itemId },
          data: {
            status: 'COMPLETED',
            errorMessage: null,
          },
        });

        // 4. Update Job Progress
        await prisma.bulkUploadJob.update({
          where: { jobId: item.jobId },
          data: {
            processedItems: { increment: 1 },
          },
        });

        // Check if job is finished
        const updatedJob = await prisma.bulkUploadJob.findUnique({
          where: { jobId: item.jobId },
        });

        if (updatedJob && updatedJob.processedItems + updatedJob.failedItems >= updatedJob.totalItems) {
          const finalStatus = updatedJob.failedItems > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
          await prisma.bulkUploadJob.update({
            where: { jobId: item.jobId },
            data: { status: finalStatus },
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await prisma.bulkUploadItem.update({
          where: { itemId },
          data: {
            attempts: { increment: 1 },
            errorMessage: errorMsg,
            status: 'FAILED',
          },
        });

        await prisma.bulkUploadJob.update({
          where: { jobId: item.jobId },
          data: {
            failedItems: { increment: 1 },
          },
        });

        throw err; // Allow BullMQ to retry if attempts remain
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5, // Process 5 certificates concurrently
    }
  );

  return worker;
}
