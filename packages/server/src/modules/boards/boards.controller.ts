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
  .patch('/:id', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.updateBoard(id, body, session.user.id)
  }, {
    params: BoardParams,
    body: UpdateBoardBody,
  })
  .delete('/:id', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.deleteBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })

  .post('/:id/archive', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.archiveBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })
  .post('/:id/restore', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.restoreBoard(id, session.user.id)
  }, {
    params: BoardParams,
  })

  .get('/:id/members', ({ params: { id } }) => boardService.getMembers(id), {
    params: BoardParams,
  })
  .post('/:id/members', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.addMember(id, body.userId, session.user.id, body.role)
  }, {
    params: BoardParams,
    body: AddMemberBody,
  })
  .patch('/:id/members/:userId', ({ params: { id, userId }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.updateMemberRole(id, userId, session.user.id, body.role)
  }, {
    params: BoardMemberParams,
    body: UpdateMemberRoleBody,
  })
  .delete('/:id/members/:userId', ({ params: { id, userId }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return boardService.removeMember(id, userId, session.user.id)
  }, {
    params: BoardMemberParams,
  })

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
