import { memo } from 'react'
import { Search, Filter, SortDesc } from 'lucide-react'

export interface MarketplaceFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  categories: string[]
}

export const MarketplaceFilterBar = memo(({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  categories
}: MarketplaceFilterBarProps) => {
  return (
    <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-1 flex-col gap-2">
        <label className="text-xs font-black text-black uppercase">Search Templates</label>
        <div className="relative">
          <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-black" size={18} />
          <input
            type="text"
            placeholder="Find your perfect board..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="font-heading shadow-brutal-md focus:bg-accent w-full rounded-none border border-black bg-white py-3 pr-4 pl-12 text-sm font-extrabold tracking-wider text-black uppercase transition-all outline-none focus:-translate-x-0.5 focus:-translate-y-0.5"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 lg:flex-nowrap">
        <div className="flex flex-col gap-2 min-w-40">
          <label className="text-xs font-black text-black uppercase">Category</label>
          <div className="relative">
            <Filter className="absolute top-1/2 left-4 -translate-y-1/2 text-black pointer-events-none" size={16} />
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="font-heading shadow-brutal-sm focus:bg-accent w-full appearance-none rounded-none border border-black bg-white py-2 pr-10 pl-10 text-xs font-extrabold tracking-wider text-black uppercase transition-all outline-none focus:-translate-x-0.5 focus:-translate-y-0.5"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-40">
          <label className="text-xs font-black text-black uppercase">Sort By</label>
          <div className="relative">
            <SortDesc className="absolute top-1/2 left-4 -translate-y-1/2 text-black pointer-events-none" size={16} />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="font-heading shadow-brutal-sm focus:bg-accent w-full appearance-none rounded-none border border-black bg-white py-2 pr-10 pl-10 text-xs font-extrabold tracking-wider text-black uppercase transition-all outline-none focus:-translate-x-0.5 focus:-translate-y-0.5"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
})

MarketplaceFilterBar.displayName = 'MarketplaceFilterBar'
