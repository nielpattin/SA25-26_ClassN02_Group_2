import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test'
import { presenceManager } from '../websocket/presence'
import { wsManager } from '../websocket/manager'

describe('presenceManager', () => {
  let broadcastSpy: any

  beforeEach(() => {
    broadcastSpy = spyOn(wsManager, 'broadcast').mockImplementation(() => {})
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
  })

  it('throttles broadcasts to once per second', async () => {
    const boardId = 'test-board'
    const user1 = { id: 'user-1', name: 'User 1' }
    const user2 = { id: 'user-2', name: 'User 2' }

    // Join user 1 - should trigger a throttled broadcast
    presenceManager.join(boardId, user1)
    
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(broadcastSpy).not.toHaveBeenCalled()

    // Join user 2 immediately - should still be throttled
    presenceManager.join(boardId, user2)
    
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Now it should have been called once with both users
    expect(broadcastSpy).toHaveBeenCalledTimes(1)
    expect(broadcastSpy).toHaveBeenCalledWith(`board:${boardId}`, {
      type: 'presence:updated',
      data: expect.arrayContaining([user1, user2])
    })
  })
})
