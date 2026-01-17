import { Sidebar } from './Sidebar'
import { OrganizationProvider } from '../../context/OrganizationContext'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <OrganizationProvider>
      <div className="bg-canvas flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    </OrganizationProvider>
  )
}
