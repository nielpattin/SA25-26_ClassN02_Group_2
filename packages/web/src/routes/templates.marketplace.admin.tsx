import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, X, ArrowLeft, Layout, Tag, User } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { usePendingSubmissions, useApproveTemplate, useRejectTemplate } from '../hooks/useTemplates'

export const Route = createFileRoute('/templates/marketplace/admin')({
  component: AdminReviewComponent,
})

function AdminReviewComponent() {
  const { data: submissions, isLoading } = usePendingSubmissions()
  const approveMutation = useApproveTemplate()
  const rejectMutation = useRejectTemplate()

  if (isLoading) {
    return <DashboardLayout><div>Loading submissions...</div></DashboardLayout>
  }

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

        <h1 className="font-heading m-0 text-4xl font-black tracking-tighter text-black uppercase lg:text-6xl">
          Review Submissions
        </h1>
        <p className="mt-4 text-lg font-bold text-gray-500 uppercase">
          Approve or reject community templates.
        </p>

        {!submissions || submissions.length === 0 ? (
          <div className="mt-12 border border-dashed border-black bg-black/5 py-24 text-center">
            <p className="text-xl font-black text-black uppercase opacity-50">No pending submissions</p>
          </div>
        ) : (
          <div className="mt-12 space-y-8">
            {submissions.map((template) => (
              <div 
                key={template.id}
                className="shadow-brutal-md flex flex-col border-2 border-black bg-white lg:flex-row"
              >
                <div className="flex-1 p-8">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {template.categories?.map(c => (
                      <span key={c} className="bg-black px-2 py-0.5 text-[9px] font-black text-white uppercase">{c}</span>
                    ))}
                  </div>
                  <h3 className="font-heading text-2xl font-black text-black uppercase">{template.name}</h3>
                  <p className="mt-2 text-sm font-bold text-gray-600 uppercase">{template.description}</p>
                  
                  <div className="mt-6 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-[10px] font-black text-black uppercase">{template.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layout size={14} className="text-gray-400" />
                      <span className="text-[10px] font-black text-black uppercase">{template.columnDefinitions.length} Columns</span>
                    </div>
                    {template.defaultLabels && (
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-gray-400" />
                        <span className="text-[10px] font-black text-black uppercase">{template.defaultLabels.length} Labels</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-px border-t border-black bg-black lg:w-48 lg:border-t-0 lg:border-l">
                  <button
                    onClick={() => approveMutation.mutate(template.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 bg-white px-6 py-4 text-xs font-black text-black uppercase transition-all hover:bg-accent disabled:opacity-50"
                  >
                    <Check size={16} className="text-green-600" />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({ id: template.id })}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 bg-white px-6 py-4 text-xs font-black text-black uppercase transition-all hover:bg-error/10 hover:text-error disabled:opacity-50"
                  >
                    <X size={16} className="text-error" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
