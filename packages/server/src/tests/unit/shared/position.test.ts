import { describe, expect, test } from 'bun:test'
import { generatePosition, generatePositions, needsRebalancing } from '../../../shared/position'

describe('generatePosition', () => {
  test('generates first position when both bounds are null', () => {
    const position = generatePosition(null, null)
    expect(position).toBe('a0')
  })

  test('generates position at end when after is null', () => {
    const position = generatePosition('a0', null)
    expect(position).toBe('a1')
  })

  test('generates position at start when before is null', () => {
    const position = generatePosition(null, 'a0')
    expect(position).toBe('Zz')
  })

  test('generates position between two existing positions', () => {
    const position = generatePosition('a0', 'a1')
    expect(position).toBe('a0V')
  })

  test('generates position between close positions', () => {
    const position = generatePosition('a0', 'a0V')
    expect(position).toBe('a0G')
  })

  test('positions maintain lexicographic order', () => {
    const first = generatePosition(null, null)      // a0
    const second = generatePosition(first, null)    // a1
    const between = generatePosition(first, second) // a0V
    
    const sorted = [second, first, between].sort((a, b) => a.localeCompare(b))
    expect(sorted).toEqual([first, between, second])
  })
})

describe('generatePositions', () => {
  test('generates multiple positions at once', () => {
    const positions = generatePositions(null, null, 3)
    expect(positions).toHaveLength(3)
    
    // Should be in lexicographic order
    const sorted = [...positions].sort((a, b) => a.localeCompare(b))
    expect(positions).toEqual(sorted)
  })

  test('generates positions between two bounds', () => {
    const positions = generatePositions('a0', 'a1', 2)
    expect(positions).toHaveLength(2)
    
    // All should be between a0 and a1
    positions.forEach(p => {
      expect(p.localeCompare('a0')).toBeGreaterThan(0)
      expect(p.localeCompare('a1')).toBeLessThan(0)
    })
  })
})

describe('needsRebalancing', () => {
  test('returns false for short positions', () => {
    expect(needsRebalancing('a0')).toBe(false)
    expect(needsRebalancing('a0V')).toBe(false)
    expect(needsRebalancing('a0VGGGGG')).toBe(false)
  })

  test('returns true for positions exceeding threshold', () => {
    const longPosition = 'a' + '0'.repeat(60)
    expect(needsRebalancing(longPosition)).toBe(true)
  })

  test('respects custom threshold', () => {
    const position = 'a0VGGGGG' // 8 chars
    expect(needsRebalancing(position, 5)).toBe(true)
    expect(needsRebalancing(position, 10)).toBe(false)
  })
})

describe('fractional indexing ordering scenarios', () => {
  test('supports many insertions at same position', () => {
    // Simulate inserting many items at the end
    let lastPosition: string | null = null
    const positions: string[] = []
    
    for (let i = 0; i < 20; i++) {
      const newPosition = generatePosition(lastPosition, null)
      positions.push(newPosition)
      lastPosition = newPosition
    }
    
    // All positions should be unique
    const unique = new Set(positions)
    expect(unique.size).toBe(20)
    
    // Should maintain order
    const sorted = [...positions].sort((a, b) => a.localeCompare(b))
    expect(positions).toEqual(sorted)
  })

  test('supports many insertions between two items', () => {
    // This simulates worst-case: always inserting in the same spot
    let before = 'a0'
    let after = 'a1'
    const positions: string[] = []
    
    for (let i = 0; i < 10; i++) {
      const newPosition = generatePosition(before, after)
      positions.push(newPosition)
      after = newPosition // Insert before the last inserted
    }
    
    // All positions should be unique
    const unique = new Set(positions)
    expect(unique.size).toBe(10)
    
    // Positions should grow but not exceed reasonable length
    const maxLength = Math.max(...positions.map(p => p.length))
    expect(maxLength).toBeLessThan(50) // Should be well under rebalance threshold
  })
})
