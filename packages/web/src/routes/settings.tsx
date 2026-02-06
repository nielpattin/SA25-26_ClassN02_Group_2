import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Save, Trash2, AlertTriangle, Settings as SettingsIcon, CheckCircle, ShieldAlert } from 'lucide-react'
import { api } from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'
import { useSession } from '../api/auth'
import type { Workspace } from '../types/workspace'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { WORKSPACE_LIMITS, ADMIN_ROLES } from '../constants/workspace'

export const Route = createFileRoute('/settings')({
  component: SettingsRouteComponent,
})

function SettingsRouteComponent() {
  return (
    <DashboardLayout>
      <SettingsPage />
    </DashboardLayout>
  )
}

function SettingsPage() {
  const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return []
      const { data, error } = await api.v1.workspaces({ id: currentWorkspace.id }).members.get()
      if (error) throw error
      return data
    },
    enabled: !!currentWorkspace?.id,
  })

  const myMembership = Array.isArray(members) ? members.find(m => m.userId === session?.user?.id) : null
  const canManage = !!myMembership && ADMIN_ROLES.includes(myMembership.role)

  useEffect(() => {
    if (currentWorkspace) {
      setTimeout(() => {
        setName(currentWorkspace.name)
        setDescription(currentWorkspace.description || '')
      }, 0)
    }
  }, [currentWorkspace])

  const updateWorkspace = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) return
      const { data, error } = await api.v1.workspaces({ id: currentWorkspace.id }).patch({
        name,
        description,
      })
      if (error) throw error
      return data
    },
    onSuccess: (updatedWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      if (updatedWorkspace) {
        setCurrentWorkspace(updatedWorkspace as unknown as Workspace)
      }
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 3000)
    },
  })

  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) return
      const { error } = await api.v1.workspaces({ id: currentWorkspace.id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setShowDeleteModal(false)

      const personalWorkspace = workspaces.find(o => o.personal && o.id !== currentWorkspace?.id)
      if (personalWorkspace) {
        setCurrentWorkspace(personalWorkspace)
        navigate({ to: '/boards' })
      } else {
        window.location.href = '/'
      }
    },
  })

  if (isWorkspaceLoading || isMembersLoading) return null

  if (!canManage && !isWorkspaceLoading && !isMembersLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-12 text-center">
        <div className="mb-6 border-2 border-black bg-red-50 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-600" />
          <h2 className="font-heading text-2xl font-bold tracking-tight text-black uppercase">Access Denied</h2>
          <p className="mt-2 text-sm font-medium text-gray-500 uppercase">
            You don't have permission to manage this workspace.
          </p>
          <Link
            to="/boards"
            className="mt-8 inline-block border border-black bg-black px-8 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-black hover:shadow-brutal-sm"
          >
            Back to Boards
          </Link>
        </div>
      </div>
    )
  }

  const isPersonal = currentWorkspace?.personal

  return (
    <div className="p-12 lg:px-16">
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed top-8 right-8 z-100 flex items-center gap-3 border-2 border-black bg-accent px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
          <CheckCircle size={20} className="text-black" />
          <span className="text-xs font-bold tracking-widest text-black uppercase">
            Settings saved successfully!
          </span>
        </div>
      )}

      <header className="mb-10">
        <h1 className="m-0 font-heading text-[32px] font-bold tracking-tight text-black uppercase">
          Workspace Settings
        </h1>
        <p className="mt-2 truncate text-sm font-medium text-gray-500 uppercase" title={currentWorkspace?.name}>
          Manage configuration for {currentWorkspace?.name}
        </p>
      </header>

      <div className="flex max-w-2xl flex-col gap-12">
        {/* General Settings */}
        <section className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 flex items-center gap-3 border-b border-black/10 pb-4">
            <SettingsIcon size={20} />
            <h2 className="font-heading text-lg font-bold tracking-wider text-black uppercase">General</h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
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
                onChange={(e) => setName(e.target.value)}
                maxLength={WORKSPACE_LIMITS.NAME_MAX}
                className="w-full border border-black bg-white px-4 py-3 font-heading text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5 focus:shadow-brutal-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
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
                rows={3}
                placeholder="What's this workspace about?"
                className="w-full resize-none border border-black bg-white px-4 py-3 font-heading text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5 focus:shadow-brutal-sm"
              />
            </div>

            <div className="flex justify-end border-t border-black/10 pt-6">
              <button
                onClick={() => updateWorkspace.mutate()}
                disabled={
                  updateWorkspace.isPending || 
                  (name === currentWorkspace?.name && description === (currentWorkspace?.description || '')) ||
                  !name.trim()
                }
                className="flex cursor-pointer items-center gap-2 border border-black bg-black px-8 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-black hover:shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <Save size={16} />
                {updateWorkspace.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        {!isPersonal && (
          <section className="border border-red-500 bg-red-50 p-8 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
            <div className="mb-6 flex items-center gap-3 border-b border-red-200 pb-4 text-red-600">
              <AlertTriangle size={20} />
              <h2 className="font-heading text-lg font-bold tracking-wider uppercase">Danger Zone</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-black uppercase">Delete Workspace</h3>
                <p className="mt-1 text-xs font-medium text-red-600 uppercase">
                  This action cannot be undone. All boards and tasks will be lost.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex cursor-pointer items-center gap-2 border border-red-600 bg-white px-6 py-3 text-xs font-bold tracking-widest text-red-600 uppercase transition-all hover:-translate-y-0.5 hover:bg-red-600 hover:text-white hover:shadow-brutal-sm"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </section>
        )}
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Workspace?"
          message={`Are you sure you want to delete "${currentWorkspace?.name}"? This action is permanent and cannot be undone.`}
          confirmText="Yes, Delete"
          variant="danger"
          onConfirm={() => deleteWorkspace.mutate()}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
