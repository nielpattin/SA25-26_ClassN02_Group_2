import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession } from '../api/auth'
import { useWorkspace } from '../context/WorkspaceContext'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { useState } from 'react'
import { UserPlus, Trash2, Shield, Mail } from 'lucide-react'
import { InviteMemberModal } from '../components/workspaces/InviteMemberModal'
import { Avatar } from '../components/ui/Avatar'
import { ADMIN_ROLES } from '../constants/workspace'

export const Route = createFileRoute('/members')({
  component: MembersRouteComponent,
})

function MembersRouteComponent() {
  return (
    <DashboardLayout>
      <MembersPage />
    </DashboardLayout>
  )
}

function MembersPage() {
  const { data: session } = useSession()
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const queryClient = useQueryClient()

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

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentWorkspace) return
      const { error } = await api.v1.workspaces({ id: currentWorkspace.id }).members({ userId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', currentWorkspace?.id] })
    },
  })

  if (isWorkspaceLoading) return null

  const myMembership = Array.isArray(members) ? members.find(m => m.userId === session?.user?.id) : null
  const canManage = !!myMembership && ADMIN_ROLES.includes(myMembership.role)

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="m-0 font-heading text-[32px] font-bold tracking-tight text-black uppercase">
              Workspace Members
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500 uppercase">
              Manage who has access to {currentWorkspace?.name}
            </p>
          </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex cursor-pointer items-center gap-2 border border-black bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:text-black hover:shadow-brutal-md"
        >
          <UserPlus size={16} />
          Invite Member
        </button>
      </header>

      <div className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black bg-black text-[10px] font-bold tracking-widest text-white uppercase">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {isMembersLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-xs font-bold text-black/40 uppercase">
                    Loading members...
                  </td>
                </tr>
              ) : Array.isArray(members) && members.map((member) => (
                <tr key={member.id} className="group hover:bg-black/2">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        fallback={member.userName || 'U'} 
                        src={member.userImage || undefined} 
                        className="h-10 w-10 border border-black" 
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black uppercase">{member.userName}</span>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 lowercase">
                          <Mail size={10} />
                          {member.userEmail}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 border border-black px-2 py-1 text-[9px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                      member.role === 'owner' ? 'bg-black text-white' : 
                      member.role === 'admin' ? 'bg-accent text-black' : 'bg-white text-black'
                    }`}>
                      <Shield size={10} />
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canManage && member.role !== 'owner' && member.userId !== session?.user?.id && (
                      <button
                        onClick={() => removeMember.mutate(member.userId)}
                        disabled={removeMember.isPending}
                        className="cursor-pointer p-2 text-black transition-colors hover:bg-red-500 hover:text-white"
                        title="Remove Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {member.userId === session?.user?.id && member.role !== 'owner' && (
                         <button
                           onClick={() => removeMember.mutate(member.userId)}
                           className="cursor-pointer border border-black bg-white px-3 py-1 text-[9px] font-bold uppercase transition-all hover:bg-red-500 hover:text-white"
                         >
                           Leave Workspace
                         </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  )
}
