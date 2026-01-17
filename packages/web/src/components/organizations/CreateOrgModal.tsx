import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '../../api/client'
import { useOrganization } from '../../context/OrganizationContext'

interface CreateOrgModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrgModal({ isOpen, onClose }: CreateOrgModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const queryClient = useQueryClient()
  const { setCurrentOrganization } = useOrganization()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    const generatedSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSlug(generatedSlug)
  }

  const createOrg = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.v1.organizations.post({
        name,
        slug
      })
      if (error) throw error
      return data
    },
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setCurrentOrganization(newOrg)
      onClose()
      setName('')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black bg-black px-6 py-4 text-white">
          <h2 className="font-heading text-lg font-bold tracking-wider uppercase">Create New Team</h2>
          <button onClick={onClose} className="hover:text-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6">
            <label className="mb-2 block text-xs font-bold tracking-wider text-black uppercase">
              Team Name
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Acme Corp"
              className="font-heading focus:shadow-brutal-sm w-full border border-black bg-white px-4 py-3 text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5"
              autoFocus
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
                className="font-heading ml-1 w-full bg-transparent font-bold outline-none"
              />
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-500 uppercase">
              This will be the unique URL for your team.
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-xs font-bold tracking-wider text-black uppercase transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => name && slug && createOrg.mutate()}
              disabled={createOrg.isPending || !name || !slug}
              className="hover:bg-accent hover:shadow-brutal-sm border border-black bg-black px-6 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:-translate-y-0.5 hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {createOrg.isPending ? 'Creating...' : 'Create Team'}
            </button>
          </div>
          
          {createOrg.error && (
             <div className="mt-4 border border-red-500 bg-red-50 p-3 text-xs font-bold text-red-600 uppercase">
                Error: {createOrg.error.message}
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
