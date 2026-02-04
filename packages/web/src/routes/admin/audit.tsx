import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuditLogs, useExportAuditLogs, useAdminUsers } from '../../hooks/useAdmin'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { useSession } from '../../api/auth'
import { 
  RefreshCw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Clock,
  User,
  Activity,
  Box
} from 'lucide-react'

type AuditSearch = {
  adminId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  page?: number
}

interface AuditLog {
  id: string
  adminId: string
  adminName: string | null
  adminEmail: string | null
  action: string
  targetType: string
  targetId: string | null
  metadata: unknown
  createdAt: Date
}

interface AdminUser {
  id: string
  name: string | null
}

const LIMIT = 20

const ACTION_OPTIONS = [
  { id: 'all', name: 'All Actions' },
  { id: 'user.promoted', name: 'User Promoted' },
  { id: 'user.demoted', name: 'User Demoted' },
  { id: 'template.approved', name: 'Template Approved' },
  { id: 'template.rejected', name: 'Template Rejected' },
  { id: 'workspace.deleted', name: 'Workspace Deleted' },
]

export const Route = createFileRoute('/admin/audit')({
  validateSearch: (search: Record<string, unknown>): AuditSearch => {
    return {
      adminId: search.adminId as string,
      action: search.action as string,
      dateFrom: search.dateFrom as string,
      dateTo: search.dateTo as string,
      page: Number(search.page) || 1,
    }
  },
  component: AdminAuditLogComponent,
})

function AdminAuditLogComponent() {
  const search = useSearch({ from: '/admin/audit' })
  const navigate = useNavigate({ from: '/admin/audit' })
  const [isExporting, setIsExporting] = useState(false)
  
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.adminRole === 'super_admin'

  const { data: admins } = useAdminUsers(100)
  const adminOptions = [
    { id: 'all', name: 'All Admins' },
    ...(admins?.map((a: AdminUser) => ({ id: a.id, name: a.name || 'Unknown' })) || [])
  ]

  const filters = {
    adminId: search.adminId && search.adminId !== 'all' ? search.adminId : undefined,
    action: search.action && search.action !== 'all' ? search.action : undefined,
    dateFrom: search.dateFrom || undefined,
    dateTo: search.dateTo || undefined,
    limit: LIMIT,
    offset: ((search.page || 1) - 1) * LIMIT,
  }

  const { data, isLoading, error, refetch } = useAuditLogs(filters)
  const exportMutation = useExportAuditLogs()

  const handleFilterChange = (key: keyof AuditSearch, value: string | number | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value, page: 1 }),
    })
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const data = await exportMutation.mutateAsync()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-export-${new Date().toISOString()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-black" size={32} />
          <span className="text-xs font-bold tracking-widest uppercase">Loading Audit Logs...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12">
        <div className="border border-black bg-error p-8 shadow-brutal-lg">
          <div className="flex items-center gap-4 text-white">
            <AlertCircle size={32} />
            <div>
              <h2 className="text-xl font-black uppercase">Error Loading Audit Logs</h2>
              <p className="font-bold">{(error as Error).message || 'An unexpected error occurred'}</p>
            </div>
          </div>
          <Button variant="secondary" className="mt-6" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const logs = data || []
  const hasMore = logs.length === LIMIT

  return (
    <div className="p-12">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="mb-2 font-heading text-4xl font-black tracking-tighter uppercase">
            Audit Log
          </h1>
          <p className="text-sm font-bold tracking-wide text-gray-500 uppercase">
            Track all administrative actions across the platform
          </p>
        </div>
        {isSuperAdmin && (
          <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
            <Download size={18} className="mr-2" />
            {isExporting ? 'Exporting...' : 'Export JSON'}
          </Button>
        )}
      </header>

      {/* Filters */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Admin</label>
          <Select 
            value={search.adminId || 'all'} 
            options={adminOptions} 
            onChange={(val) => handleFilterChange('adminId', val)} 
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Action</label>
          <Select 
            value={search.action || 'all'} 
            options={ACTION_OPTIONS} 
            onChange={(val) => handleFilterChange('action', val)} 
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase">From</label>
          <Input 
            type="date" 
            value={search.dateFrom || ''} 
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)} 
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase">To</label>
          <Input 
            type="date" 
            value={search.dateTo || ''} 
            onChange={(e) => handleFilterChange('dateTo', e.target.value)} 
          />
        </div>
        <div className="flex items-end">
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => navigate({ search: {} as AuditSearch, replace: true })}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="overflow-hidden border border-black bg-white shadow-brutal-lg">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-black bg-black text-white">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black tracking-widest uppercase">Admin</th>
              <th className="px-6 py-4 text-[10px] font-black tracking-widest uppercase">Action</th>
              <th className="px-6 py-4 text-[10px] font-black tracking-widest uppercase">Target</th>
              <th className="px-6 py-4 text-[10px] font-black tracking-widest uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm font-bold tracking-widest text-gray-400 uppercase">
                  No audit logs found matching filters
                </td>
              </tr>
            ) : (
              (logs as AuditLog[]).map((log) => (
                <tr key={log.id} className="border-b border-black transition-colors last:border-0 hover:bg-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-xs font-black uppercase">{log.adminName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase">{log.action.replace('.', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Box size={14} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-600 uppercase">
                        {log.targetType}: {log.targetId?.slice(0, 8) || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
          Page {search.page || 1}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            disabled={(search.page || 1) === 1}
            onClick={() => handleFilterChange('page', (search.page || 1) - 1)}
          >
            <ChevronLeft size={16} />
            Prev
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            disabled={!hasMore}
            onClick={() => handleFilterChange('page', (search.page || 1) + 1)}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
