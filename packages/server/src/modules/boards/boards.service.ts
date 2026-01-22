import { boardRepository } from './boards.repository'
import { workspaceRepository } from '../workspaces/workspaces.repository'
import { eventBus } from '../../events/bus'

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
    const board = await boardRepository.archive(id)
    eventBus.emitDomain('board.archived', { board, userId })
    return board
  },

  restoreBoard: async (id: string, userId: string) => {
    const board = await boardRepository.restore(id)
    eventBus.emitDomain('board.restored', { board, userId })
    return board
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
}
