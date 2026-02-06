/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState, useMemo } from 'react'
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
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    () => localStorage.getItem('kyte:current-workspace-id')
  )
  const prevUserIdRef = useRef<string | undefined>(session?.user?.id)

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

  if (prevUserIdRef.current !== session?.user?.id) {
    prevUserIdRef.current = session?.user?.id
    if (!session?.user?.id) {
      setSelectedWorkspaceId(null)
      localStorage.removeItem('kyte:current-workspace-id')
    }
  }

  const currentWorkspace = useMemo(() => {
    if (!session?.user?.id || workspaces.length === 0) return null

    if (selectedWorkspaceId) {
      const selected = workspaces.find(w => w.id === selectedWorkspaceId)
      if (selected) return selected
    }

    const personal = workspaces.find(w => w.personal)
    return personal || workspaces[0]
  }, [session?.user?.id, workspaces, selectedWorkspaceId])

  const handleSetWorkspace = (workspace: Workspace) => {
    setSelectedWorkspaceId(workspace.id)
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
