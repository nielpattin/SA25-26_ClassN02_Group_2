import { Elysia } from 'elysia'
import { boardService } from './boards.service'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
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
    if (!session) throw new UnauthorizedError()
    return boardService.getUserBoards(session.user.id)
  })
  // Recent Boards - must be before /:id to avoid route conflicts
  .get('/recent', ({ session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.getRecentBoards(session.user.id)
  })
  .get('/:id', ({ params: { id } }) => boardService.getBoardById(id), {
    params: BoardParams,
  })
  .post('/', ({ session, body }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.createBoard({
      ...body,
      ownerId: session.user.id,
    })
  }, {
    body: CreateBoardBody,
  })
  .patch('/:id', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.updateBoard(id, body, session.user.id)
  }, {
    params: BoardParams,
    body: UpdateBoardBody,
  })
  .delete('/:id', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.deleteBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })

  .post('/:id/archive', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.archiveBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })
  .post('/:id/restore', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.restoreBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })
  .delete('/:id/permanent', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.permanentDeleteBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })

  .get('/:id/archived', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.getArchivedItems(id, session.user.id)
  }, {
    params: BoardParams,
  })

  .get('/:id/members', ({ params: { id } }) => boardService.getMembers(id), {
    params: BoardParams,
  })
  .post('/:id/members', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.addMember(id, body.userId, session.user.id, body.role)
  }, {
    params: BoardParams,
    body: AddMemberBody,
  })
  .patch('/:id/members/:userId', ({ params: { id, userId }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.updateMemberRole(id, userId, session.user.id, body.role)
  }, {
    params: BoardMemberParams,
    body: UpdateMemberRoleBody,
  })
  .delete('/:id/members/:userId', ({ params: { id, userId }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.removeMember(id, userId, session.user.id)
  }, {
    params: BoardMemberParams,
  })

  .post('/:id/star', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.starBoard(session.user.id, id)
  }, {
    params: StarBoardParams,
  })
  .delete('/:id/star', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.unstarBoard(session.user.id, id)
  }, {
    params: StarBoardParams,
  })
  .post('/:id/visit', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.recordVisit(session.user.id, id)
  }, {
    params: BoardParams,
  })

  .get('/:id/export', async ({ params: { id }, query: { format, includeArchived }, session, set }) => {
    if (!session) throw new UnauthorizedError()
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
    params: BoardParams,
    query: ExportBoardQuery,
  })

  .get('/:id/preferences', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.getPreferences(session.user.id, id)
  }, {
    params: BoardParams,
  })
  .put('/:id/preferences', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return boardService.updatePreferences(session.user.id, id, body)
  }, {
    params: BoardParams,
    body: UpdateBoardPreferenceBody,
  })
