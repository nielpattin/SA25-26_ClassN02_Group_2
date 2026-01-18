import { db } from '../../db'
import { workspaces, members, boards, users } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { CreateWorkspaceInput, UpdateWorkspaceInput, AddMemberInput } from './workspaces.model'

export const workspaceRepository = {
  async getAll() {
    return db.select().from(workspaces)
  },

  async getById(id: string) {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))
    return workspace
  },

  async getBySlug(slug: string) {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
    return workspace
  },

  async create(data: CreateWorkspaceInput, userId: string) {
    return db.transaction(async (tx) => {
      const [workspace] = await tx.insert(workspaces).values({
        ...data,
      }).returning()

      await tx.insert(members).values({
        workspaceId: workspace.id,
        userId: userId,
        role: 'owner'
      })

      return workspace
    })
  },

  async update(id: string, data: UpdateWorkspaceInput) {
    const [workspace] = await db.update(workspaces)
      .set(data)
      .where(eq(workspaces.id, id))
      .returning()
    return workspace
  },

  async delete(id: string) {
    const [workspace] = await db.delete(workspaces).where(eq(workspaces.id, id)).returning()
    return workspace
  },

  async addMember(workspaceId: string, data: { userId: string, role: "owner" | "admin" | "member" | "viewer" }) {
    const [member] = await db.insert(members).values({
      workspaceId,
      ...data,
    }).returning()
    return member
  },

  async removeMember(workspaceId: string, userId: string) {
    const [member] = await db.delete(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)))
      .returning()
    return member
  },

  async getMembers(workspaceId: string) {
    return db.select({
      id: members.id,
      workspaceId: members.workspaceId,
      userId: members.userId,
      role: members.role,
      createdAt: members.createdAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(members)
    .leftJoin(users, eq(members.userId, users.id))
    .where(eq(members.workspaceId, workspaceId))
  },

  async getMember(workspaceId: string, userId: string) {
    const [member] = await db.select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)))
    return member
  },

  async getUserWorkspaces(userId: string) {
    return db.select({
      workspace: workspaces
    })
    .from(members)
    .innerJoin(workspaces, eq(members.workspaceId, workspaces.id))
    .where(eq(members.userId, userId))
  },

  async getBoards(workspaceId: string) {
    return db.select().from(boards).where(eq(boards.workspaceId, workspaceId))
  }
}
