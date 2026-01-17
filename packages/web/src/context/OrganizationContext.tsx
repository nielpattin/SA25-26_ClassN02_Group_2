/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession } from '../api/auth'
import { Organization } from '../types/organization'

interface OrganizationContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  setCurrentOrganization: (org: Organization) => void
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await api.v1.organizations.user({ userId: session.user.id }).get()
      if (error) throw error
      return data as Organization[]
    },
    enabled: !!session?.user?.id,
  })

  // Set initial organization (prefer personal or first available)
  useEffect(() => {
    if (currentOrganization || organizations.length === 0) return

    // Try to restore from localStorage
    const savedOrgId = localStorage.getItem('kyte:current-org-id')
    const savedOrg = organizations.find(o => o.id === savedOrgId)

    if (savedOrg) {
      setTimeout(() => setCurrentOrganization(savedOrg), 0)
    } else {
      // Default to personal
      const personal = organizations.find(o => o.personal)
      setTimeout(() => setCurrentOrganization(personal || organizations[0]), 0)
    }
  }, [organizations, currentOrganization])

  // Persist selection
  const handleSetOrganization = (org: Organization) => {
    setCurrentOrganization(org)
    localStorage.setItem('kyte:current-org-id', org.id)
  }

  return (
    <OrganizationContext.Provider value={{
      organizations,
      currentOrganization,
      setCurrentOrganization: handleSetOrganization,
      isLoading
    }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
