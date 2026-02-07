import { Sidebar } from './Sidebar'
import { WorkspaceProvider } from '../../context/WorkspaceContext'
import { useState } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  )
}
