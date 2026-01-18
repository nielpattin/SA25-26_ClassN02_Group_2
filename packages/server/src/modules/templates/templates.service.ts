import { templateRepository } from './templates.repository'
import type { CreateBoardTemplateInput, UpdateBoardTemplateInput, CreateTaskTemplateInput, UpdateTaskTemplateInput } from './templates.model'

export const templateService = {
  // Board Templates
  getBoardTemplates: (userId: string, workspaceId?: string) =>
    templateRepository.findBoardTemplates(userId, workspaceId),

  getBoardTemplateById: (id: string) => templateRepository.findBoardTemplateById(id),

  createBoardTemplate: (data: CreateBoardTemplateInput & { createdBy: string }) =>
    templateRepository.createBoardTemplate(data),

  updateBoardTemplate: (id: string, data: UpdateBoardTemplateInput) =>
    templateRepository.updateBoardTemplate(id, data),

  deleteBoardTemplate: (id: string) => templateRepository.deleteBoardTemplate(id),

  // Task Templates
  getTaskTemplatesByBoardId: (boardId: string) => templateRepository.findTaskTemplatesByBoardId(boardId),

  getTaskTemplateById: (id: string) => templateRepository.findTaskTemplateById(id),

  createTaskTemplate: (data: CreateTaskTemplateInput & { createdBy: string }) =>
    templateRepository.createTaskTemplate(data),

  updateTaskTemplate: (id: string, data: UpdateTaskTemplateInput) =>
    templateRepository.updateTaskTemplate(id, data),

  deleteTaskTemplate: (id: string) => templateRepository.deleteTaskTemplate(id),
}
