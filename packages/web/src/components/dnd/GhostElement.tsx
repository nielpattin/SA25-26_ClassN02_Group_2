import { forwardRef, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export type ColumnGhostProps = {
  name: string
  cardCount: number
}

export const ColumnGhost = forwardRef<HTMLDivElement, ColumnGhostProps>(function ColumnGhost(
  { name, cardCount },
  ref
) {
  return (
    <div
      className="bg-surface shadow-brutal-2xl! pointer-events-none fixed top-0 left-0 z-1000 w-(--board-column-width,300px) rounded-none border border-black p-(--column-padding,16px) opacity-80 will-change-transform"
      ref={ref}
    >
      <h4 className="font-heading relative mb-5 flex shrink-0 items-center gap-2.5 border-b border-black p-2 text-(length:--column-header-size,14px) font-extrabold tracking-widest text-black uppercase">
        <span className="flex-1 cursor-text truncate">{name}</span>
        <span className="bg-accent ml-auto border border-black px-2 py-0.5 text-[11px] font-extrabold">
          {cardCount}
        </span>
        <MoreHorizontal size={14} className="text-text-muted cursor-pointer" />
      </h4>
    </div>
  )
})

ColumnGhost.displayName = 'ColumnGhost'

export type CardGhostProps = {
  children: ReactNode
}

export const CardGhost = forwardRef<HTMLDivElement, CardGhostProps>(function CardGhost(
  { children },
  ref
) {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-1000 w-[calc(var(--board-column-width,300px)-48px)] opacity-90 will-change-transform"
      ref={ref}
    >
      <div className="shadow-brutal-2xl! rotate-2 border border-black">{children}</div>
    </div>
  )
})

CardGhost.displayName = 'CardGhost'

// Convenience wrapper that uses context refs
export type GhostElementProps = {
  type: 'column' | 'card'
  columnName?: string
  cardCount?: number
  cardContent?: ReactNode
}
