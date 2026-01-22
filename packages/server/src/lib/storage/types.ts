export interface StorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>
  getSignedUrl(key: string, expiresIn: number): Promise<string>
  delete(key: string): Promise<void>
}
