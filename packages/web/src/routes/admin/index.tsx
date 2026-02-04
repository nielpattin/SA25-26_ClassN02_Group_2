import { createFileRoute, Link } from '@tanstack/react-router'
import { useSession } from '../../api/auth'
import { useDashboardMetrics } from '../../hooks/useAdmin'
import { Users, ShieldAlert, FileText, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: session } = useSession()
  const { data: metrics, isLoading } = useDashboardMetrics()

  const adminRole = session?.user?.adminRole
  const isSuperAdmin = adminRole === 'super_admin'
  const isSupport = adminRole === 'support'
  const isModeratorPlus = adminRole === 'super_admin' || adminRole === 'moderator'

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-12">
        <h1 className="m-0 font-heading text-[40px] font-black tracking-tighter text-black uppercase lg:text-[64px]">
          Admin Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-bold text-gray-500 uppercase">
          Welcome back, {session?.user?.name}. You are logged in as <span className="text-black">{adminRole?.replace('_', ' ')}</span>.
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-black" />
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Active Users (24h)</div>
              <div className="text-4xl font-black text-black">{metrics?.activeUsers24h ?? 0}</div>
            </div>

            <div className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Pending Moderation</div>
              <div className="text-4xl font-black text-black">{metrics?.pendingModerationCount ?? 0}</div>
            </div>

            <div className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Recent Admin Actions</div>
              <div className="text-4xl font-black text-black">{metrics?.recentAdminActions?.length ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Quick Links */}
            <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="mb-6 text-xl font-black uppercase">Quick Links</h2>
              <div className="flex flex-col gap-3">
                {(isSuperAdmin || isSupport) && (
                  <Link
                    to="/admin/user-lookup"
                    className="flex items-center gap-3 border border-black bg-white px-4 py-3 text-sm font-bold uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Users size={18} />
                    User Lookup
                  </Link>
                )}

                {isModeratorPlus && (
                  <Link
                    to="/admin/moderation"
                    className="flex items-center gap-3 border border-black bg-white px-4 py-3 text-sm font-bold uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <ShieldAlert size={18} />
                    Moderation
                  </Link>
                )}

                <Link
                  to="/admin/audit"
                  className="flex items-center gap-3 border border-black bg-white px-4 py-3 text-sm font-bold uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <FileText size={18} />
                  Audit Log
                </Link>
              </div>
            </div>

            {/* Recent Admin Actions */}
            <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="mb-6 text-xl font-black uppercase">Recent Admin Actions</h2>
              {metrics?.recentAdminActions && metrics.recentAdminActions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {metrics.recentAdminActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-gray-200 py-2 last:border-0">
                      <span className="text-sm font-bold uppercase">{action.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-500 uppercase">No recent admin actions</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
