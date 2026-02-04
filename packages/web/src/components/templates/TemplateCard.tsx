import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { User, Layers } from 'lucide-react'
import type { Template } from '../../hooks/useTemplates'
import { Avatar } from '../ui/Avatar'

export interface TemplateCardProps {
  template: Template
}

export const TemplateCard = memo(({ template }: TemplateCardProps) => {
  return (
    <Link
      to="/templates/marketplace/$id"
      params={{ id: template.id }}
      className="group flex min-h-60 flex-col border border-black bg-surface shadow-brutal-md transition-all hover:-translate-x-1 hover:-translate-y-1 hover:bg-accent hover:shadow-brutal-xl"
    >
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="bg-black px-2 py-1 text-[10px] font-black text-white uppercase">
            {template.categories?.[0] || 'Uncategorized'}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
            <Layers size={12} />
            {template.columnDefinitions.length} Columns
          </div>
        </div>
        
        <h3 className="mb-2 font-heading text-xl font-extrabold text-black uppercase group-hover:underline">
          {template.name}
        </h3>
        
        <p className="line-clamp-3 text-sm font-medium text-gray-600 uppercase">
          {template.description || 'No description provided.'}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-black bg-black/5 p-4">
        <div className="flex items-center gap-2">
          {template.author?.image ? (
            <Avatar src={template.author.image} fallback={template.author.name || ''} size="sm" className="border border-black" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center border border-black bg-white">
              <User size={12} />
            </div>
          )}
          <span className="text-[10px] font-black text-black uppercase">
            {template.author?.name || 'Anonymous'}
          </span>
        </div>
      </div>
    </Link>
  )
})

TemplateCard.displayName = 'TemplateCard'
