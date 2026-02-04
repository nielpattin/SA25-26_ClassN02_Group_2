import { useState } from 'react'
import { X, Copy } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useCloneTemplate, Template } from '../../hooks/useTemplates'
import { useNavigate } from '@tanstack/react-router'

type CloneTemplateModalProps = {
  template: Template
  isOpen: boolean
  onClose: () => void
}

export function CloneTemplateModal({ template, isOpen, onClose }: CloneTemplateModalProps) {
  const { workspaces, currentWorkspace } = useWorkspace()
  const [workspaceId, setWorkspaceId] = useState(currentWorkspace?.id || workspaces[0]?.id || '')
  const [boardName, setBoardName] = useState(template.name)
  const cloneMutation = useCloneTemplate()
  const navigate = useNavigate()

  const handleClone = async () => {
    try {
      const board = await cloneMutation.mutateAsync({
        id: template.id,
        workspaceId,
        boardName,
      })
      onClose()
      navigate({ to: '/board/$boardId', params: { boardId: board.id } })
    } catch (error) {
      console.error('Clone failed:', error)
      alert('Failed to clone template. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md border-2 border-black bg-canvas p-8 shadow-brutal-xl transition-all">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center border border-black bg-white transition-all hover:bg-accent hover:shadow-brutal-sm active:translate-0"
        >
          <X size={18} />
        </button>

        <h2 className="mb-6 font-heading text-2xl font-black tracking-tight text-black uppercase">
          Clone Template
        </h2>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-heading text-[10px] font-black text-black uppercase">
              Board Name
            </label>
            <Input 
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Enter board name..."
            />
          </div>

          <div>
            <label className="mb-2 block font-heading text-[10px] font-black text-black uppercase">
              Target Workspace
            </label>
            <Select 
              value={workspaceId}
              options={workspaces.map(w => ({ id: w.id, name: w.name }))}
              onChange={setWorkspaceId}
            />
          </div>

          <div className="flex gap-4 pt-2">
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={onClose}
              disabled={cloneMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              fullWidth 
              onClick={handleClone}
              disabled={cloneMutation.isPending || !workspaceId || !boardName}
              className="group"
            >
              {cloneMutation.isPending ? (
                'Cloning...'
              ) : (
                <>
                  <Copy size={16} />
                  Clone to Board
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
