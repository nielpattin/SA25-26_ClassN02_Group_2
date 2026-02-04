/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession } from '../api/auth'
import { Workspace } from '../types/workspace'

interface WorkspaceContextType {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  setCurrentWorkspace: (workspace: Workspace) => void
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await api.v1.workspaces.user({ userId: session.user.id }).get()
      if (error) throw error
      return data as Workspace[]
    },
    enabled: !!session?.user?.id,
  })

  // Set initial workspace (prefer personal or first available)
  useEffect(() => {
    if (currentWorkspace || workspaces.length === 0) return

    // Try to restore from localStorage
    const savedWorkspaceId = localStorage.getItem('kyte:current-workspace-id')
    const savedWorkspace = workspaces.find(w => w.id === savedWorkspaceId)

    if (savedWorkspace) {
      setCurrentWorkspace(savedWorkspace)
    } else {
      // Default to personal
      const personal = workspaces.find(w => w.personal)
      setCurrentWorkspace(personal || workspaces[0])
    }
  }, [workspaces, currentWorkspace])

  // Persist selection
  const handleSetWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace)
    localStorage.setItem('kyte:current-workspace-id', workspace.id)
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      setCurrentWorkspace: handleSetWorkspace,
      isLoading
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
