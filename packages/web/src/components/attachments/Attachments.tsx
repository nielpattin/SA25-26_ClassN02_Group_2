import { useState, useRef, useCallback } from 'react'
import {
  Link,
  Trash2,
  Plus,
  Upload,
  FileText,
  Image as ImageIcon,
  FileArchive,
  File,
  Download,
  X,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Progress } from '../ui/Progress'
import type { Attachment, UploadProgress, UploadError } from '../../hooks/useAttachments'

function getFileIconName(mimeType: string | null): 'image' | 'archive' | 'document' | 'file' {
  if (!mimeType) return 'file'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('gzip')) return 'archive'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document'
  return 'file'
}

function FileIcon({ type }: { type: 'image' | 'archive' | 'document' | 'file' | 'link' }) {
  switch (type) {
    case 'image':
      return <ImageIcon size={18} />
    case 'archive':
      return <FileArchive size={18} />
    case 'document':
      return <FileText size={18} />
    case 'link':
      return <Link size={18} />
    default:
      return <File size={18} />
  }
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AttachmentItemProps {
  attachment: Attachment
  onDelete: (id: string) => void
  onDownload?: (id: string) => void
}

function AttachmentItem({ attachment, onDelete, onDownload }: AttachmentItemProps) {
  const isFile = attachment.type === 'file'
  const iconType = isFile ? getFileIconName(attachment.mimeType) : 'link'

  const handleClick = () => {
    if (isFile && onDownload) {
      onDownload(attachment.id)
    } else if (!isFile) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="group flex items-center gap-4 border border-black bg-white p-3 shadow-brutal-sm transition-all hover:shadow-brutal-md">
      <div className="flex size-10 shrink-0 items-center justify-center border border-black bg-canvas text-black">
        <FileIcon type={iconType} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button
          onClick={handleClick}
          className="cursor-pointer truncate text-left text-[14px] font-extrabold tracking-tight text-black uppercase decoration-2 underline-offset-4 hover:underline"
        >
          {attachment.name}
        </button>
        <span className="text-[11px] font-extrabold tracking-widest text-black/40 uppercase">
          {isFile && attachment.size ? `${formatFileSize(attachment.size)} · ` : ''}
          {new Date(attachment.createdAt).toLocaleDateString()}
        </span>
      </div>
      {isFile && onDownload && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8! p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDownload(attachment.id)}
        >
          <Download size={16} />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8! p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#E74C3C]"
        onClick={() => onDelete(attachment.id)}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
  uploadProgress: UploadProgress | null
  uploadError: UploadError | null
  onClearError: () => void
}

function FileUpload({ onUpload, isUploading, uploadProgress, uploadError, onClearError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const handleFile = useCallback(
    async (file: File) => {
      onClearError()
      await onUpload(file)
    },
    [onUpload, onClearError]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [handleFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0])
        e.target.value = ''
      }
    },
    [handleFile]
  )

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-4 transition-all ${
          isDragging
            ? 'border-black bg-accent'
            : 'border-black/30 bg-surface-overlay hover:border-black hover:bg-active'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        <Upload size={24} className="text-black/40" />
        <span className="text-center text-[12px] font-bold text-black/60">
          {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
        </span>
        <span className="text-[10px] text-black/40">Max 10MB</span>
      </div>

      {isUploading && uploadProgress && (
        <div className="flex flex-col gap-1">
          <Progress value={uploadProgress.percent} />
          <span className="text-[11px] font-bold text-black/60">
            Uploading... {uploadProgress.percent}%
          </span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center justify-between border border-[#E74C3C] bg-[#E74C3C]/10 p-2">
          <span className="text-[12px] font-bold text-[#E74C3C]">{uploadError.message}</span>
          <button onClick={onClearError} className="cursor-pointer text-[#E74C3C] hover:text-error-border">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

interface AttachmentsProps {
  attachments: Attachment[]
  onAddLink: (name: string, url: string) => void
  onDelete: (id: string) => void
  onUpload: (file: File) => Promise<void>
  onDownload?: (id: string) => void
  isUploading?: boolean
  uploadProgress?: UploadProgress | null
  uploadError?: UploadError | null
  onClearError?: () => void
}

export function AttachmentSection({
  attachments,
  onAddLink,
  onDelete,
  onUpload,
  onDownload,
  isUploading = false,
  uploadProgress = null,
  uploadError = null,
  onClearError = () => {},
}: AttachmentsProps) {
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        onUpload={onUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        onClearError={onClearError}
      />

      <div className="flex flex-col gap-2.5">
        {attachments.map((attachment) => (
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            onDelete={onDelete}
            onDownload={onDownload}
          />
        ))}

        <Button
          variant="secondary"
          fullWidth
          onClick={() => setIsCreatingLink(true)}
          className="justify-start! px-3!"
        >
          <Plus size={14} /> Add Link
        </Button>
      </div>

      {isCreatingLink && (
        <div className="mt-2 flex flex-col gap-4 border border-black bg-white p-5 shadow-brutal-xl">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Link name..."
            autoFocus
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (e.g. https://...)"
          />
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (name && url) {
                  onAddLink(name, url)
                  setName('')
                  setUrl('')
                  setIsCreatingLink(false)
                }
              }}
              disabled={!name || !url}
              className="flex-1"
            >
              Add
            </Button>
            <Button variant="secondary" onClick={() => setIsCreatingLink(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
