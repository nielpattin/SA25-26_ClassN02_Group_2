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
          <div key={attachment.id} className="group shadow-brutal-sm hover:shadow-brutal-md flex items-center gap-4 border border-black bg-white p-3 transition-all">
            <div className="bg-canvas flex size-10 shrink-0 items-center justify-center border border-black text-black">
              <Link size={18} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="truncate text-[14px] font-extrabold tracking-tight text-black uppercase decoration-2 underline-offset-4 hover:underline">
                {attachment.name}
              </a>
              <span className="text-[11px] font-extrabold tracking-widest text-black/40 uppercase">
                {new Date(attachment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8! p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#E74C3C]"
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
        <div className="shadow-brutal-xl mt-2 flex flex-col gap-4 border border-black bg-white p-5">
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
