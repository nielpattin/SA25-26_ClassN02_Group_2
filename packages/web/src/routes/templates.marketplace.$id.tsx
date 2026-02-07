import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { 
  ArrowLeft, User, Calendar, Copy, Layout, Tag, Shield, 
  AlertCircle, MessageSquare, Trash2, Lock, Info, 
  Check, X, History, ShieldCheck, Flag, Activity,
  ChevronRight, ListTodo, Hash, Clock, Fingerprint
} from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { useMarketplaceTemplate, useBoardTemplate, useRequestTakedown, useApproveTemplate, useRejectTemplate, useRemoveTemplate } from '../hooks/useTemplates'
import { useUserDetail, useAuditLogs } from '../hooks/useAdmin'
import { CloneTemplateModal } from '../components/templates/CloneTemplateModal'
import { useSession } from '../api/auth'

export const Route = createFileRoute('/templates/marketplace/$id')({
  component: TemplateDetailComponent,
})

const PREDEFINED_REJECTION_REASONS = [
  'Inappropriate content',
  'Spam or misleading',
  'Copyright violation',
  'Low quality or incomplete',
  'Duplicate submission',
  'Other',
]

function TemplateDetailComponent() {
  const { id } = Route.useParams()
  const { data: marketplaceTemplate, isLoading: isMarketplaceLoading } = useMarketplaceTemplate(id)
  const { data: boardTemplate, isLoading: isBoardLoading } = useBoardTemplate(id)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionComment, setRejectionComment] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Template['columnDefinitions'][number]['tasks'][number] | null>(null)
  const { data: session } = useSession()
  
  const approveMutation = useApproveTemplate()
  const rejectMutation = useRejectTemplate()
  const removeMutation = useRemoveTemplate()
  const requestTakedown = useRequestTakedown()

  const template = marketplaceTemplate || boardTemplate
  const isLoading = isMarketplaceLoading || isBoardLoading

  const { data: authorDetail } = useUserDetail(template?.author?.id || '')
  const { data: auditLogs } = useAuditLogs({ targetType: 'template', targetId: id })

  if (isLoading) {
    return <DashboardLayout><div>Loading template...</div></DashboardLayout>
  }

  if (!template) {
    return <DashboardLayout><div>Template not found</div></DashboardLayout>
  }

  const isOwner = session?.user?.id === template.author?.id
  const adminRole = session?.user?.adminRole
  const isModerator = !!adminRole
  const canPerformModeration = adminRole === 'super_admin' || adminRole === 'moderator'
  const isRemoved = template.takedownAt && new Date(template.takedownAt) < new Date()

  const handleApprove = () => {
    approveMutation.mutate(id)
  }

  const handleReject = () => {
    if (!rejectionReason) return
    rejectMutation.mutate({ id, reason: rejectionReason, comment: rejectionComment }, {
      onSuccess: () => {
        setShowRejectForm(false)
        setRejectionReason('')
        setRejectionComment('')
      }
    })
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] w-full min-h-screen bg-canvas overflow-hidden">
        
        {/* Main Review Area */}
        <div className="min-w-0 p-6 lg:p-8 overflow-y-auto border-r-2 border-black/5">
          <Link 
            to="/templates/marketplace"
            className="mb-6 inline-flex items-center gap-2 text-[10px] font-black text-black uppercase hover:bg-black hover:text-white px-2 py-1 transition-colors"
          >
            <ArrowLeft size={10} strokeWidth={4} />
            Back
          </Link>

          {isModerator && template.status === 'pending' && (
            <div className="mb-8 flex items-center gap-3 border-2 border-black bg-accent p-3 text-black">
              <Flag size={14} className="text-black" />
              <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Moderation</span>
              <span className="text-[9px] font-bold text-black/40 uppercase ml-auto">ID: {id.slice(0, 8)}</span>
            </div>
          )}

          <div className="max-w-4xl">
            <h1 className="m-0 font-heading text-4xl font-black tracking-tight text-black uppercase lg:text-5xl leading-none">
              {template.name}
            </h1>
            
            <div className="mt-6 flex flex-wrap gap-6 border-y-2 border-black py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-white">
                  <User size={12} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase leading-none">Author</span>
                  <span className="text-[10px] font-black text-black uppercase leading-none mt-1">{template.author?.name || 'Kyte'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-white">
                  <Calendar size={12} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase leading-none">Status</span>
                  <span className="text-[10px] font-black text-black uppercase leading-none mt-1">{template.status}</span>
                </div>
              </div>

              {template.categories && template.categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-white">
                    <Tag size={12} strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase leading-none">Category</span>
                    <span className="text-[10px] font-black text-black uppercase leading-none mt-1">{template.categories[0]}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-6 text-sm font-bold text-gray-600 uppercase leading-relaxed max-w-2xl">
              {template.description}
            </p>

            {/* Board Structure Preview */}
            <div className="mt-12">
              <h3 className="mb-4 flex items-center gap-2 font-heading text-sm font-black text-black uppercase tracking-tight">
                <Layout size={16} />
                Structure Preview
              </h3>
              
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-black">
                <div className="flex gap-4 min-w-max pr-8">
                  {template.columnDefinitions.map((col, i) => (
                    <div 
                      key={i}
                      className="flex w-56 flex-col border-2 border-black bg-white shadow-brutal-xs"
                    >
                      <div className="border-b-2 border-black bg-black p-2 text-[9px] font-black text-white uppercase flex justify-between items-center tracking-widest">
                        {col.name}
                        <span className="bg-white text-black px-1.5 py-0.5 text-[8px] font-black leading-none">{col.tasks?.length || 0}</span>
                      </div>
                      <div className="flex flex-col gap-2 p-2 min-h-[300px]">
                        {col.tasks && col.tasks.length > 0 ? (
                          col.tasks.map((task, ti) => (
                            <div 
                              key={ti} 
                              className="group cursor-pointer border-2 border-black bg-white p-3 shadow-brutal-xs transition-all hover:bg-canvas"
                              onClick={() => setSelectedTask(task)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[9px] font-black uppercase leading-tight">{task.title}</h4>
                                <ChevronRight size={10} strokeWidth={3} className="opacity-30 group-hover:opacity-100 shrink-0" />
                              </div>
                              
                              {task.labelNames && task.labelNames.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {task.labelNames.map((ln, li) => {
                                    const labelDef = template.defaultLabels?.find(ld => ld.name === ln)
                                    return (
                                      <div 
                                        key={li} 
                                        className="h-1 w-5 border border-black shadow-[1px_1px_0px_black]" 
                                        style={{ backgroundColor: labelDef?.color || '#ccc' }}
                                      />
                                    )
                                  })}
                                </div>
                              )}

                              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2">
                                <div className="flex items-center gap-1.5">
                                  {task.priority && task.priority !== 'none' && (
                                    <div className="text-[7px] font-black uppercase text-black bg-gray-50 px-1 py-0.5 border border-black leading-none">
                                      {task.priority[0]}
                                    </div>
                                  )}
                                  {task.checklists && task.checklists.length > 0 && (
                                    <div className="flex items-center gap-0.5 text-[7px] font-black text-black leading-none">
                                      <ListTodo size={8} strokeWidth={3} />
                                      {task.checklists.reduce((acc, c) => acc + c.items.length, 0)}
                                    </div>
                                  )}
                                </div>
                                {task.size && (
                                  <div className="text-[7px] font-black uppercase text-gray-400 leading-none">
                                    {task.size}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center opacity-10 border-2 border-dashed border-black m-1 bg-black/5">
                             <Layout size={20} className="mb-1" />
                             <span className="text-[7px] font-black uppercase tracking-widest leading-none">Empty</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Author Analytics */}
            {isModerator && (
              <div className="mt-20 space-y-12 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 font-heading text-sm font-black text-black uppercase tracking-tight">
                      <ShieldCheck size={16} />
                      Reputation Profile
                    </h3>
                    <div className="border-2 border-black bg-white p-4 shadow-brutal-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border-l-2 border-black pl-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Existence</span>
                          <p className="text-xs font-black uppercase mt-0.5">
                            {authorDetail?.createdAt ? `${Math.floor((Date.now() - new Date(authorDetail.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d` : 'N/A'}
                          </p>
                        </div>
                        <div className="border-l-2 border-black pl-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fleet Size</span>
                          <p className="text-xs font-black uppercase mt-0.5">{authorDetail?.boardsCount || 0} boards</p>
                        </div>
                        <div className="border-l-2 border-black pl-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Authority</span>
                          <p className="text-xs font-black uppercase mt-0.5">{authorDetail?.adminRole || 'STANDARD'}</p>
                        </div>
                        <div className="border-l-2 border-black pl-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Verified</span>
                          <p className="text-xs font-black uppercase mt-0.5 text-green-500">YES</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 flex items-center gap-2 font-heading text-sm font-black text-black uppercase tracking-tight">
                      <History size={16} />
                      Administrative Log
                    </h3>
                    <div className="border-2 border-black bg-white shadow-brutal-xs overflow-hidden max-h-40 overflow-y-auto">
                      {auditLogs && auditLogs.length > 0 ? (
                        <table className="w-full border-collapse text-left">
                          <thead className="sticky top-0 border-b-2 border-black bg-gray-50 z-10">
                            <tr>
                              <th className="p-2 text-[8px] font-black uppercase text-gray-400">Action</th>
                              <th className="p-2 text-[8px] font-black uppercase text-gray-400">Moderator</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="border-b border-black/5 last:border-0 hover:bg-canvas transition-colors">
                                <td className="p-2">
                                  <span className={`px-1 py-0.5 text-[7px] font-black uppercase border border-black ${log.action.includes('approved') ? 'bg-green-400' : 'bg-red-400 text-white'}`}>
                                    {log.action.split('.')[1]}
                                  </span>
                                </td>
                                <td className="p-2 text-[9px] font-black uppercase truncate">{log.adminName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center opacity-20">
                          <p className="text-[8px] font-black uppercase tracking-widest">No previous actions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <aside className="xl:w-[300px] xl:shrink-0 p-6 xl:sticky xl:top-0 xl:h-screen bg-white border-l-2 border-black flex flex-col gap-6 overflow-y-auto scrollbar-none z-10 shadow-brutal-sm">
          
          {/* User Controls */}
          <div className="border-2 border-black bg-white p-4 shadow-brutal-sm">
            <h4 className="mb-2 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Consumer Tools</h4>
            <Button
              fullWidth
              size="sm"
              onClick={() => setIsCloneModalOpen(true)}
              className="py-3 border-2 font-black text-[10px]"
            >
              <Copy size={12} className="mr-2" strokeWidth={4} />
              Clone structure
            </Button>
          </div>

          {/* Admin Moderation Panel - LIGHT THEME */}
          {isModerator && (
            <div className="border-2 border-black bg-white p-5 text-black shadow-brutal-sm flex-1 flex flex-col">
              <div className="mb-6 flex items-center justify-between border-b-2 border-black/10 pb-3">
                <h4 className="font-heading text-xs font-black uppercase tracking-tighter text-black">Moderator Console</h4>
                <Shield size={14} className="text-black" />
              </div>

              <div className="space-y-6 flex-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Status</span>
                  <div className={`text-2xl font-black uppercase tracking-tighter text-center ${template.status === 'pending' ? 'text-accent' : template.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>
                    {template.status}
                  </div>
                </div>

                {canPerformModeration && template.status === 'pending' && (
                  <div className="space-y-4 pt-6 border-t-2 border-black/10">
                    {!showRejectForm ? (
                      <div className="flex flex-col gap-2.5">
                        <button
                          className="flex w-full items-center justify-center gap-2 border-2 border-black bg-black py-3 text-[10px] font-black text-white uppercase transition-all hover:bg-accent hover:text-black hover:shadow-brutal-xs"
                          onClick={handleApprove}
                          disabled={approveMutation.isPending}
                        >
                          <Check size={14} strokeWidth={4} />
                          Approve
                        </button>
                        <button
                          className="flex w-full items-center justify-center gap-2 border-2 border-red-500 bg-transparent py-3 text-[10px] font-black text-red-500 uppercase transition-all hover:bg-red-500 hover:text-white"
                          onClick={() => setShowRejectForm(true)}
                          disabled={rejectMutation.isPending}
                        >
                          <X size={14} strokeWidth={4} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-black uppercase text-red-500 tracking-widest">Reason</label>
                          <select 
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full border-2 border-black bg-white p-2 text-[9px] font-black uppercase text-black focus:outline-none focus:border-accent appearance-none cursor-pointer"
                          >
                            <option value="">Select...</option>
                            {PREDEFINED_REJECTION_REASONS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Feedback</label>
                          <textarea 
                            value={rejectionComment}
                            onChange={(e) => setRejectionComment(e.target.value)}
                            placeholder="Message for author..."
                            className="w-full resize-none border-2 border-black bg-white p-2 text-[9px] font-bold text-black placeholder:text-gray-300 focus:outline-none focus:border-accent"
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleReject}
                            disabled={!rejectionReason || rejectMutation.isPending}
                            className="flex-1 bg-red-500 py-2.5 text-[9px] font-black uppercase text-white hover:bg-red-600 shadow-brutal-xs disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setShowRejectForm(false)}
                            className="flex-1 border-2 border-black py-2.5 text-[9px] font-black uppercase text-black hover:bg-gray-50 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Task Inspector - LIGHT THEME */}
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 p-4 backdrop-blur-[2px]" onClick={() => setSelectedTask(null)}>
            <div className="w-full max-w-xl border-4 border-black bg-white shadow-brutal-lg animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header - LIGHT */}
              <div className="flex items-center justify-between border-b-4 border-black bg-white p-4 text-black">
                <div className="flex items-center gap-3">
                  <Fingerprint size={16} className="text-accent" strokeWidth={3} />
                  <div className="flex flex-col">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] leading-none">Card Inspector</h2>
                    <span className="text-[7px] font-bold text-gray-400 uppercase mt-1">Deep Review Protocol</span>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="hover:bg-accent p-1 transition-colors border-2 border-black shadow-brutal-xs">
                  <X size={16} strokeWidth={4} />
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Left Side: Content */}
                <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-black border-r-2 border-black/5">
                  <div className="mb-4 flex items-center gap-2">
                    <Hash size={12} className="text-gray-300" strokeWidth={3} />
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Entry UID_7554F677</span>
                  </div>

                  <h3 className="mb-6 font-heading text-4xl font-black uppercase tracking-tight text-black leading-[0.9]">
                    {selectedTask.title}
                  </h3>

                  <div className="mb-10 space-y-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Activity size={10} strokeWidth={3} />
                        Operational Data
                      </span>
                      {selectedTask.description ? (
                        <p className="text-[11px] font-bold text-black uppercase leading-relaxed border-l-4 border-accent pl-5 py-2 bg-accent/5">
                          {selectedTask.description}
                        </p>
                      ) : (
                        <div className="py-4 border-2 border-dashed border-gray-100 text-center">
                           <p className="text-[9px] font-black italic text-gray-200 uppercase tracking-widest">NULL PAYLOAD</p>
                        </div>
                      )}
                    </div>

                    {selectedTask.checklists && selectedTask.checklists.length > 0 && (
                      <div className="space-y-6">
                        {selectedTask.checklists.map((cl, i) => (
                          <div key={i} className="border-2 border-black p-4 bg-white shadow-brutal-xs">
                            <h4 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-black border-b-2 border-black pb-2">
                              <ListTodo size={12} strokeWidth={3} className="text-accent" />
                              {cl.title}
                            </h4>
                            <div className="space-y-2">
                              {cl.items.map((item, ii) => (
                                <div key={ii} className="flex items-center gap-3 group">
                                  <div className={`h-4 w-4 border-2 border-black flex-shrink-0 transition-all ${item.isCompleted ? 'bg-black' : 'bg-white group-hover:bg-accent/10'}`}>
                                    {item.isCompleted && <Check size={12} strokeWidth={5} className="text-white mx-auto" />}
                                  </div>
                                  <span className={`text-[10px] font-black uppercase tracking-tight ${item.isCompleted ? 'text-gray-300 line-through' : 'text-black'}`}>
                                    {item.content}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Attributes */}
                <div className="w-full md:w-56 bg-gray-50 p-8 flex flex-col gap-8">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Priority</span>
                      <div className={`text-[10px] font-black uppercase border-2 border-black p-2 text-center shadow-brutal-xs ${selectedTask.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                        {selectedTask.priority || 'NONE'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Estimate</span>
                      <div className="text-[10px] font-black uppercase border-2 border-black p-2 text-center bg-white shadow-brutal-xs">
                        {selectedTask.size || 'UNSIZED'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Labels</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTask.labelNames?.map((ln: string) => {
                          const labelDef = template.defaultLabels?.find(ld => ld.name === ln)
                          return (
                            <div 
                              key={ln}
                              className="border border-black px-2 py-0.5 text-[7px] font-black uppercase shadow-[1px_1px_0px_black]"
                              style={{ backgroundColor: labelDef?.color || '#ccc' }}
                            >
                              {ln}
                            </div>
                          )
                        })}
                        {(!selectedTask.labelNames || selectedTask.labelNames.length === 0) && (
                           <span className="text-[7px] font-black text-gray-200 uppercase">NO LABELS</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-black/10 flex flex-col gap-4">
                    <div className="flex items-center gap-2 opacity-20">
                      <Clock size={10} strokeWidth={3} />
                      <span className="text-[8px] font-black uppercase tracking-tight">Audit Ready</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={() => setSelectedTask(null)}
                      className="w-full py-3 border-2 border-black font-black text-[9px] uppercase shadow-brutal-xs bg-white text-black hover:bg-black hover:text-white"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CloneTemplateModal 
        template={template}
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
      />
    </DashboardLayout>
  )
}
