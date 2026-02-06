import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '../../api/client'
import { useWorkspace } from '../../context/WorkspaceContext'
import { WORKSPACE_LIMITS } from '../../constants/workspace'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const queryClient = useQueryClient()
  const { setCurrentWorkspace } = useWorkspace()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    if (newName.length > WORKSPACE_LIMITS.NAME_MAX) return
    setName(newName)
    const generatedSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSlug(generatedSlug)
  }

  const createWorkspace = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.v1.workspaces.post({
        name,
        slug,
        description
      })
      if (error) throw error
      return data
    },
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setCurrentWorkspace(newWorkspace)
      onClose()
      setName('')
      setDescription('')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black bg-black px-6 py-4 text-white">
          <h2 className="font-heading text-lg font-bold tracking-wider uppercase">Create New Workspace</h2>
          <button onClick={onClose} className="cursor-pointer transition-colors hover:text-accent">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-black uppercase">
                Workspace Name
              </label>
              <span className={`text-[10px] font-bold ${name.length >= WORKSPACE_LIMITS.NAME_MAX - 5 ? 'text-red-500' : 'text-gray-400'}`}>
                {name.length}/{WORKSPACE_LIMITS.NAME_MAX}
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={WORKSPACE_LIMITS.NAME_MAX}
              placeholder="e.g. Acme Corp"
              className="w-full border border-black bg-white px-4 py-3 font-heading text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5 focus:shadow-brutal-sm"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-black uppercase">
                Description
              </label>
              <span className={`text-[10px] font-bold ${description.length >= WORKSPACE_LIMITS.DESCRIPTION_MAX - 20 ? 'text-red-500' : 'text-gray-400'}`}>
                {description.length}/{WORKSPACE_LIMITS.DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={WORKSPACE_LIMITS.DESCRIPTION_MAX}
              rows={2}
              placeholder="What's this workspace about?"
              className="w-full resize-none border border-black bg-white px-4 py-3 font-heading text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5 focus:shadow-brutal-sm"
            />
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-xs font-bold tracking-wider text-black uppercase">
              Workspace Slug
            </label>
            <div className="flex items-center border border-black bg-gray-50 px-4 py-3 text-sm">
              <span className="text-gray-500">kyte.app/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="ml-1 w-full bg-transparent font-heading font-bold outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="cursor-pointer px-6 py-3 text-xs font-bold tracking-wider text-black uppercase transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => name && slug && createWorkspace.mutate()}
              disabled={createWorkspace.isPending || !name || !slug}
              className="cursor-pointer border border-black bg-black px-6 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-black hover:shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>

          {createWorkspace.error && (
            <div className="mt-4 border border-red-500 bg-red-50 p-3 text-xs font-bold text-red-600 uppercase">
              Error: {createWorkspace.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
