import type { StorageProvider } from './types'
import { SeaweedFSProvider } from './seaweedfs'

let provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    const storageType = process.env.STORAGE_PROVIDER ?? 'seaweedfs'

    switch (storageType) {
      case 'seaweedfs':
        provider = new SeaweedFSProvider()
        break
      default:
        throw new Error(`Unknown storage provider: ${storageType}`)
    }
  }

  return provider
}

export type { StorageProvider }
