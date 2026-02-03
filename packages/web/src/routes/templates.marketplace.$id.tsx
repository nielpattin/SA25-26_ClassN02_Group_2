import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, User, Calendar, Copy, Layout, Tag, Shield } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { useMarketplaceTemplate } from '../hooks/useTemplates'
import { CloneTemplateModal } from '../components/templates/CloneTemplateModal'
import { useSession } from '../api/auth'

export const Route = createFileRoute('/templates/marketplace/$id')({
  component: TemplateDetailComponent,
})

function TemplateDetailComponent() {
  const { id } = Route.useParams()
  const { data: template, isLoading } = useMarketplaceTemplate(id)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const { data: session } = useSession()

  if (isLoading) {
    return <DashboardLayout><div>Loading template...</div></DashboardLayout>
  }

  if (!template) {
    return <DashboardLayout><div>Template not found</div></DashboardLayout>
  }

  const isOwner = session?.user?.id === template.author?.id

  return (
    <DashboardLayout>
      <div className="p-12 lg:px-16">
        <Link 
          to="/templates/marketplace"
          className="mb-8 flex items-center gap-2 text-xs font-black text-black uppercase hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Marketplace
        </Link>

        {isOwner && template.status !== 'approved' && (
          <div className="mb-8 flex items-center gap-3 border-2 border-black bg-accent/10 p-4">
            <Shield size={20} className="text-black" />
            <div className="flex flex-col">
              <span className="text-xs font-black text-black uppercase">Submission Status: {template.status}</span>
              <p className="text-[10px] font-bold text-black uppercase opacity-60">
                {template.status === 'pending' ? 'Your template is currently being reviewed by an admin.' : 'Your template was rejected and is not visible in the marketplace.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h1 className="font-heading m-0 text-4xl font-black tracking-tighter text-black uppercase lg:text-6xl">
              {template.name}
            </h1>
            
            <div className="mt-6 flex flex-wrap gap-6 border-y-2 border-black py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center border border-black bg-accent">
                  <User size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase leading-none">Author</span>
                  <span className="text-sm font-black text-black uppercase">{template.author?.name || 'Kyte'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center border border-black bg-white">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase leading-none">Published</span>
                  <span className="text-sm font-black text-black uppercase">
                    {new Date(template.approvedAt || template.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {template.categories && template.categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center border border-black bg-white">
                    <Tag size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-500 uppercase leading-none">Category</span>
                    <span className="text-sm font-black text-black uppercase">{template.categories[0]}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-8 text-lg font-bold text-gray-600 uppercase">
              {template.description}
            </p>

            <div className="mt-12">
              <h3 className="font-heading mb-6 flex items-center gap-2 text-xl font-black text-black uppercase">
                <Layout size={20} />
                Structure Preview
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {template.columnDefinitions.map((col, i) => (
                  <div 
                    key={i}
                    className="shadow-brutal-sm flex flex-col border-2 border-black bg-white"
                  >
                    <div className="border-b-2 border-black bg-black p-3 text-[11px] font-black text-white uppercase">
                      {col.name}
                    </div>
                    <div className="flex flex-col gap-2 p-3 opacity-50">
                      <div className="h-4 w-3/4 bg-gray-200" />
                      <div className="h-4 w-1/2 bg-gray-200" />
                      <div className="h-4 w-2/3 bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {template.defaultLabels && template.defaultLabels.length > 0 && (
              <div className="mt-12">
                <h3 className="font-heading mb-6 flex items-center gap-2 text-xl font-black text-black uppercase">
                  <Tag size={20} />
                  Included Labels
                </h3>
                <div className="flex flex-wrap gap-3">
                  {template.defaultLabels.map((label, i) => (
                    <div 
                      key={i}
                      className="shadow-brutal-sm flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black text-black uppercase transition-all"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-8 lg:w-80">
            <div className="shadow-brutal-lg border-2 border-black bg-white p-8">
              <h4 className="font-heading mb-2 text-xs font-black text-gray-500 uppercase">Ready to start?</h4>
              <p className="mb-8 text-sm font-bold text-black uppercase leading-tight">
                Click below to clone this template into one of your workspaces.
              </p>
              <Button 
                fullWidth 
                size="lg"
                onClick={() => setIsCloneModalOpen(true)}
              >
                <Copy size={18} />
                Clone this Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CloneTemplateModal 
        template={template}
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
      />
    </DashboardLayout>
  )
}
