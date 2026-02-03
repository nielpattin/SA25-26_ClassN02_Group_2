import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Users, ShieldAlert, FileText, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useSession, signOut } from '../../api/auth'
import { useQueryClient } from '@tanstack/react-query'

export function AdminSidebar() {
  const { data: session } = useSession()
  const routerState = useRouterState()
  const queryClient = useQueryClient()

  const adminRole = session?.user?.adminRole
  const isSuperAdmin = adminRole === 'super_admin'
  const isModeratorPlus = adminRole === 'super_admin' || adminRole === 'moderator'

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    window.location.href = '/'
  }

  const isActive = (path: string) => routerState.location.pathname === path

  return (
    <aside className="fixed top-0 left-0 flex h-screen w-64 flex-col border-r border-black bg-white">
      {/* Admin Header */}
      <div className="flex items-center gap-3 border-b border-black p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          <ShieldCheck size={20} />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-black tracking-tight text-black uppercase">
            Kyte Admin
          </span>
          <span className="truncate text-[10px] font-bold text-gray-500 uppercase">
            {adminRole?.replace('_', ' ') || 'Administrator'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase">Management</p>
          
          <Link
            to="/admin"
            className={`flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
              isActive('/admin')
                ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          {isSuperAdmin && (
            <Link
              to="/admin/users"
              className={`flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                isActive('/admin/users')
                  ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <Users size={16} />
              Admin Users
            </Link>
          )}

          {isModeratorPlus && (
            <Link
              to="/admin/moderation"
              className={`flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
                isActive('/admin/moderation')
                  ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <ShieldAlert size={16} />
              Moderation
            </Link>
          )}

          <Link
            to="/admin/audit"
            className={`flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide uppercase transition-all ${
              isActive('/admin/audit')
                ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-black hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <FileText size={16} />
            Audit Log
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase">System</p>
          <Link
            to="/boards"
            className="flex items-center gap-3 border border-transparent px-3 py-2 text-xs font-bold tracking-wide text-black uppercase transition-all hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowLeft size={16} />
            Back to App
          </Link>
        </div>
      </nav>

      {/* User Footer */}
      <div className="border-t border-black p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="h-8 w-8 overflow-hidden border border-black bg-gray-100">
             {session?.user?.image ? (
                <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
             ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-black uppercase">
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
  )
}
