import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider } from './types'

export class SeaweedFSProvider implements StorageProvider {
  private client: S3Client
  private bucket: string

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.SEAWEEDFS_ENDPOINT ?? 'http://localhost:8333',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.SEAWEEDFS_ACCESS_KEY ?? '',
        secretAccessKey: process.env.SEAWEEDFS_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    })
    this.bucket = process.env.SEAWEEDFS_BUCKET ?? 'kyte'
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    await this.client.send(command)
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })
    await this.client.send(command)
  }
}
