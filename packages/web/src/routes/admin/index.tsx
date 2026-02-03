import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '../../api/auth'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: session } = useSession()

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-12">
        <h1 className="font-heading m-0 text-[40px] font-black tracking-tighter text-black uppercase lg:text-[64px]">
          Admin Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-bold text-gray-500 uppercase">
          Welcome back, {session?.user?.name}. You are logged in as <span className="text-black">{session?.user?.adminRole?.replace('_', ' ')}</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Stats or Info Cards */}
        <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="mb-4 text-xl font-black uppercase">System Status</h2>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 border border-black"></div>
            <span className="text-sm font-bold uppercase">All systems operational</span>
          </div>
        </div>

        <div className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="mb-4 text-xl font-black uppercase">Your Role</h2>
          <p className="text-sm font-bold text-gray-600 uppercase">
            {session?.user?.adminRole === 'super_admin' 
              ? 'Full system access and user management.'
              : session?.user?.adminRole === 'moderator'
              ? 'Template moderation and content review.'
              : 'Audit log access and support tools.'}
          </p>
        </div>
      </div>
    </div>
  )
}
