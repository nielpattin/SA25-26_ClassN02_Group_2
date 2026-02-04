import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'

export interface BoardCardProps {
  board: {
    id: string
    name: string
  }
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export const BoardCard = memo(({ board, onDelete, isDeleting }: BoardCardProps) => {
  return (
    <Link
      to="/board/$boardId"
      params={{ boardId: board.id.toString() }}
      className="group flex min-h-40 flex-col justify-between border border-black bg-surface p-8 shadow-brutal-md transition-all hover:-translate-x-1 hover:-translate-y-1 hover:bg-accent hover:shadow-brutal-xl"
    >
      <h3 className="m-0 font-heading text-lg font-extrabold text-black uppercase">{board.name}</h3>
      <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(board.id)
          }}
          disabled={isDeleting}
          className="border border-black bg-white p-2 text-black transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
          title="Delete Board"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Link>
  )
})

BoardCard.displayName = 'BoardCard'
