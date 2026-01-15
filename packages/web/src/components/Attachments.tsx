import { useState } from 'react'
import { Link, Trash2, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import './Attachments.css'

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
    <div className="attachment-section">
      <div className="attachments-list">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="attachment-item">
            <div className="attachment-icon">
              <Link size={18} />
            </div>
            <div className="attachment-info">
              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="attachment-name">
                {attachment.name}
              </a>
              <span className="attachment-meta">
                {new Date(attachment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="delete-attachment-btn"
              onClick={() => onDelete(attachment.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <Button variant="secondary" fullWidth onClick={() => setIsCreating(true)} className="add-attachment-btn">
          <Plus size={14} /> Add Link
        </Button>
      </div>

      {isCreating && (
        <div className="attachment-creator">
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
          <div className="attachment-creator-actions">
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
            >
              Add
            </Button>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
