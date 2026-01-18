import { userRepository } from './users.repository'
import type { CreateUserInput, UpdateUserInput, UpdateUserPreferencesInput } from './users.model'

export const userService = {
  async getAll() {
    return userRepository.getAll()
  },

  async getById(id: string) {
    return userRepository.getById(id)
  },

  async getByEmail(email: string) {
    return userRepository.getByEmail(email)
  },

  async create(data: CreateUserInput) {
    return userRepository.create(data)
  },

  async update(id: string, data: UpdateUserInput) {
    return userRepository.update(id, data)
  },

  async updatePreferences(id: string, data: UpdateUserPreferencesInput) {
    return userRepository.updatePreferences(id, data)
  },

  async delete(id: string) {
    return userRepository.delete(id)
  }
}
