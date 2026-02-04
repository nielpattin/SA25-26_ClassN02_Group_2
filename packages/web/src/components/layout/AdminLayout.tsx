import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar />
      <main className="ml-64 flex-1 transition-all duration-300 ease-in-out">
        {children}
      </main>
    </div>
  )
}
