import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Users, Plus, ChevronsUpDown, Check, LogOut, Building2, Settings, ShieldCheck, Users as MembersIcon, Search, Archive } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useSession, signOut } from '../../api/auth'
import { useState, useRef, useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { CreateWorkspaceModal } from '../workspaces/CreateWorkspaceModal'
import { NotificationBell } from '../notifications/NotificationBell'
import { useSearchModal } from '../../context/SearchContext'

export function Sidebar() {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const queryClient = useQueryClient()
  const { open: openSearch } = useSearchModal()

  const { data: members } = useQuery({
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
  const canManage = myMembership?.role === 'owner' || myMembership?.role === 'admin'
  const canAccessAdmin = !!session?.user?.adminRole

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    window.location.href = '/'
  }

  const isActive = (path: string) => routerState.location.pathname === path

  return (
    <>
      <CreateWorkspaceModal 
        isOpen={isCreateWorkspaceModalOpen} 
        onClose={() => setIsCreateWorkspaceModalOpen(false)} 
      />
      
      <aside className="fixed top-0 left-0 flex h-screen w-64 flex-col border-r border-black bg-white">
        {/* Workspace Switcher */}
        <div className="relative flex items-center gap-2 border-b border-black p-4" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title={currentWorkspace?.name || 'Select Workspace'}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 border border-black bg-white p-2 text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-px hover:translate-y-px hover:bg-accent hover:shadow-none"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-black bg-black text-white">
                {currentWorkspace?.personal ? (
                  <Users size={16} />
                ) : (
                  <Building2 size={16} />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-xs font-bold tracking-wide text-black uppercase">
                  {currentWorkspace?.name || 'Select Workspace'}
                </span>
                <span className="truncate text-[10px] font-medium text-gray-500 uppercase">
                  {currentWorkspace?.personal ? 'Personal' : 'Team'}
                </span>
              </div>
            </div>
            <ChevronsUpDown size={14} className="shrink-0 text-black/50" />
          </button>
          
          <NotificationBell />

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] right-4 left-4 z-50 flex flex-col border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-2">
                <p className="mb-2 px-2 text-[10px] font-bold text-gray-400 uppercase">Workspaces</p>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      setCurrentWorkspace(workspace)
                      setIsDropdownOpen(false)
                    }}
                    className={`group flex w-full items-center justify-between px-2 py-2 text-left text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white ${
                      currentWorkspace?.id === workspace.id ? 'bg-black/5' : ''
                    }`}
                  >
                    <span className="truncate" title={workspace.name}>{workspace.name}</span>
                    {currentWorkspace?.id === workspace.id && (
                      <Check size={14} className="text-black group-hover:text-white" />
                    )}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false)
                    setIsCreateWorkspaceModalOpen(true)
                  }}
                  className="mt-2 flex w-full items-center gap-2 border-t border-black px-2 py-2 text-xs font-bold uppercase hover:bg-accent hover:text-black"
                >
                  <Plus size={14} />
                  Create Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <p className="px-2 text-[10px] font-bold text-gray-400 uppercase">Menu</p>
            
            <Link
              to="/boards"
              className={`flex items-center gap-3 border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                isActive('/boards')
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <LayoutDashboard size={16} />
              Boards
            </Link>

            <button
              onClick={openSearch}
              className="flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide text-black uppercase transition-all hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Search size={16} />
              Search
            </button>

            <Link
              to="/members"
              className={`flex items-center gap-3 border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                isActive('/members')
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <MembersIcon size={16} />
              Members
            </Link>

            <Link
              to="/settings"
              className={`flex items-center gap-3 border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                isActive('/settings')
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <Settings size={16} />
              Settings
            </Link>

            {canAccessAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                  isActive('/admin')
                    ? 'border-black bg-black text-white'
                    : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <ShieldCheck size={16} />
                Admin
              </Link>
            )}

            {canManage && (
              <Link
                to="/archive"
                className={`flex items-center gap-3 border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                  isActive('/archive')
                    ? 'border-black bg-black text-white'
                    : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <Archive size={16} />
                Archive
              </Link>
            )}
          </div>
        </nav>

        {/* User Footer */}
        <div className="border-t border-black p-4">
          <Link to="/profile" className="group mb-4 flex items-center gap-3 px-2">
            <div className="h-8 w-8 overflow-hidden border border-black bg-gray-100 transition-all group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
               {session?.user?.image ? (
                  <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
               ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-black uppercase">
                      {session?.user?.name?.[0] || 'U'}
                  </div>
               )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-bold text-black uppercase group-hover:underline">{session?.user?.name}</span>
              <span className="truncate text-[10px] font-medium text-gray-500">{session?.user?.email}</span>
            </div>
          </Link>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 border border-black bg-white py-2 text-xs font-bold uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
