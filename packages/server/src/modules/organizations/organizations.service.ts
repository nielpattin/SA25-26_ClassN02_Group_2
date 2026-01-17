import { organizationRepository } from './organizations.repository'
import type { CreateOrganizationInput, UpdateOrganizationInput, AddMemberInput } from './organizations.model'
export const organizationService = {
  async getAll() {
    return organizationRepository.getAll()
  },

  async getById(id: string) {
    return organizationRepository.getById(id)
  },

  async getBySlug(slug: string) {
    return organizationRepository.getBySlug(slug)
  },

  async create(data: CreateOrganizationInput, userId: string) {
    return organizationRepository.create(data, userId)
  },

  async update(id: string, data: UpdateOrganizationInput) {
    return organizationRepository.update(id, data)
  },

  async delete(id: string) {
    return organizationRepository.delete(id)
  },

  async addMember(organizationId: string, data: AddMemberInput) {
    return organizationRepository.addMember(organizationId, data)
  },

  async removeMember(organizationId: string, userId: string) {
    return organizationRepository.removeMember(organizationId, userId)
  },

  async getMembers(organizationId: string) {
    return organizationRepository.getMembers(organizationId)
  },

  async getUserOrganizations(userId: string) {
    const results = await organizationRepository.getUserOrganizations(userId)
    return results.map(r => r.organization)
  },

  async getBoards(organizationId: string) {
    return organizationRepository.getBoards(organizationId)
  }
}
