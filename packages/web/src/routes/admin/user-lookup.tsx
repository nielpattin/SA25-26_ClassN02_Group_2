import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUserSearch } from '../../hooks/useAdmin'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authClient } from '../../api/auth'
import { Search, Loader2, AlertCircle, ChevronLeft, ChevronRight, User, ShieldCheck, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/admin/user-lookup')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    const role = session?.user?.adminRole
    if (role !== 'super_admin' && role !== 'support') {
      throw redirect({
        to: '/admin',
      })
    }
  },
  component: UserLookupComponent,
})

function UserLookupComponent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 10

  const { data: users, isLoading, error } = useUserSearch(searchQuery, limit, offset)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0) // Reset to first page on new search
  }

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - limit))
  }

  const handleNext = () => {
    if (users && users.length === limit) {
      setOffset((prev) => prev + limit)
    }
  }

  return (
    <div className="p-12">
      <header className="mb-12">
        <h1 className="font-heading mb-2 text-4xl font-black uppercase tracking-tighter">
          User Lookup
        </h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
          Search for users by email, name, or ID
        </p>
      </header>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by email, name, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 border-2 border-black pl-12 text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder:text-gray-400"
            />
          </div>
          <Button
            type="submit"
            disabled={searchQuery.length < 2 || isLoading}
            className="h-14 px-8"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Search
              </>
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs font-bold text-gray-400 uppercase">
          Enter at least 2 characters to search
        </p>
      </form>

      {/* Error State */}
      {error && (
        <div className="mb-8 border-2 border-black bg-error p-4 font-bold text-white shadow-brutal-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{(error as Error).message || 'Failed to search users'}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {searchQuery.length >= 2 && !isLoading && users && (
        <>
          <div className="overflow-hidden border border-black bg-white shadow-brutal-lg">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-black bg-black text-white">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <User size={48} className="text-gray-300" />
                        <p className="text-sm font-bold text-gray-500 uppercase">No users found</p>
                        <p className="text-xs text-gray-400">Try a different search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-black last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link 
                          to="/admin/users/$id" 
                          params={{ id: user.id }}
                          className="flex items-center gap-3 hover:opacity-70"
                        >
                          <div className="h-10 w-10 shrink-0 border border-black bg-gray-100">
                            <div className="flex h-full w-full items-center justify-center font-black text-black">
                              {user.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          </div>
                          <span className="text-xs font-black uppercase">
                            {user.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-gray-600">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        {user.adminRole ? (
                          <span className="inline-flex items-center gap-1 border border-black bg-black px-2 py-1 text-[10px] font-black uppercase text-white shadow-brutal-xs">
                            <ShieldCheck size={12} />
                            {user.adminRole.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="inline-block border border-black bg-white px-2 py-1 text-[10px] font-black uppercase text-black shadow-brutal-xs">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.deletedAt ? (
                          <span className="inline-flex items-center gap-1 border border-black bg-error px-2 py-1 text-[10px] font-black uppercase text-white shadow-brutal-xs">
                            <Trash2 size={12} />
                            Deleted
                          </span>
                        ) : (
                          <span className="inline-block border border-black bg-success px-2 py-1 text-[10px] font-black uppercase text-black shadow-brutal-xs">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-gray-600">
                          {user.lastActive
                            ? new Date(user.lastActive).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {users.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs font-bold text-gray-500 uppercase">
                Showing results {offset + 1} - {offset + users.length}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={offset === 0}
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleNext}
                  disabled={users.length < limit}
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {searchQuery.length < 2 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Search size={64} className="mb-6 text-gray-200" />
          <p className="text-lg font-black uppercase text-gray-400">Enter a search term to find users</p>
        </div>
      )}
    </div>
  )
}
