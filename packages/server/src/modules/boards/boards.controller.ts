import { Elysia } from 'elysia'
import { boardService } from './boards.service'
import { authPlugin } from '../auth'
import {
  CreateBoardBody,
  UpdateBoardBody,
  BoardParams,
  BoardMemberParams,
  AddMemberBody,
  UpdateMemberRoleBody,
  StarBoardParams,
  ExportBoardQuery,
} from './boards.model'
import { UpdateBoardPreferenceBody } from './preferences.model'

export const boardController = new Elysia({ prefix: '/boards' })
  .use(authPlugin)
  .get('/', ({ session }) => {
    return boardService.getUserBoards(session.user.id)
  }, { requireAuth: true })
  // Recent Boards - must be before /:id to avoid route conflicts
  .get('/recent', ({ session }) => {
    return boardService.getRecentBoards(session.user.id)
  }, { requireAuth: true })
  .get('/:id', ({ params: { id }, session }) => {
    return boardService.getBoardById(id, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })
  .post('/', ({ session, body }) => {
    return boardService.createBoard({
      ...body,
      ownerId: session.user.id,
    })
  }, {
    requireAuth: true,
    body: CreateBoardBody,
  })
  .patch('/:id', ({ params: { id }, body, session }) => {
    return boardService.updateBoard(id, body, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
    body: UpdateBoardBody,
  })
  .delete('/:id', ({ params: { id }, session }) => {
    return boardService.deleteBoard(id, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })

  .post('/:id/archive', ({ params: { id }, session }) => {
    return boardService.archiveBoard(id, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })
  .post('/:id/restore', ({ params: { id }, session }) => {
    return boardService.restoreBoard(id, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })
  .delete('/:id/permanent', ({ params: { id }, session }) => {
    return boardService.permanentDeleteBoard(id, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })

  .get('/:id/archived', ({ params: { id }, session }) => {
    return boardService.getArchivedItems(id, session.user.id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })

  .get('/:id/members', ({ params: { id }, session }) => {
    return boardService.getMembers(id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })
  .post('/:id/members', ({ params: { id }, body, session }) => {
    return boardService.addMember(id, body.userId, session.user.id, body.role)
  }, {
    requireAuth: true,
    params: BoardParams,
    body: AddMemberBody,
  })
  .patch('/:id/members/:userId', ({ params: { id, userId }, body, session }) => {
    return boardService.updateMemberRole(id, userId, session.user.id, body.role)
  }, {
    requireAuth: true,
    params: BoardMemberParams,
    body: UpdateMemberRoleBody,
  })
  .delete('/:id/members/:userId', ({ params: { id, userId }, session }) => {
    return boardService.removeMember(id, userId, session.user.id)
  }, {
    requireAuth: true,
    params: BoardMemberParams,
  })

  .post('/:id/star', ({ params: { id }, session }) => {
    return boardService.starBoard(session.user.id, id)
  }, {
    requireAuth: true,
    params: StarBoardParams,
  })
  .delete('/:id/star', ({ params: { id }, session }) => {
    return boardService.unstarBoard(session.user.id, id)
  }, {
    requireAuth: true,
    params: StarBoardParams,
  })
  .post('/:id/visit', ({ params: { id }, session }) => {
    return boardService.recordVisit(session.user.id, id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })

  .get('/:id/export', async ({ params: { id }, query: { format, includeArchived }, session, set }) => {
    const isArchived = includeArchived === 'true'
    const data = await boardService.getExportData(id, session.user.id, isArchived)

    const baseFileName = data.board.name.replace(/\s+/g, '-').toLowerCase()
    const dateStr = new Date().toISOString().split('T')[0]

    if (format === 'csv') {
      const archive = await boardService.exportToCsvZip(data)
      set.headers['Content-Type'] = 'application/zip'
      set.headers['Content-Disposition'] = `attachment; filename="${baseFileName}-export-${dateStr}.zip"`
      return archive
    }

    // Default to JSON
    set.headers['Content-Type'] = 'application/json'
    set.headers['Content-Disposition'] = `attachment; filename="${baseFileName}-export-${dateStr}.json"`
    
    return data
  }, {
    requireAuth: true,
    params: BoardParams,
    query: ExportBoardQuery,
  })

  .get('/:id/preferences', ({ params: { id }, session }) => {
    return boardService.getPreferences(session.user.id, id)
  }, {
    requireAuth: true,
    params: BoardParams,
  })
  .put('/:id/preferences', ({ params: { id }, body, session }) => {
    return boardService.updatePreferences(session.user.id, id, body)
  }, {
    requireAuth: true,
    params: BoardParams,
    body: UpdateBoardPreferenceBody,
  })
