import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Users, Plus, ChevronsUpDown, Check, LogOut, Building2, Settings, ShieldCheck, Users as MembersIcon, Search, Archive, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useSession, signOut } from '../../api/auth'
import { useState, useRef, useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { CreateWorkspaceModal } from '../workspaces/CreateWorkspaceModal'
import { NotificationBell } from '../notifications/NotificationBell'
import { useSearchModal } from '../../context/SearchContext'
import { ADMIN_ROLES } from '../../constants/workspace'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
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
  const canManage = !!myMembership && ADMIN_ROLES.includes(myMembership.role)
  const canAccessAdmin = !!session?.user?.adminRole

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target
      if (target instanceof Node && dropdownRef.current && !dropdownRef.current.contains(target)) {
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
      
      <aside className={`fixed top-0 left-0 flex h-screen flex-col border-r-2 border-black bg-white transition-all duration-300 ease-in-out z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Workspace Switcher */}
        <div className={`relative flex items-center gap-2 border-b-2 border-black ${isCollapsed ? 'p-3' : 'p-4'}`} ref={dropdownRef}>
          <button
            onClick={() => !isCollapsed && setIsDropdownOpen(!isDropdownOpen)}
            title={currentWorkspace?.name || 'Select Workspace'}
            className={`flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 border-2 border-black bg-white text-left shadow-brutal-xs transition-all hover:bg-accent ${isCollapsed ? 'p-2 justify-center' : 'p-2'}`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-black text-white">
                {currentWorkspace?.personal ? (
                  <Users size={14} />
                ) : (
                  <Building2 size={14} />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-[10px] font-black tracking-tight text-black uppercase">
                    {currentWorkspace?.name || 'Workspace'}
                  </span>
                  <span className="truncate text-[8px] font-bold text-gray-500 uppercase">
                    {currentWorkspace?.personal ? 'Personal' : 'Team'}
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronsUpDown size={12} className="shrink-0 text-black/50" />}
          </button>
          
          {!isCollapsed && <NotificationBell />}

          {/* Collapse Toggle Button */}
          <button 
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center border-2 border-black bg-white shadow-brutal-xs hover:bg-accent transition-transform hover:scale-110"
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && !isCollapsed && (
            <div className="absolute top-[calc(100%+8px)] right-4 left-4 z-50 flex flex-col border-2 border-black bg-white shadow-brutal-sm">
              <div className="p-2">
                <p className="mb-2 px-2 text-[9px] font-black text-gray-400 uppercase">Workspaces</p>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      setCurrentWorkspace(workspace)
                      setIsDropdownOpen(false)
                    }}
                    className={`group flex w-full items-center justify-between px-2 py-1.5 text-left text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white ${
                      currentWorkspace?.id === workspace.id ? 'bg-black/5' : ''
                    }`}
                  >
                    <span className="truncate" title={workspace.name}>{workspace.name}</span>
                    {currentWorkspace?.id === workspace.id && (
                      <Check size={12} className="text-black group-hover:text-white" />
                    )}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false)
                    setIsCreateWorkspaceModalOpen(true)
                  }}
                  className="mt-2 flex w-full items-center gap-2 border-t-2 border-black px-2 py-2 text-[10px] font-black uppercase hover:bg-accent hover:text-black"
                >
                  <Plus size={12} />
                  Create Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-3' : 'p-4'}`}>
          <div className="flex flex-col gap-2">
            {!isCollapsed && <p className="px-2 text-[9px] font-black text-gray-400 uppercase">Menu</p>}
            
            <Link
              to="/boards"
              title="Boards"
              className={`flex items-center border-2 transition-all ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-[10px] font-black tracking-wide uppercase'} ${
                isActive('/boards')
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-brutal-xs'
              }`}
            >
              <LayoutDashboard size={16} strokeWidth={2.5} />
              {!isCollapsed && <span>Boards</span>}
            </Link>

            <button
              onClick={openSearch}
              title="Search"
              className={`flex cursor-pointer items-center border-2 border-transparent transition-all hover:border-black hover:bg-white hover:shadow-brutal-xs ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-[10px] font-black tracking-wide text-black uppercase'}`}
            >
              <Search size={16} strokeWidth={2.5} />
              {!isCollapsed && <span>Search</span>}
            </button>

            <Link
              to="/members"
              title="Members"
              className={`flex items-center border-2 transition-all ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-[10px] font-black tracking-wide uppercase'} ${
                isActive('/members')
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-brutal-xs'
              }`}
            >
              <MembersIcon size={16} strokeWidth={2.5} />
              {!isCollapsed && <span>Members</span>}
            </Link>

            <Link
              to="/settings"
              title="Settings"
              className={`flex items-center border-2 transition-all ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-[10px] font-black tracking-wide uppercase'} ${
                isActive('/settings')
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-brutal-xs'
              }`}
            >
              <Settings size={16} strokeWidth={2.5} />
              {!isCollapsed && <span>Settings</span>}
            </Link>

            {canAccessAdmin && (
              <Link
                to="/admin"
                title="Admin"
                className={`flex items-center border-2 transition-all ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-[10px] font-black tracking-wide uppercase'} ${
                  isActive('/admin')
                    ? 'border-black bg-black text-white'
                    : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-brutal-xs'
                }`}
              >
                <ShieldCheck size={16} strokeWidth={2.5} />
                {!isCollapsed && <span>Admin</span>}
              </Link>
            )}

            {canManage && (
              <Link
                to="/archive"
                title="Archive"
                className={`flex items-center border-2 transition-all ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-[10px] font-black tracking-wide uppercase'} ${
                  isActive('/archive')
                    ? 'border-black bg-black text-white'
                    : 'border-transparent text-black hover:border-black hover:bg-white hover:shadow-brutal-xs'
                }`}
              >
                <Archive size={16} strokeWidth={2.5} />
                {!isCollapsed && <span>Archive</span>}
              </Link>
            )}
          </div>
        </nav>

        {/* User Footer */}
        <div className={`border-t-2 border-black ${isCollapsed ? 'p-3' : 'p-4'}`}>
          <Link to="/profile" title="Profile" className={`group mb-4 flex items-center transition-all ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
            <div className="h-7 w-7 shrink-0 overflow-hidden border-2 border-black bg-gray-100 transition-all group-hover:shadow-brutal-xs">
               {session?.user?.image ? (
                  <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
               ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-black uppercase">
                      {session?.user?.name?.[0] || 'U'}
                  </div>
               )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-[10px] font-black text-black uppercase group-hover:underline">{session?.user?.name}</span>
                <span className="truncate text-[8px] font-bold text-gray-500">{session?.user?.email}</span>
              </div>
            )}
          </Link>
          
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className={`flex w-full cursor-pointer items-center justify-center border-2 border-black bg-white transition-all hover:bg-accent hover:shadow-brutal-xs ${isCollapsed ? 'p-2' : 'gap-2 py-2 text-[10px] font-black uppercase'}`}
          >
            <LogOut size={14} strokeWidth={2.5} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
