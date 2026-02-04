import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, User, Calendar, Copy, Layout, Tag, Shield, AlertCircle, MessageSquare, Trash2, Lock, Info } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { useMarketplaceTemplate, useBoardTemplate, useRequestTakedown } from '../hooks/useTemplates'
import { CloneTemplateModal } from '../components/templates/CloneTemplateModal'
import { useSession } from '../api/auth'

export const Route = createFileRoute('/templates/marketplace/$id')({
  component: TemplateDetailComponent,
})

function TemplateDetailComponent() {
  const { id } = Route.useParams()
  const { data: marketplaceTemplate, isLoading: isMarketplaceLoading } = useMarketplaceTemplate(id)
  const { data: boardTemplate, isLoading: isBoardLoading } = useBoardTemplate(id)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const { data: session } = useSession()
  const requestTakedown = useRequestTakedown()

  // Use marketplace template if available (approved), otherwise fall back to board template (for owners)
  const template = marketplaceTemplate || boardTemplate
  const isLoading = isMarketplaceLoading || isBoardLoading

  if (isLoading) {
    return <DashboardLayout><div>Loading template...</div></DashboardLayout>
  }

  if (!template) {
    return <DashboardLayout><div>Template not found</div></DashboardLayout>
  }

  const isOwner = session?.user?.id === template.author?.id
  const isRemoved = template.takedownAt && new Date(template.takedownAt) < new Date()

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

        {/* Owner status alerts */}
        {isOwner && (
          <>
            {/* Removed template alert */}
            {isRemoved && (
              <div className="mb-8 flex items-start gap-3 border-2 border-error bg-error/10 p-4">
                <Trash2 size={20} className="mt-0.5 shrink-0 text-error" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-error uppercase">Template Removed</span>
                  <p className="text-[10px] font-bold text-black uppercase opacity-60">
                    This template has been removed from the marketplace and is no longer visible to other users.
                  </p>
                </div>
              </div>
            )}

            {/* Pending/Rejected status alert */}
            {template.status !== 'approved' && !isRemoved && (
              <div className="mb-8 flex items-start gap-3 border-2 border-black bg-accent/10 p-4">
                <Shield size={20} className="mt-0.5 shrink-0 text-black" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-black uppercase">Submission Status: {template.status}</span>
                  <p className="text-[10px] font-bold text-black uppercase opacity-60">
                    {template.status === 'pending' ? 'Your template is currently being reviewed by an admin.' : 'Your template was rejected and is not visible in the marketplace.'}
                  </p>

                  {/* Show rejection reason and comment for rejected templates */}
                  {template.status === 'rejected' && (
                    <div className="mt-2 space-y-2">
                      {template.rejectionReason && (
                        <div className="flex items-start gap-2 rounded border border-black/20 bg-white/50 p-3">
                          <AlertCircle size={14} className="mt-0.5 shrink-0 text-error" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-500 uppercase">Rejection Reason</span>
                            <span className="text-xs font-bold text-black uppercase">{template.rejectionReason}</span>
                          </div>
                        </div>
                      )}
                      {template.rejectionComment && (
                        <div className="flex items-start gap-2 rounded border border-black/20 bg-white/50 p-3">
                          <MessageSquare size={14} className="mt-0.5 shrink-0 text-gray-500" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-500 uppercase">Moderator Comment</span>
                            <span className="text-xs font-bold text-black">{template.rejectionComment}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Takedown requested alert */}
            {template.takedownRequestedAt && !isRemoved && (
              <div className="mb-8 flex items-start gap-3 border-2 border-warning bg-warning/10 p-4">
                <Info size={20} className="mt-0.5 shrink-0 text-warning" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-warning uppercase">Takedown Requested</span>
                  <p className="text-[10px] font-bold text-black uppercase opacity-60">
                    You requested this template be removed from the marketplace.
                  </p>
                  {template.takedownAt && (
                    <p className="text-[10px] font-bold text-black uppercase">
                      Scheduled removal: {new Date(template.takedownAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Immutability notice for submitted templates */}
            {template.status !== 'none' && !isRemoved && (
              <div className="mb-8 flex items-start gap-3 border-2 border-gray-300 bg-gray-50 p-4">
                <Lock size={20} className="mt-0.5 shrink-0 text-gray-500" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-gray-600 uppercase">Template is Immutable</span>
                  <p className="text-[10px] font-bold text-black uppercase opacity-60">
                    Submitted templates cannot be edited. To make changes, submit a new version as a separate template.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h1 className="m-0 font-heading text-4xl font-black tracking-tighter text-black uppercase lg:text-6xl">
              {template.name}
            </h1>
            
            <div className="mt-6 flex flex-wrap gap-6 border-y-2 border-black py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center border border-black bg-accent">
                  <User size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] leading-none font-black text-gray-500 uppercase">Author</span>
                  <span className="text-sm font-black text-black uppercase">{template.author?.name || 'Kyte'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center border border-black bg-white">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] leading-none font-black text-gray-500 uppercase">Published</span>
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
                    <span className="text-[10px] leading-none font-black text-gray-500 uppercase">Category</span>
                    <span className="text-sm font-black text-black uppercase">{template.categories[0]}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-8 text-lg font-bold text-gray-600 uppercase">
              {template.description}
            </p>

            <div className="mt-12">
              <h3 className="mb-6 flex items-center gap-2 font-heading text-xl font-black text-black uppercase">
                <Layout size={20} />
                Structure Preview
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {template.columnDefinitions.map((col, i) => (
                  <div 
                    key={i}
                    className="flex flex-col border-2 border-black bg-white shadow-brutal-sm"
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
                <h3 className="mb-6 flex items-center gap-2 font-heading text-xl font-black text-black uppercase">
                  <Tag size={20} />
                  Included Labels
                </h3>
                <div className="flex flex-wrap gap-3">
                  {template.defaultLabels.map((label, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black text-black uppercase shadow-brutal-sm transition-all"
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
            <div className="border-2 border-black bg-white p-8 shadow-brutal-lg">
              <h4 className="mb-2 font-heading text-xs font-black text-gray-500 uppercase">Ready to start?</h4>
              <p className="mb-8 text-sm/tight font-bold text-black uppercase">
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

              {/* Takedown request button for approved templates (owner only) */}
              {isOwner && template.status === 'approved' && !template.takedownRequestedAt && (
                <>
                  <div className="my-6 border-t-2 border-gray-200" />
                  <div className="space-y-3">
                    <h4 className="font-heading text-xs font-black text-gray-500 uppercase">Template Management</h4>
                    <p className="text-[10px] font-bold text-black uppercase opacity-60">
                      Request to remove this template from the marketplace. The template will be scheduled for removal in 7 days.
                    </p>
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={() => {
                        if (confirm('Are you sure you want to request removal of this template from the marketplace?')) {
                          requestTakedown.mutate(template.id)
                        }
                      }}
                      disabled={requestTakedown.isPending}
                    >
                      <Trash2 size={16} />
                      {requestTakedown.isPending ? 'Requesting...' : 'Request Takedown'}
                    </Button>
                  </div>
                </>
              )}
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
