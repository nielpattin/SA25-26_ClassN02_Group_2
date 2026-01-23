import { workspaceRepository } from './workspaces.repository'
import { boardRepository } from '../boards/boards.repository'
import type { CreateWorkspaceInput, UpdateWorkspaceInput, AddMemberInput } from './workspaces.model'
import { ForbiddenError, BadRequestError } from '../../shared/errors'

export const workspaceService = {
  async getAll() {
    return workspaceRepository.getAll()
  },

  async getById(id: string) {
    return workspaceRepository.getById(id)
  },

  async getBySlug(slug: string) {
    return workspaceRepository.getBySlug(slug)
  },

  async create(data: CreateWorkspaceInput, userId: string) {
    return workspaceRepository.create(data, userId)
  },

  async update(id: string, data: UpdateWorkspaceInput) {
    return workspaceRepository.update(id, data)
  },

  async delete(id: string) {
    return workspaceRepository.delete(id)
  },

  async addMember(workspaceId: string, data: AddMemberInput, actorId: string) {
    const actorMembership = await workspaceRepository.getMember(workspaceId, actorId)
    if (!actorMembership || (actorMembership.role !== 'owner' && actorMembership.role !== 'admin')) {
      throw new ForbiddenError('Only workspace admins can add members')
    }

    if (!data.userId && !data.email) {
      throw new BadRequestError('User ID or email is required')
    }

    let targetUserId = data.userId
    if (data.email) {
      // In a real app, we'd look up user by email or send an invite
      // For now, assuming user exists or we just store the email if we had an invites table
      // Let's assume user exists for simplicity in this MVP
      throw new BadRequestError('Invitation by email not fully implemented')
    }

    if (!targetUserId) throw new BadRequestError('Target user ID is required')

    const existing = await workspaceRepository.getMember(workspaceId, targetUserId)
    if (existing) {
      throw new BadRequestError('User is already a member of this workspace')
    }

    return workspaceRepository.addMember(workspaceId, {
      userId: targetUserId,
      role: data.role || 'member'
    })
  },

  async removeMember(workspaceId: string, userId: string, actorId: string) {
    const actorMembership = await workspaceRepository.getMember(workspaceId, actorId)
    if (!actorMembership || (actorMembership.role !== 'owner' && actorMembership.role !== 'admin')) {
      // Allow users to remove themselves
      if (userId !== actorId) {
        throw new ForbiddenError('Only workspace admins can remove members')
      }
    }

    return workspaceRepository.removeMember(workspaceId, userId)
  },

  async getMembers(workspaceId: string) {
    return workspaceRepository.getMembers(workspaceId)
  },

  async getUserWorkspaces(userId: string) {
    const results = await workspaceRepository.getUserWorkspaces(userId)
    return results.map(r => r.workspace)
  },

  async getBoards(workspaceId: string) {
    return workspaceRepository.getBoards(workspaceId)
  },

  async getArchivedBoards(workspaceId: string, actorId: string) {
    const actorMembership = await workspaceRepository.getMember(workspaceId, actorId)
    if (!actorMembership || (actorMembership.role !== 'owner' && actorMembership.role !== 'admin')) {
      throw new ForbiddenError('Only workspace admins can view archived boards')
    }

    return boardRepository.findArchivedByWorkspaceId(workspaceId)
  }
}
