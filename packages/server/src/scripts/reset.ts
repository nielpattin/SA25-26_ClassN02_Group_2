import { db } from '../db'
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(import.meta.dir, '../../drizzle')

const s3 = new S3Client({
  endpoint: process.env.SEAWEEDFS_ENDPOINT ?? 'http://localhost:8333',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.SEAWEEDFS_ACCESS_KEY ?? '',
    secretAccessKey: process.env.SEAWEEDFS_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
})
const bucket = process.env.SEAWEEDFS_BUCKET ?? 'kyte'

async function clearS3Bucket() {
  console.log('Clearing S3 bucket...')
  let deleted = 0

  while (true) {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000 }))
    if (!list.Contents || list.Contents.length === 0) break

    const objects = list.Contents.map(obj => ({ Key: obj.Key }))
    await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: objects },
    }))
    deleted += objects.length
  }

  console.log(`Deleted ${deleted} objects from S3`)
}

async function runMigrations() {
  console.log('Running migrations...')
  const files = await readdir(MIGRATIONS_DIR)
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()

  for (const file of sqlFiles) {
    const path = join(MIGRATIONS_DIR, file)
    const content = await Bun.file(path).text()
    console.log(`  ${file}`)
    await db.execute(content)
  }
}

async function reset() {
  await clearS3Bucket()
  await runMigrations()

  console.log('Running seed...')
  const seedModule = await import('./seed')
}

reset().catch(err => {
  console.error('Reset failed:', err)
  process.exit(1)
})
