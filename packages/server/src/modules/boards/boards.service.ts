import { boardRepository } from './boards.repository'
import { workspaceRepository } from '../workspaces/workspaces.repository'
import { columnRepository } from '../columns/columns.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'
import { ForbiddenError } from '../../shared/errors'
import Archiver from 'archiver'
import { Readable } from 'stream'

export const boardService = {
  getAllBoards: () => boardRepository.findAll(),

  getUserBoards: (userId: string) => boardRepository.findByUserId(userId),

  getBoardById: (id: string) => boardRepository.findById(id),

  getBoardsByWorkspaceId: (workspaceId: string) =>
    boardRepository.findByWorkspaceId(workspaceId),

  createBoard: async (data: {
    name: string
    description?: string
    workspaceId?: string
    ownerId: string
    visibility?: 'private' | 'workspace' | 'public'
  }) => {
    let workspaceId = data.workspaceId

    // If no workspace specified, find user's personal workspace
    if (!workspaceId) {
      const userWorkspaces = await workspaceRepository.getUserWorkspaces(data.ownerId)
      const personalWorkspace = userWorkspaces.find(o => (o as any).workspace.personal)
      if (personalWorkspace) {
        workspaceId = (personalWorkspace as any).workspace.id
      }
    }

    const board = await boardRepository.create({
      ...data,
      workspaceId: workspaceId,
    })

    // Add owner as admin member
    await boardRepository.addMember(board.id, data.ownerId, 'admin')
    
    eventBus.emitDomain('board.created', { board, userId: data.ownerId })
    
    return board
  },

  updateBoard: async (id: string, data: {
    name?: string
    description?: string
    visibility?: 'private' | 'workspace' | 'public'
    position?: string
    version?: number
  }, userId: string) => {
    const oldBoard = await boardRepository.findById(id)
    const { version, ...updateData } = data
    const board = await boardRepository.update(id, updateData, version)
    
    const changes: any = {}
    if (data.name && data.name !== oldBoard?.name) changes.name = { before: oldBoard?.name, after: data.name }
    if (data.description !== undefined && data.description !== oldBoard?.description) changes.description = { before: oldBoard?.description, after: data.description }
    if (data.visibility && data.visibility !== oldBoard?.visibility) changes.visibility = { before: oldBoard?.visibility, after: data.visibility }

    eventBus.emitDomain('board.updated', { board, userId, changes })
    return board
  },

  archiveBoard: async (id: string, userId: string) => {
    const board = await boardRepository.findById(id)
    if (!board) throw new Error('Board not found')

    if (board.workspaceId) {
      const membership = await workspaceRepository.getMember(board.workspaceId, userId)
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new ForbiddenError('Only workspace admins can archive boards')
      }
    }

    const archivedBoard = await boardRepository.archive(id)
    eventBus.emitDomain('board.archived', { board: archivedBoard, userId })
    return archivedBoard
  },

  restoreBoard: async (id: string, userId: string) => {
    const board = await boardRepository.findById(id)
    if (!board) throw new Error('Board not found')

    if (board.workspaceId) {
      const membership = await workspaceRepository.getMember(board.workspaceId, userId)
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new ForbiddenError('Only workspace admins can restore boards')
      }
    }

    const restoredBoard = await boardRepository.restore(id)
    eventBus.emitDomain('board.restored', { board: restoredBoard, userId })
    return restoredBoard
  },

  permanentDeleteBoard: async (id: string, userId: string) => {
    const board = await boardRepository.findById(id)
    if (!board) throw new Error('Board not found')

    if (board.workspaceId) {
      const membership = await workspaceRepository.getMember(board.workspaceId, userId)
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new ForbiddenError('Only workspace admins can permanently delete boards')
      }
    }

    const deletedBoard = await boardRepository.permanentDelete(id)
    eventBus.emitDomain('board.deleted', { boardId: id, userId })
    return deletedBoard
  },

  deleteBoard: async (id: string, userId: string) => {
    const board = await boardRepository.delete(id)
    eventBus.emitDomain('board.deleted', { boardId: id, userId })
    return board
  },

  // Board Members
  getMembers: (boardId: string) => boardRepository.getMembers(boardId),

  addMember: async (boardId: string, userId: string, actorId: string, role: 'admin' | 'member' | 'viewer' = 'member') => {
    const member = await boardRepository.addMember(boardId, userId, role)
    eventBus.emitDomain('board.member.added', { boardId, member, userId, actorId })
    return member
  },

  updateMemberRole: async (boardId: string, memberId: string, actorId: string, role: 'admin' | 'member' | 'viewer') => {
    const member = await boardRepository.updateMemberRole(memberId, role)
    eventBus.emitDomain('board.member.updated', { boardId, member, userId: member.userId, actorId })
    return member
  },

  removeMember: async (boardId: string, userId: string, actorId: string) => {
    const member = await boardRepository.removeMember(boardId, userId)
    eventBus.emitDomain('board.member.removed', { boardId, userId, actorId })
    return member
  },

  // Starred Boards
  getStarredBoards: (userId: string) => boardRepository.getStarredByUserId(userId),

  getArchivedItems: async (boardId: string, userId: string) => {
    const board = await boardRepository.findById(boardId)
    if (!board) throw new Error('Board not found')

    // Basic access check: must be workspace member or board member
    let hasAccess = false
    const boardMembers = await boardRepository.getMembers(boardId)
    if (boardMembers.some(m => m.userId === userId)) {
      hasAccess = true
    } else if (board.workspaceId) {
      const workspaceMember = await workspaceRepository.getMember(board.workspaceId, userId)
      if (workspaceMember) hasAccess = true
    }

    if (!hasAccess && board.visibility !== 'public') {
      throw new ForbiddenError('Access denied')
    }

    const [columns, tasks] = await Promise.all([
      columnRepository.findArchivedByBoardId(boardId),
      taskRepository.findArchivedByBoardId(boardId)
    ])

    return { columns, tasks }
  },

  starBoard: async (userId: string, boardId: string) => {
    const result = await boardRepository.star(userId, boardId)
    eventBus.emitDomain('board.starred', { boardId, userId })
    return result
  },

  unstarBoard: async (userId: string, boardId: string) => {
    const result = await boardRepository.unstar(userId, boardId)
    eventBus.emitDomain('board.unstarred', { boardId, userId })
    return result
  },

  isStarred: (userId: string, boardId: string) => boardRepository.isStarred(userId, boardId),

  // Recent Boards (board visits)
  getRecentBoards: (userId: string, limit?: number) =>
    boardRepository.getRecentBoards(userId, limit),

  recordVisit: (userId: string, boardId: string) =>
    boardRepository.recordVisit(userId, boardId),

  getExportData: async (boardId: string, userId: string, includeArchived: boolean = false) => {
    const board = await boardRepository.findById(boardId)
    if (!board) throw new Error('Board not found')

    // Access check: must be workspace member or board member
    let hasAccess = false
    const members = await boardRepository.getMembers(boardId)
    if (members.some(m => m.userId === userId)) {
      hasAccess = true
    } else if (board.workspaceId) {
      const workspaceMember = await workspaceRepository.getMember(board.workspaceId, userId)
      if (workspaceMember) hasAccess = true
    }

    if (!hasAccess && board.visibility !== 'public') {
      throw new ForbiddenError('Access denied')
    }

    const data = await boardRepository.getExportData(boardId, includeArchived)
    if (!data) throw new Error('Board not found')

    return data
  },

  exportToCsvZip: async (data: any) => {
    const archive = Archiver('zip', { zlib: { level: 9 } })
    const stream = new Readable({
      read() {}
    })

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return ''
      let str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const toCsv = (rows: any[], fields: string[]) => {
      const header = fields.join(',')
      const body = rows.map(row => fields.map(field => escapeCsv(row[field])).join(',')).join('\n')
      return `\uFEFF${header}\n${body}`
    }

    // board.csv
    archive.append(toCsv([data.board], Object.keys(data.board)), { name: 'board.csv' })

    // columns.csv
    if (data.columns.length > 0) {
      archive.append(toCsv(data.columns, Object.keys(data.columns[0])), { name: 'columns.csv' })
    }

    // tasks.csv
    if (data.tasks.length > 0) {
      archive.append(toCsv(data.tasks, Object.keys(data.tasks[0])), { name: 'tasks.csv' })
    }

    // labels.csv
    if (data.labels.length > 0) {
      archive.append(toCsv(data.labels, Object.keys(data.labels[0])), { name: 'labels.csv' })
    }

    // task_labels.csv
    if (data.taskLabels.length > 0) {
      archive.append(toCsv(data.taskLabels, Object.keys(data.taskLabels[0])), { name: 'task_labels.csv' })
    }

    // task_assignees.csv
    if (data.taskAssignees.length > 0) {
      archive.append(toCsv(data.taskAssignees, Object.keys(data.taskAssignees[0])), { name: 'task_assignees.csv' })
    }

    // checklists.csv
    if (data.checklists.length > 0) {
      archive.append(toCsv(data.checklists, Object.keys(data.checklists[0])), { name: 'checklists.csv' })
    }

    // checklist_items.csv
    if (data.checklistItems.length > 0) {
      archive.append(toCsv(data.checklistItems, Object.keys(data.checklistItems[0])), { name: 'checklist_items.csv' })
    }

    // attachments.csv
    if (data.attachments.length > 0) {
      archive.append(toCsv(data.attachments, Object.keys(data.attachments[0])), { name: 'attachments.csv' })
    }

    // comments.csv
    if (data.comments.length > 0) {
      archive.append(toCsv(data.comments, Object.keys(data.comments[0])), { name: 'comments.csv' })
    }

    // activities.csv
    if (data.activities.length > 0) {
      archive.append(toCsv(data.activities, Object.keys(data.activities[0])), { name: 'activities.csv' })
    }

    archive.finalize()
    return archive
  },
}
