import { memo, type ReactNode } from 'react'

export interface BoardGridProps {
  children: ReactNode
  isEmpty?: boolean
  emptyMessage?: string
}

export const BoardGrid = memo(({ children, isEmpty, emptyMessage = 'No boards found. Start by adding one above.' }: BoardGridProps) => {
  if (isEmpty) {
    return (
      <div className="text-text-subtle col-span-full border border-dashed border-black bg-black/5 p-12 text-center font-bold uppercase">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
})

BoardGrid.displayName = 'BoardGrid'
