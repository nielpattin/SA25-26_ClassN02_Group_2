import { Sidebar } from './Sidebar'
import { WorkspaceProvider } from '../../context/WorkspaceContext'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <main className="ml-64 flex-1 transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  )
}
