import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { MarketplaceFilterBar } from '../components/templates/MarketplaceFilterBar'
import { TemplateCard } from '../components/templates/TemplateCard'
import { useMarketplaceTemplates } from '../hooks/useTemplates'
import { useDebounce } from '../hooks/useDebounce'
import { useSession } from '../api/auth'

export const Route = createFileRoute('/templates/marketplace/')({
  component: MarketplaceComponent,
  validateSearch: (search: Record<string, unknown>): MarketplaceSearch => {
    const q = typeof search.q === 'string' ? search.q : undefined
    const category = typeof search.category === 'string' ? search.category : undefined
    const sort = typeof search.sort === 'string' && ['newest', 'popular', 'alphabetical'].includes(search.sort) 
      ? (search.sort as 'newest' | 'popular' | 'alphabetical') 
      : undefined
    const page = typeof search.page === 'number' ? search.page : typeof search.page === 'string' ? Number(search.page) : undefined

    return { q, category, sort, page }
  },
})

const CATEGORIES = [
  'Engineering',
  'Design',
  'Project Management',
  'Productivity',
  'Agile',
  'Personal',
  'Sales',
  'Marketing',
]

const LIMIT = 12

type MarketplaceSearch = { 
  q?: string 
  category?: string 
  sort?: 'newest' | 'popular' | 'alphabetical' 
  page?: number 
}

function MarketplaceComponent() {
  const { q, category, sort, page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: session } = useSession()
  
  const isAdmin = useMemo(() => {
    const adminEmails = ['test@kyte.dev', 'test-00000000-0000-4000-a000-000000000001@example.com']
    const email = session?.user?.email
    return email && adminEmails.includes(email)
  }, [session])

  const [searchQuery, setSearchQuery] = useState(q || '')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const queryParams = useMemo(() => ({
    q: debouncedSearch || undefined,
    category: category || undefined,
    sort: sort || 'newest',
    limit: LIMIT,
    offset: ((page || 1) - 1) * LIMIT,
  }), [debouncedSearch, category, sort, page])

  const { data: templates, isLoading } = useMarketplaceTemplates(queryParams)

  const updateSearch = (newParams: Partial<MarketplaceSearch>) => {
    navigate({
      search: (prev: MarketplaceSearch) => {
        const next = { ...prev, ...newParams }
        if (newParams.q !== undefined || newParams.category !== undefined || newParams.sort !== undefined) {
          next.page = undefined
        }
        return next
      },
    })
  }

  return (
    <DashboardLayout>
      <div className="p-12 lg:px-16">
        <header className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="m-0 font-heading text-[40px] font-black tracking-tighter text-black uppercase lg:text-[64px]">
              Template Market
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold text-gray-500 uppercase">
              Jumpstart your workflow with community-crafted board templates.
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/templates/marketplace/admin"
              className="flex items-center justify-center gap-2 border-2 border-black bg-white px-6 py-3 text-xs font-black text-black uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:shadow-brutal-md"
            >
              <ShieldCheck size={16} />
              Review Submissions
            </Link>
          )}
        </header>

        <MarketplaceFilterBar
          search={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val)
            updateSearch({ q: val })
          }}
          category={category || ''}
          onCategoryChange={(val) => updateSearch({ category: val })}
          sort={sort || 'newest'}
          onSortChange={(val: string) => {
            if (val === 'newest' || val === 'popular' || val === 'alphabetical') {
              updateSearch({ sort: val })
            }
          }}
          categories={CATEGORIES}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-60 animate-pulse border border-black bg-black/5 shadow-brutal-md" />
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
            
            <div className="mt-16 flex items-center justify-center gap-4">
              <button
                disabled={(page || 1) <= 1}
                onClick={() => updateSearch({ page: (page || 1) - 1 })}
                className="flex items-center justify-center rounded-none border border-black bg-white px-6 py-3 text-sm font-black text-black uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:shadow-brutal-md disabled:opacity-30"
              >
                Previous
              </button>
              <div className="font-heading text-lg font-black text-black uppercase">
                Page {page || 1}
              </div>
              <button
                disabled={templates.length < LIMIT}
                onClick={() => updateSearch({ page: (page || 1) + 1 })}
                className="flex items-center justify-center rounded-none border border-black bg-white px-6 py-3 text-sm font-black text-black uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:shadow-brutal-md disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center border border-dashed border-black bg-black/5 py-32 text-center">
            <p className="text-xl font-black text-black uppercase">No templates found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('')
                updateSearch({ q: '', category: '', sort: 'newest', page: 1 })
              }}
              className="mt-6 font-bold text-black uppercase underline hover:no-underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
