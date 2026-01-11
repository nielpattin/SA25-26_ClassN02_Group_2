import { boardRepository } from './boards.repository'
import { wsManager } from '../../websocket/manager'

export const boardService = {
  getAllBoards: () => boardRepository.findAll(),

  getBoardById: (id: string) => boardRepository.findById(id),

  getBoardsByOrganizationId: (organizationId: string) =>
    boardRepository.findByOrganizationId(organizationId),

  createBoard: async (data: {
    name: string
    description?: string
    organizationId?: string
    ownerId?: string
    visibility?: 'private' | 'organization' | 'public'
  }) => {
    const board = await boardRepository.create(data)
    wsManager.broadcast(`board:${board.id}`, { type: 'board:created', data: board })
    return board
  },

  updateBoard: async (id: string, data: {
    name?: string
    description?: string
    visibility?: 'private' | 'organization' | 'public'
    position?: string
  }) => {
    const board = await boardRepository.update(id, data)
    wsManager.broadcast(`board:${id}`, { type: 'board:updated', data: board })
    return board
  },

  archiveBoard: async (id: string) => {
    const board = await boardRepository.archive(id)
    wsManager.broadcast(`board:${id}`, { type: 'board:archived', data: board })
    return board
  },

  restoreBoard: async (id: string) => {
    const board = await boardRepository.restore(id)
    wsManager.broadcast(`board:${id}`, { type: 'board:restored', data: board })
    return board
  },

  deleteBoard: async (id: string) => {
    const board = await boardRepository.delete(id)
    wsManager.broadcast(`board:${id}`, { type: 'board:deleted', data: { id } })
    return board
  },

  // Board Members
  getMembers: (boardId: string) => boardRepository.getMembers(boardId),

  addMember: async (boardId: string, userId: string, role: 'admin' | 'member' | 'viewer' = 'member') => {
    const member = await boardRepository.addMember(boardId, userId, role)
    wsManager.broadcast(`board:${boardId}`, { type: 'board:member:added', data: member })
    return member
  },

  updateMemberRole: async (boardId: string, memberId: string, role: 'admin' | 'member' | 'viewer') => {
    const member = await boardRepository.updateMemberRole(memberId, role)
    wsManager.broadcast(`board:${boardId}`, { type: 'board:member:updated', data: member })
    return member
  },

  removeMember: async (boardId: string, userId: string) => {
    const member = await boardRepository.removeMember(boardId, userId)
    wsManager.broadcast(`board:${boardId}`, { type: 'board:member:removed', data: { boardId, userId } })
    return member
  },

  // Starred Boards
  getStarredBoards: (userId: string) => boardRepository.getStarredByUserId(userId),

  starBoard: (userId: string, boardId: string) => boardRepository.star(userId, boardId),

  unstarBoard: (userId: string, boardId: string) => boardRepository.unstar(userId, boardId),

  isStarred: (userId: string, boardId: string) => boardRepository.isStarred(userId, boardId),
}
