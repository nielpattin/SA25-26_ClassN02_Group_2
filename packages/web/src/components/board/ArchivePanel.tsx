import { useState } from 'react'
import { X, Archive, Columns, ListTodo, RotateCcw, Trash2 } from 'lucide-react'
import { 
  useBoardArchive, 
  useRestoreColumn, 
  usePermanentDeleteColumn, 
  useRestoreTask, 
  usePermanentDeleteTask 
} from '../../hooks/useArchive'
import { useBoardMembers } from '../../hooks/useAssignees'
import { useSession } from '../../api/auth'
import { format } from 'date-fns'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'

interface ArchivePanelProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
}

export function ArchivePanel({ isOpen, onClose, boardId }: ArchivePanelProps) {
  const { data: archive, isLoading } = useBoardArchive(boardId)
  const { data: session } = useSession()
  const { data: members = [] } = useBoardMembers(boardId)
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'column' | 'task' } | null>(null)

  const restoreColumn = useRestoreColumn(boardId)
  const permanentDeleteColumn = usePermanentDeleteColumn(boardId)
  const restoreTask = useRestoreTask(boardId)
  const permanentDeleteTask = usePermanentDeleteTask(boardId)

  const myMembership = members.find(m => m.userId === session?.user?.id)
  const canManage = myMembership?.role === 'admin'

  const handleDelete = async () => {
    if (!itemToDelete) return
    
    try {
      if (itemToDelete.type === 'column') {
        await permanentDeleteColumn.mutateAsync(itemToDelete.id)
      } else {
        await permanentDeleteTask.mutateAsync(itemToDelete.id)
      }
      setItemToDelete(null)
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside 
        className={`shadow-brutal-xl fixed top-0 right-0 z-50 h-screen w-80 border-l border-black bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black p-4">
            <div className="flex items-center gap-2">
              <Archive size={18} />
              <h2 className="font-heading text-sm font-bold tracking-tight uppercase">Board Archive</h2>
            </div>
            <button 
              onClick={onClose}
              className="hover:bg-accent shadow-brutal-sm cursor-pointer border border-black p-1 transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-none"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-8 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Loading archive...</p>
              </div>
            ) : (
              <>
                {/* Columns Section */}
                <section>
                  <div className="mb-4 flex items-center gap-2 border-b border-black pb-1">
                    <Columns size={14} className="text-gray-400" />
                    <h3 className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">Archived Columns</h3>
                  </div>
                  {archive?.columns && archive.columns.length > 0 ? (
                    <div className="space-y-3">
                      {archive.columns.map((column) => (
                        <div key={column.id} className="shadow-brutal-sm border border-black bg-white p-3">
                          <div className="flex items-start justify-between">
                            <div className="overflow-hidden">
                              <p className="truncate text-xs font-bold uppercase">{column.name}</p>
                              <p className="mt-1 text-[9px] font-medium text-gray-500 uppercase">
                                Archived {column.archivedAt ? format(new Date(column.archivedAt), 'MMM d, yyyy') : 'Recently'}
                              </p>
                            </div>
                            {column.tasksCount !== undefined && column.tasksCount > 0 && (
                              <span className="shrink-0 bg-black px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                                {column.tasksCount} {column.tasksCount === 1 ? 'Task' : 'Tasks'}
                              </span>
                            )}
                          </div>
                          
                          {canManage && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-[9px]"
                                onClick={() => restoreColumn.mutate(column.id)}
                                disabled={restoreColumn.isPending}
                              >
                                <RotateCcw size={12} />
                                Restore
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-7 text-[9px]"
                                onClick={() => setItemToDelete({ id: column.id, name: column.name, type: 'column' })}
                              >
                                <Trash2 size={12} />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-gray-300 uppercase italic">No archived columns</p>
                  )}
                </section>

                {/* Tasks Section */}
                <section>
                  <div className="mb-4 flex items-center gap-2 border-b border-black pb-1">
                    <ListTodo size={14} className="text-gray-400" />
                    <h3 className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">Archived Tasks</h3>
                  </div>
                  {archive?.tasks && archive.tasks.length > 0 ? (
                    <div className="space-y-3">
                      {archive.tasks.map((task) => (
                        <div key={task.id} className="shadow-brutal-sm border border-black bg-white p-3">
                          <div className="flex items-start justify-between">
                            <div className="overflow-hidden">
                              <p className="truncate text-xs font-bold uppercase">{task.title}</p>
                              <p className="mt-1 text-[9px] font-medium text-gray-500 uppercase">
                                From <span className="font-bold text-black">{task.columnName || 'Unknown'}</span> • {task.archivedAt ? format(new Date(task.archivedAt), 'MMM d, yyyy') : 'Recently'}
                              </p>
                            </div>
                          </div>

                          {canManage && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-[9px]"
                                onClick={() => restoreTask.mutate(task.id)}
                                disabled={restoreTask.isPending}
                              >
                                <RotateCcw size={12} />
                                Restore
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-7 text-[9px]"
                                onClick={() => setItemToDelete({ id: task.id, name: task.title, type: 'task' })}
                              >
                                <Trash2 size={12} />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-gray-300 uppercase italic">No archived tasks</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </aside>

      {itemToDelete && (
        <ConfirmModal
          title={`Delete ${itemToDelete.type === 'column' ? 'Column' : 'Task'} Permanently`}
          message={`Are you sure you want to permanently delete "${itemToDelete.name}"? This action cannot be undone.`}
          confirmText="Permanently Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </>
  )
}
