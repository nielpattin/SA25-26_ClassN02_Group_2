import { createFileRoute, Link } from '@tanstack/react-router'
import { useSession } from '../../api/auth'
import { useDashboardMetrics } from '../../hooks/useAdmin'
import { 
  Users, 
  ShieldAlert, 
  FileText, 
  Loader2, 
  LayoutGrid, 
  Layers, 
  Activity, 
  Database, 
  Cloud, 
  Zap,
  CheckCircle2
} from 'lucide-react'

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

  const maxGrowth = metrics?.userGrowth ? Math.max(...metrics.userGrowth.map(g => g.count), 1) : 1

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
          {/* Metrics Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
              label="Active Users (24h)" 
              value={metrics?.activeUsers24h} 
              icon={<Activity size={20} />} 
            />
            <MetricCard 
              label="Total Users" 
              value={metrics?.totalUsers} 
              icon={<Users size={20} />} 
            />
            <MetricCard 
              label="Workspaces" 
              value={metrics?.totalWorkspaces} 
              icon={<LayoutGrid size={20} />} 
            />
            <MetricCard 
              label="Boards" 
              value={metrics?.totalBoards} 
              icon={<Layers size={20} />} 
            />
          </div>

          <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* User Activity Chart */}
            <div className="col-span-1 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] lg:col-span-2">
              <h2 className="mb-8 text-xl font-black uppercase flex items-center gap-3">
                <Activity size={24} />
                User Growth (7 Days)
              </h2>
              <div className="flex h-48 items-end gap-3 px-2">
                {metrics?.userGrowth?.map((day, i) => (
                  <div key={i} className="group relative flex flex-1 flex-col items-center gap-2">
                    <div 
                      className="w-full border-x border-t border-black bg-black transition-all group-hover:bg-gray-800"
                      style={{ height: `${(day.count / maxGrowth) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded border-2 border-black bg-white px-2 py-1 text-[10px] font-black opacity-0 transition-opacity group-hover:opacity-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 whitespace-nowrap">
                        {day.count} USERS
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
                {(!metrics?.userGrowth || metrics.userGrowth.length === 0) && (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400 uppercase">
                    No activity data
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="mb-6 text-xl font-black uppercase flex items-center gap-3">
                <Zap size={24} />
                System Health
              </h2>
              <div className="space-y-3">
                <StatusItem label="API Gateway" icon={<Zap size={14} />} />
                <StatusItem label="Database" icon={<Database size={14} />} />
                <StatusItem label="Storage" icon={<Cloud size={14} />} />
              </div>
              
              <div className="mt-8 border-t-2 border-black pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Pending Moderation</div>
                    <div className="mt-1 text-3xl font-black">{metrics?.pendingModerationCount ?? 0}</div>
                  </div>
                  <ShieldAlert size={32} className={metrics?.pendingModerationCount && metrics.pendingModerationCount > 0 ? 'text-black' : 'text-gray-200'} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Quick Links */}
            <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="mb-6 text-xl font-black uppercase flex items-center gap-3">
                <FileText size={24} />
                Management
              </h2>
              <div className="flex flex-col gap-3">
                {(isSuperAdmin || isSupport) && (
                  <Link
                    to="/admin/user-lookup"
                    className="flex items-center gap-3 border border-black bg-white px-4 py-3 text-xs font-black uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group"
                  >
                    <div className="p-1.5 border border-black bg-gray-50 group-hover:bg-white">
                      <Users size={14} />
                    </div>
                    User Directory
                  </Link>
                )}

                {isModeratorPlus && (
                  <Link
                    to="/admin/moderation"
                    className="flex items-center gap-3 border border-black bg-white px-4 py-3 text-xs font-black uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group"
                  >
                    <div className="p-1.5 border border-black bg-gray-50 group-hover:bg-white">
                      <ShieldAlert size={14} />
                    </div>
                    Moderation Queue
                  </Link>
                )}

                <Link
                  to="/admin/audit"
                  className="flex items-center gap-3 border border-black bg-white px-4 py-3 text-xs font-black uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group"
                >
                  <div className="p-1.5 border border-black bg-gray-50 group-hover:bg-white">
                    <FileText size={14} />
                  </div>
                  System Audit Log
                </Link>
              </div>
            </div>

            {/* Recent Admin Actions */}
            <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="mb-6 text-xl font-black uppercase flex items-center gap-3">
                <Activity size={24} />
                Recent Activity
              </h2>
              {metrics?.recentAdminActions && metrics.recentAdminActions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {metrics.recentAdminActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase leading-tight">{action.action.replace('.', ': ')}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                          {new Date(action.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 self-center">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-400 uppercase">No recent activity detected</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon }: { label: string; value?: number; icon?: React.ReactNode }) {
  return (
    <div className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-black text-gray-400 uppercase">{label}</div>
        {icon}
      </div>
      <div className="text-4xl font-black text-black">{value ?? 0}</div>
    </div>
  )
}

function StatusItem({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0 p-1 border border-black bg-gray-50">
          {icon}
        </div>
        <span className="text-[11px] font-black uppercase truncate leading-none pt-0.5">{label}</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 border border-green-600 flex-shrink-0">
        <CheckCircle2 size={10} className="text-green-600" />
        <span className="text-[9px] font-black text-green-700 uppercase leading-none">Up</span>
      </div>
    </div>
  )
}
