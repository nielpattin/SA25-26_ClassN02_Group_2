import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Check, X, ShieldAlert, Calendar, User, Layout, Tag, Trash2, Eye } from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { useSession } from '../../api/auth'
import {
  usePendingSubmissions,
  useTakedownRequests,
  useApproveTemplate,
  useRejectTemplate,
  useRemoveTemplate,
  type Template,
  type TakedownRequest,
} from '../../hooks/useTemplates'

export const Route = createFileRoute('/admin/moderation')({
  component: ModerationComponent,
})

const PREDEFINED_REJECTION_REASONS = [
  'Inappropriate content',
  'Spam or misleading',
  'Copyright violation',
  'Low quality or incomplete',
  'Duplicate submission',
  'Other',
]

const TEMPLATE_CATEGORIES = [
  'All',
  'Software Development',
  'Marketing',
  'Sales',
  'HR',
  'Operations',
  'Personal',
  'Education',
  'Other',
]

function ModerationComponent() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'submissions' | 'takedowns'>('submissions')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionComment, setRejectionComment] = useState('')

  const { data: submissions, isLoading: isLoadingSubmissions } = usePendingSubmissions()
  const { data: takedowns, isLoading: isLoadingTakedowns } = useTakedownRequests()
  const approveMutation = useApproveTemplate()
  const rejectMutation = useRejectTemplate()
  const removeMutation = useRemoveTemplate()

  const adminRole = session?.user?.adminRole
  const isModeratorPlus = adminRole === 'super_admin' || adminRole === 'moderator'
  const isSupport = adminRole === 'support'

  const filteredSubmissions = submissions?.filter((template: Template) => {
    if (categoryFilter && categoryFilter !== 'All') {
      return template.categories?.includes(categoryFilter)
    }
    return true
  })

  const handleApprove = (id: string) => {
    approveMutation.mutate(id)
  }

  const handleReject = (id: string) => {
    if (!rejectionReason) return
    rejectMutation.mutate(
      { id, reason: rejectionReason, comment: rejectionComment || undefined },
      {
        onSuccess: () => {
          setSelectedTemplate(null)
          setRejectionReason('')
          setRejectionComment('')
        },
      }
    )
  }

  const handleRemove = (id: string) => {
    if (confirm('Are you sure you want to immediately remove this template?')) {
      removeMutation.mutate(id)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-black tracking-tighter text-black uppercase">
              Content Moderation
            </h1>
            <p className="mt-2 text-sm font-bold text-gray-500 uppercase">
              Review submissions and manage takedown requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-black" />
            <span className="text-xs font-black text-black uppercase">
              {adminRole?.replace('_', ' ') || 'Admin'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-black">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-6 py-3 text-xs font-black uppercase transition-all ${
              activeTab === 'submissions'
                ? 'border-b-2 border-black bg-black text-white'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Pending Submissions ({submissions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('takedowns')}
            className={`px-6 py-3 text-xs font-black uppercase transition-all ${
              activeTab === 'takedowns'
                ? 'border-b-2 border-black bg-black text-white'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Takedown Requests ({takedowns?.length || 0})
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-black bg-white px-3 py-1.5 text-xs font-bold uppercase focus:ring-2 focus:ring-black focus:outline-none"
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat === 'All' ? '' : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div>
            {isLoadingSubmissions ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-gray-500 uppercase">Loading submissions...</p>
              </div>
            ) : !filteredSubmissions || filteredSubmissions.length === 0 ? (
              <div className="border border-dashed border-black bg-black/5 py-24 text-center">
                <p className="text-xl font-black text-black uppercase opacity-50">
                  No pending submissions
                </p>
                <p className="mt-2 text-sm font-bold text-gray-500 uppercase">
                  All submissions have been reviewed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map((template: Template) => (
                  <div
                    key={template.id}
                    className="border-2 border-black bg-white shadow-brutal-sm"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            {template.categories?.map((c: string) => (
                              <span
                                key={c}
                                className="bg-black px-2 py-0.5 text-[9px] font-black text-white uppercase"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <h3 className="font-heading text-xl font-black text-black uppercase">
                            {template.name}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-gray-600 uppercase">
                            {template.description}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="text-[10px] font-black text-black uppercase">
                                {template.author?.name || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-[10px] font-black text-gray-500 uppercase">
                                Submitted {formatDate(template.submittedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Layout size={14} className="text-gray-400" />
                              <span className="text-[10px] font-black text-black uppercase">
                                {template.columnDefinitions?.length || 0} Columns
                              </span>
                            </div>
                            {template.defaultLabels && (
                              <div className="flex items-center gap-2">
                                <Tag size={14} className="text-gray-400" />
                                <span className="text-[10px] font-black text-black uppercase">
                                  {template.defaultLabels.length} Labels
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 flex-col gap-2">
                          {isModeratorPlus ? (
                            <>
                              {selectedTemplate === template.id ? (
                                <div className="w-80 border-2 border-black bg-gray-50 p-4">
                                  <p className="mb-2 text-xs font-black text-black uppercase">
                                    Select Rejection Reason
                                  </p>
                                  <select
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="mb-2 w-full border border-black bg-white px-2 py-1.5 text-xs focus:outline-none"
                                  >
                                    <option value="">Select a reason...</option>
                                    {PREDEFINED_REJECTION_REASONS.map((reason) => (
                                      <option key={reason} value={reason}>
                                        {reason}
                                      </option>
                                    ))}
                                  </select>
                                  <textarea
                                    value={rejectionComment}
                                    onChange={(e) => setRejectionComment(e.target.value)}
                                    placeholder="Optional comment..."
                                    className="mb-2 w-full resize-none border border-black bg-white px-2 py-1.5 text-xs focus:outline-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleReject(template.id)}
                                      disabled={!rejectionReason || rejectMutation.isPending}
                                      className="flex-1 bg-error px-3 py-1.5 text-xs font-black text-white uppercase transition-all hover:bg-error/80 disabled:opacity-50"
                                    >
                                      Confirm Reject
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedTemplate(null)
                                        setRejectionReason('')
                                        setRejectionComment('')
                                      }}
                                      className="border border-black bg-white px-3 py-1.5 text-xs font-black text-black uppercase transition-all hover:bg-gray-100"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleApprove(template.id)}
                                    disabled={approveMutation.isPending}
                                    className="flex items-center justify-center gap-2 border border-black bg-white px-4 py-2 text-xs font-black text-black uppercase transition-all hover:bg-green-50 disabled:opacity-50"
                                  >
                                    <Check size={14} className="text-green-600" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setSelectedTemplate(template.id)}
                                    disabled={rejectMutation.isPending}
                                    className="flex items-center justify-center gap-2 border border-black bg-white px-4 py-2 text-xs font-black text-black uppercase transition-all hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <X size={14} className="text-error" />
                                    Reject
                                  </button>
                                  <Link
                                    to="/templates/marketplace/$id"
                                    params={{ id: template.id }}
                                    className="flex items-center justify-center gap-2 border border-black bg-white px-4 py-2 text-xs font-black text-black uppercase transition-all hover:bg-gray-50"
                                  >
                                    <Eye size={14} />
                                    View
                                  </Link>
                                </>
                              )}
                            </>
                          ) : isSupport ? (
                            <div className="rounded border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                              Read Only
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Takedowns Tab */}
        {activeTab === 'takedowns' && (
          <div>
            {isLoadingTakedowns ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-gray-500 uppercase">Loading takedown requests...</p>
              </div>
            ) : !takedowns || takedowns.length === 0 ? (
              <div className="border border-dashed border-black bg-black/5 py-24 text-center">
                <p className="text-xl font-black text-black uppercase opacity-50">
                  No takedown requests
                </p>
                <p className="mt-2 text-sm font-bold text-gray-500 uppercase">
                  No templates pending removal
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {takedowns.map((template: TakedownRequest) => (
                  <div
                    key={template.id}
                    className="border-2 border-black bg-white shadow-brutal-sm"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="bg-error px-2 py-0.5 text-[9px] font-black text-white uppercase">
                              Takedown Requested
                            </span>
                            {template.categories?.map((c: string) => (
                              <span
                                key={c}
                                className="bg-black px-2 py-0.5 text-[9px] font-black text-white uppercase"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <h3 className="font-heading text-xl font-black text-black uppercase">
                            {template.name}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-gray-600 uppercase">
                            {template.description}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="text-[10px] font-black text-black uppercase">
                                {template.author?.name || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-[10px] font-black text-gray-500 uppercase">
                                Requested {formatDate(template.takedownRequestedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trash2 size={14} className="text-error" />
                              <span className="text-[10px] font-black text-error uppercase">
                                Scheduled {formatDate(template.takedownAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 flex-col gap-2">
                          {isModeratorPlus ? (
                            <>
                              <button
                                onClick={() => handleRemove(template.id)}
                                disabled={removeMutation.isPending}
                                className="flex items-center justify-center gap-2 border border-black bg-error px-4 py-2 text-xs font-black text-white uppercase transition-all hover:bg-error/80 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                Remove Now
                              </button>
                              <Link
                                to="/templates/marketplace/$id"
                                params={{ id: template.id }}
                                className="flex items-center justify-center gap-2 border border-black bg-white px-4 py-2 text-xs font-black text-black uppercase transition-all hover:bg-gray-50"
                              >
                                <Eye size={14} />
                                View
                              </Link>
                            </>
                          ) : isSupport ? (
                            <div className="rounded border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                              Read Only
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
