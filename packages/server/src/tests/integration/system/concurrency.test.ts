import { describe, expect, it, beforeAll } from 'bun:test'
import { taskService } from '../../../modules/tasks/tasks.service'
import { taskRepository } from '../../../modules/tasks/tasks.repository'
import { columnService } from '../../../modules/columns/columns.service'
import { columnRepository } from '../../../modules/columns/columns.repository'
import { boardService } from '../../../modules/boards/boards.service'
import { boardRepository } from '../../../modules/boards/boards.repository'
import { db } from '../../../db'
import { users } from '../../../db/schema'
import { ConflictError } from '../../../shared/errors'

describe('Concurrency Control', () => {
  let userId: string
  let boardId: string
  let columnId: string
  let taskId: string

  beforeAll(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      id: `test-user-${Date.now()}`,
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
    }).returning()
    userId = user.id

    // Create board
    const board = await boardRepository.create({
      name: 'Test Board',
      ownerId: userId,
    })
    boardId = board.id

    // Create column
    const column = await columnRepository.create({
      name: 'Test Column',
      position: '1',
      boardId,
    })
    columnId = column.id

    // Create task
    const task = await taskService.createTask({
      title: 'Test Task',
      columnId,
      position: '1',
    }, userId)
    taskId = task.id
  })

  // TASKS
  it('Task: should allow updates with correct version', async () => {
    const task = await taskRepository.findById(taskId)
    expect(task).not.toBeNull()
    const currentVersion = task!.version

    const updatedTask = await taskService.updateTask(taskId, {
      title: 'Updated Title',
      version: currentVersion
    }, userId)

    expect(updatedTask.version).toBe(currentVersion + 1)
    expect(updatedTask.title).toBe('Updated Title')
  })

  it('Task: should reject updates with incorrect version', async () => {
    const task = await taskRepository.findById(taskId)
    expect(task).not.toBeNull()
    const currentVersion = task!.version

    // Attempt update with old version (currentVersion - 1)
    const staleVersion = currentVersion - 1

    try {
      await taskService.updateTask(taskId, {
        title: 'Conflict Title',
        version: staleVersion
      }, userId)
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictError)
    }
  })

  // COLUMNS
  it('Column: should allow updates with correct version', async () => {
    const column = await columnRepository.findById(columnId)
    expect(column).not.toBeNull()
    const currentVersion = column!.version

    const updatedColumn = await columnService.updateColumn(columnId, {
      name: 'Updated Column',
      version: currentVersion
    }, userId)

    expect(updatedColumn.version).toBe(currentVersion + 1)
    expect(updatedColumn.name).toBe('Updated Column')
  })

  it('Column: should reject updates with incorrect version', async () => {
    const column = await columnRepository.findById(columnId)
    expect(column).not.toBeNull()
    const currentVersion = column!.version

    const staleVersion = currentVersion - 1

    try {
      await columnService.updateColumn(columnId, {
        name: 'Conflict Column',
        version: staleVersion
      }, userId)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictError)
    }
  })

  // BOARDS
  it('Board: should allow updates with correct version', async () => {
    const board = await boardRepository.findById(boardId)
    expect(board).not.toBeNull()
    const currentVersion = board!.version

    const updatedBoard = await boardService.updateBoard(boardId, {
      name: 'Updated Board',
      version: currentVersion
    }, userId)

    expect(updatedBoard.version).toBe(currentVersion + 1)
    expect(updatedBoard.name).toBe('Updated Board')
  })

  it('Board: should reject updates with incorrect version', async () => {
    const board = await boardRepository.findById(boardId)
    expect(board).not.toBeNull()
    const currentVersion = board!.version

    const staleVersion = currentVersion - 1

    try {
      await boardService.updateBoard(boardId, {
        name: 'Conflict Board',
        version: staleVersion
      }, userId)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictError)
    }
  })
})
