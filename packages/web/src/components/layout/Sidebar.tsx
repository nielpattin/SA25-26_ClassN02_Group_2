import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Users, Plus, ChevronsUpDown, Check, LogOut, Building2 } from 'lucide-react'
import { useOrganization } from '../../context/OrganizationContext'
import { useSession, signOut } from '../../api/auth'
import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CreateOrgModal } from '../organizations/CreateOrgModal'

export function Sidebar() {
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization()
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const queryClient = useQueryClient()

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
      <CreateOrgModal 
        isOpen={isCreateOrgModalOpen} 
        onClose={() => setIsCreateOrgModalOpen(false)} 
      />
      
      <aside className="fixed top-0 left-0 flex h-screen w-64 flex-col border-r border-black bg-white">
        {/* Org Switcher */}
        <div className="relative border-b border-black p-4" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="hover:bg-accent flex w-full items-center justify-between gap-2 border border-black bg-white p-2 text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-black bg-black text-white">
                {currentOrganization?.personal ? (
                  <Users size={16} />
                ) : (
                  <Building2 size={16} />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-xs font-bold tracking-wide text-black uppercase">
                  {currentOrganization?.name || 'Select Org'}
                </span>
                <span className="truncate text-[10px] font-medium text-gray-500 uppercase">
                  {currentOrganization?.personal ? 'Personal' : 'Team'}
                </span>
              </div>
            </div>
            <ChevronsUpDown size={14} className="shrink-0 text-black/50" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] right-4 left-4 z-50 flex flex-col border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-2">
                <p className="mb-2 px-2 text-[10px] font-bold text-gray-400 uppercase">Organizations</p>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setCurrentOrganization(org)
                      setIsDropdownOpen(false)
                    }}
                    className={`group flex w-full items-center justify-between px-2 py-2 text-left text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white ${
                      currentOrganization?.id === org.id ? 'bg-black/5' : ''
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    {currentOrganization?.id === org.id && (
                      <Check size={14} className="text-black group-hover:text-white" />
                    )}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false)
                    setIsCreateOrgModalOpen(true)
                  }}
                  className="hover:bg-accent mt-2 flex w-full items-center gap-2 border-t border-black px-2 py-2 text-xs font-bold uppercase hover:text-black"
                >
                  <Plus size={14} />
                  Create Organization
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
              to="/dashboard"
              className={`flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                isActive('/dashboard')
                  ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <LayoutDashboard size={16} />
              Boards
            </Link>

            {/* Add more links here later like Members, Settings etc */}
          </div>
        </nav>

        {/* User Footer */}
        <div className="border-t border-black p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="h-8 w-8 overflow-hidden border border-black bg-gray-100">
               {session?.user?.image ? (
                  <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
               ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-black">
                      {session?.user?.name?.[0] || 'U'}
                  </div>
               )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-bold text-black uppercase">{session?.user?.name}</span>
              <span className="truncate text-[10px] font-medium text-gray-500">{session?.user?.email}</span>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="hover:bg-accent flex w-full items-center justify-center gap-2 border border-black bg-white py-2 text-xs font-bold uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
