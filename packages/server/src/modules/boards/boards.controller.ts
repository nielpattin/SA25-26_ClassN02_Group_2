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
} from './boards.model'

export const boardController = new Elysia({ prefix: '/boards' })
  .use(authPlugin)
  // Board CRUD
  .get('/', ({ session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.getUserBoards(session.user.id)
  })
  .get('/:id', ({ params: { id } }) => boardService.getBoardById(id), {
    params: BoardParams,
  })
  .post('/', ({ session, set, body }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.createBoard({
      ...body,
      ownerId: session.user.id,
    })
  }, {
    body: CreateBoardBody,
  })
  .patch('/:id', ({ params: { id }, body }) => boardService.updateBoard(id, body), {
    params: BoardParams,
    body: UpdateBoardBody,
  })
  .delete('/:id', ({ params: { id } }) => boardService.deleteBoard(id), {
    params: BoardParams,
  })

  // Archive/Restore
  .post('/:id/archive', ({ params: { id } }) => boardService.archiveBoard(id), {
    params: BoardParams,
  })
  .post('/:id/restore', ({ params: { id } }) => boardService.restoreBoard(id), {
    params: BoardParams,
  })

  // Board Members
  .get('/:id/members', ({ params: { id } }) => boardService.getMembers(id), {
    params: BoardParams,
  })
  .post('/:id/members', ({ params: { id }, body }) =>
    boardService.addMember(id, body.userId, body.role), {
    params: BoardParams,
    body: AddMemberBody,
  })
  .patch('/:id/members/:userId', ({ params: { id, userId }, body }) =>
    boardService.updateMemberRole(id, userId, body.role), {
    params: BoardMemberParams,
    body: UpdateMemberRoleBody,
  })
  .delete('/:id/members/:userId', ({ params: { id, userId } }) =>
    boardService.removeMember(id, userId), {
    params: BoardMemberParams,
  })

  // Starring (user-specific, requires auth context)
  .post('/:id/star', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.starBoard(session.user.id, id)
  }, {
    params: StarBoardParams,
  })
  .delete('/:id/star', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.unstarBoard(session.user.id, id)
  }, {
    params: StarBoardParams,
  })
