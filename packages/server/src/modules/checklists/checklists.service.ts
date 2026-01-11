import { checklistRepository } from './checklists.repository'
import type { CreateChecklistInput, UpdateChecklistInput, CreateChecklistItemInput, UpdateChecklistItemInput } from './checklists.model'

export const checklistService = {
  getByTaskId: async (taskId: string) => {
    const lists = await checklistRepository.findByTaskId(taskId)
    const listsWithItems = await Promise.all(
      lists.map(async (list) => ({
        ...list,
        items: await checklistRepository.findItemsByChecklistId(list.id)
      }))
    )
    return listsWithItems
  },

  getById: async (id: string) => {
    const checklist = await checklistRepository.findById(id)
    if (!checklist) return null
    const items = await checklistRepository.findItemsByChecklistId(id)
    return { ...checklist, items }
  },

  create: async (data: CreateChecklistInput) => {
    return checklistRepository.create(data)
  },

  update: async (id: string, data: UpdateChecklistInput) => {
    return checklistRepository.update(id, data)
  },

  delete: async (id: string) => {
    return checklistRepository.delete(id)
  },

  // Items
  createItem: async (data: CreateChecklistItemInput) => {
    return checklistRepository.createItem(data)
  },

  updateItem: async (id: string, data: UpdateChecklistItemInput) => {
    return checklistRepository.updateItem(id, data)
  },

  deleteItem: async (id: string) => {
    return checklistRepository.deleteItem(id)
  },

  toggleItem: async (id: string) => {
    const item = await checklistRepository.findItemById(id)
    if (!item) return null
    return checklistRepository.updateItem(id, { isCompleted: !item.isCompleted })
  }
}
