import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Archive, Calendar, ArrowRight, PackageOpen, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useArchivedBoards, useRestoreBoard, usePermanentDeleteBoard } from '../hooks/useArchive'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const Route = createFileRoute('/archive')({
  component: ArchiveRouteComponent,
})

function ArchiveRouteComponent() {
  return (
    <DashboardLayout>
      <ArchivePage />
    </DashboardLayout>
  )
}

function ArchivePage() {
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()
  const [boardToDelete, setBoardToDelete] = useState<{ id: string, name: string } | null>(null)
  const [confirmName, setConfirmName] = useState('')

  const { data: archivedBoards, isLoading: isArchivedLoading } = useArchivedBoards(currentWorkspace?.id)
  
  const restoreBoard = useRestoreBoard(currentWorkspace?.id)
  const permanentDeleteBoard = usePermanentDeleteBoard(currentWorkspace?.id)

  const handleRestore = async (boardId: string) => {
    try {
      await restoreBoard.mutateAsync(boardId)
    } catch (error) {
      console.error('Failed to restore board:', error)
    }
  }

  const handleDelete = async () => {
    if (!boardToDelete || confirmName !== boardToDelete.name) return
    
    try {
      await permanentDeleteBoard.mutateAsync(boardToDelete.id)
      setBoardToDelete(null)
      setConfirmName('')
    } catch (error) {
      console.error('Failed to delete board:', error)
    }
  }

  if (isWorkspaceLoading) return null

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-10">
        <h1 className="m-0 font-heading text-[32px] font-bold tracking-tight text-black uppercase">
          Workspace Archive
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500 uppercase">
          Manage archived boards and items for {currentWorkspace?.name}
        </p>
      </header>

      {isArchivedLoading ? (
        <div className="flex h-64 items-center justify-center border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold tracking-widest text-black/40 uppercase">Loading archive...</p>
        </div>
      ) : archivedBoards && archivedBoards.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {archivedBoards.map((board) => (
            <div 
              key={board.id}
              className="group flex flex-col border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="border-b border-black p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center border border-black bg-black text-white">
                    <Archive size={16} />
                  </div>
                  <span className="text-[10px] font-bold tracking-tighter text-black/40 uppercase">Board</span>
                </div>
                <h3 className="truncate text-lg font-bold text-black uppercase">{board.name}</h3>
              </div>
              
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                  <Calendar size={12} />
                  Archived {new Date(board.archivedAt!).toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-black border-t border-black">
                <Button
                  variant="secondary"
                  className="h-10 rounded-none border-none text-[10px] font-extrabold uppercase shadow-none"
                  onClick={() => handleRestore(board.id)}
                  disabled={restoreBoard.isPending && restoreBoard.variables === board.id}
                >

                  <RotateCcw size={14} className="mr-2" />
                  Restore
                </Button>
                <Button
                  variant="danger"
                  className="h-10 rounded-none border-none text-[10px] font-extrabold uppercase shadow-none"
                  onClick={() => setBoardToDelete({ id: board.id, name: board.name })}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </Button>
              </div>

              <div className="border-t border-black bg-black/2 p-2 group-hover:bg-black/5">
                <Link
                  to="/board/$boardId"
                  params={{ boardId: board.id }}
                  className="flex items-center justify-between px-2 py-2 text-[10px] font-extrabold text-black uppercase transition-colors hover:bg-black hover:text-white"
                >
                  View Contents
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-black bg-white py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center border border-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <PackageOpen size={32} />
          </div>
          <h2 className="mb-2 font-heading text-xl font-bold text-black uppercase">No archived boards</h2>
          <p className="max-w-xs text-xs font-medium text-gray-500 uppercase">
            Boards you archive will appear here. Admins can restore or permanently delete them.
          </p>
        </div>
      )}

      {boardToDelete && (
        <ConfirmModal
          title="Delete Board Permanently"
          message={`Are you sure you want to permanently delete "${boardToDelete.name}"? This action cannot be undone and will delete all columns and tasks within this board.`}
          confirmText="Permanently Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setBoardToDelete(null)
            setConfirmName('')
          }}
        >
          <div className="space-y-2">
            <p className="text-[11px] font-bold tracking-tight text-black uppercase">
              Type <span className="text-red-600">"{boardToDelete.name}"</span> to confirm
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Board name"
              autoFocus
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}

