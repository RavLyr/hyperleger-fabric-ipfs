import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { Readable } from 'node:stream';

export class StagingStorageService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Necessary for MinIO compatibility
    });
  }

  async generatePresignedUploadUrl(objectKey: string, contentType: string = 'application/pdf', expiresInSeconds: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async uploadObject(objectKey: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    });
    await this.s3Client.send(command);
    return objectKey;
  }

  async getObjectStream(objectKey: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: objectKey,
    });
    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Failed to retrieve object stream for key: ${objectKey}`);
    }
    return response.Body as Readable;
  }

  async getObjectBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.getObjectStream(objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

export const stagingStorageService = new StagingStorageService();
