import { useState } from 'react'
import { Link, Trash2, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface Attachment {
  id: string
  name: string
  url: string
  type: string
  createdAt: string
}

interface AttachmentsProps {
  attachments: Attachment[]
  onAdd: (name: string, url: string) => void
  onDelete: (id: string) => void
}

export function AttachmentSection({ attachments, onAdd, onDelete }: AttachmentsProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-4 p-3 bg-white border-2 border-black group shadow-brutal-sm hover:shadow-brutal-md transition-all">
            <div className="w-10 h-10 bg-canvas border-2 border-black flex items-center justify-center text-black shrink-0">
              <Link size={18} />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-extrabold text-black uppercase tracking-tight truncate hover:underline underline-offset-4 decoration-2">
                {attachment.name}
              </a>
              <span className="text-[11px] font-extrabold text-black/40 uppercase tracking-widest">
                {new Date(attachment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8! p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#E74C3C]"
              onClick={() => onDelete(attachment.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <Button variant="secondary" fullWidth onClick={() => setIsCreating(true)} className="justify-start! px-3!">
          <Plus size={14} /> Add Link
        </Button>
      </div>

      {isCreating && (
        <div className="flex flex-col gap-4 p-5 border-2 border-black bg-white shadow-brutal-xl mt-2">
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
                  onAdd(name, url)
                  setName('')
                  setUrl('')
                  setIsCreating(false)
                }
              }}
              disabled={!name || !url}
              className="flex-1"
            >
              Add
            </Button>
            <Button variant="secondary" onClick={() => setIsCreating(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
