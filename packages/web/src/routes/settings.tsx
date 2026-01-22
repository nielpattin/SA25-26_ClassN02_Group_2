import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Save, Trash2, AlertTriangle, Settings as SettingsIcon } from 'lucide-react'
import { api } from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'
import { Workspace } from '../types/workspace'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { ConfirmModal } from '../components/ui/ConfirmModal'

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
	const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading } = useWorkspace()
	const [name, setName] = useState('')
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	useEffect(() => {
		if (currentWorkspace) {
			setTimeout(() => setName(currentWorkspace.name), 0)
		}
	}, [currentWorkspace])

	const updateWorkspace = useMutation({
		mutationFn: async () => {
			if (!currentWorkspace) return
			const { data, error } = await api.v1.workspaces({ id: currentWorkspace.id }).patch({
				name
			})
			if (error) throw error
			return data
		},
		onSuccess: (updatedWorkspace) => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			if (updatedWorkspace) {
				setCurrentWorkspace(updatedWorkspace as Workspace)
			}
		}
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

			// Switch to personal workspace
			const personalWorkspace = workspaces.find(o => o.personal && o.id !== currentWorkspace?.id)
			if (personalWorkspace) {
				setCurrentWorkspace(personalWorkspace)
				navigate({ to: '/boards' })
			} else {
				// Fallback if no personal workspace found (shouldn't happen)
				window.location.href = '/'
			}
		}
	})

	if (isLoading) return null

	// Prevent accessing settings for personal workspaces (if desired) or just disable delete
	const isPersonal = currentWorkspace?.personal

	return (
		<div className="p-12 lg:px-16">
			<header className="mb-10">
				<h1 className="font-heading m-0 text-[32px] font-bold tracking-tight text-black uppercase">
					Workspace Settings
				</h1>
				<p className="mt-2 text-sm font-medium text-gray-500 uppercase">
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

					<div className="flex flex-col gap-4">
						<label className="text-xs font-bold tracking-wider text-black uppercase">
							Workspace Name
						</label>
						<div className="flex gap-4">
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="font-heading focus:shadow-brutal-sm flex-1 border border-black bg-white px-4 py-3 text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5"
							/>
							<button
								onClick={() => updateWorkspace.mutate()}
								disabled={updateWorkspace.isPending || name === currentWorkspace?.name}
								className="hover:bg-accent hover:shadow-brutal-sm flex items-center gap-2 border border-black bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
							>
								<Save size={16} />
								{updateWorkspace.isPending ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
				</section>

				{/* Danger Zone */}
				{!isPersonal && (
					<section className="border border-red-500 bg-red-50 p-8">
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
								className="flex items-center gap-2 border border-red-600 bg-white px-6 py-3 text-xs font-bold tracking-widest text-red-600 uppercase transition-colors hover:bg-red-600 hover:text-white"
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
