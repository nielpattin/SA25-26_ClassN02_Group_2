import { useState, useRef, useCallback } from 'react'
import { Upload, X, Trash2, Loader2 } from 'lucide-react'
import { Avatar } from './Avatar'
import { Progress } from './Progress'
import { useAvatarUpload, useDeleteAvatar, type UploadProgress, type UploadError } from '../../hooks/useAvatarUpload'

interface AvatarUploadProps {
  userId: string
  currentImage: string | null
  userName: string
}

export function AvatarUpload({ userId, currentImage, userName }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadError, setUploadError] = useState<UploadError | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const uploadMutation = useAvatarUpload(userId)
  const deleteMutation = useDeleteAvatar(userId)

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null)
      
      // Validate type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setUploadError({ status: 415, message: 'Only JPG, PNG, GIF, and WEBP allowed' })
        return
      }

      // Validate size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setUploadError({ status: 413, message: 'File too large (max 2MB)' })
        return
      }

      try {
        await uploadMutation.mutateAsync({
          file,
          onProgress: (progress) => setUploadProgress(progress),
        })
        setUploadProgress(null)
      } catch (err: unknown) {
        setUploadError(err as UploadError)
        setUploadProgress(null)
      }
    },
    [uploadMutation]
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to remove your avatar?')) {
      try {
        await deleteMutation.mutateAsync()
      } catch (err) {
        console.error('Failed to delete avatar', err)
      }
    }
  }

  const isUploading = uploadMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-6">
        <div
          className={`group relative flex cursor-pointer items-center justify-center transition-all ${
            isDragging ? 'scale-105' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <Avatar
            src={currentImage}
            fallback={userName}
            size="lg"
            className={`shadow-brutal-md group-hover:shadow-brutal-lg size-24! text-2xl! transition-all ${
              isDragging ? 'bg-accent border-2 border-black' : ''
            } ${isUploading ? 'opacity-50' : ''}`}
          />
          
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            {isUploading ? (
              <Loader2 size={24} className="animate-spin text-white" />
            ) : (
              <Upload size={24} className="text-white" />
            )}
          </div>

          {currentImage && !isUploading && (
            <button
              onClick={handleDelete}
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center border border-black bg-[#E74C3C] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              title="Remove avatar"
            >
              <Trash2 size={12} />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold tracking-tight text-black uppercase">Profile Picture</h3>
          <p className="max-w-[200px] text-[10px] leading-tight font-medium text-gray-500 uppercase">
            {isDragging 
              ? 'Drop to upload' 
              : 'JPG, PNG, GIF or WEBP. Max size 2MB.'}
          </p>
          {uploadProgress && (
            <div className="mt-2 flex flex-col gap-1.5">
              <Progress value={uploadProgress.percent} className="h-[6px]! w-32" />
              <span className="text-[9px] font-bold tracking-widest text-black uppercase">
                {uploadProgress.percent}%
              </span>
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="shadow-brutal-sm flex items-center justify-between border border-[#E74C3C] bg-[#E74C3C]/10 p-2.5">
          <span className="text-[11px] font-bold tracking-wide text-[#E74C3C] uppercase">
            {uploadError.message}
          </span>
          <button 
            onClick={() => setUploadError(null)} 
            className="hover:text-error-border cursor-pointer text-[#E74C3C]"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
