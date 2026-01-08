import { db } from '../../db'
import { organizations, members, boards } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { CreateOrganizationInput, UpdateOrganizationInput, AddMemberInput } from './organizations.model'

export const organizationRepository = {
  async getAll() {
    return db.select().from(organizations)
  },

  async getById(id: string) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id))
    return org
  },

  async getBySlug(slug: string) {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug))
    return org
  },

  async create(data: CreateOrganizationInput) {
    const [org] = await db.insert(organizations).values({
      ...data,
    }).returning()
    return org
  },

  async update(id: string, data: UpdateOrganizationInput) {
    const [org] = await db.update(organizations)
      .set(data)
      .where(eq(organizations.id, id))
      .returning()
    return org
  },

  async delete(id: string) {
    const [org] = await db.delete(organizations).where(eq(organizations.id, id)).returning()
    return org
  },

  async addMember(organizationId: string, data: AddMemberInput) {
    const [member] = await db.insert(members).values({
      organizationId,
      ...data,
    }).returning()
    return member
  },

  async removeMember(organizationId: string, userId: string) {
    const [member] = await db.delete(members)
      .where(and(eq(members.organizationId, organizationId), eq(members.userId, userId)))
      .returning()
    return member
  },

  async getMembers(organizationId: string) {
    return db.select().from(members).where(eq(members.organizationId, organizationId))
  },

  async getUserOrganizations(userId: string) {
    return db.select({
      organization: organizations
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(eq(members.userId, userId))
  },

  async getBoards(organizationId: string) {
    return db.select().from(boards).where(eq(boards.organizationId, organizationId))
  }
}
