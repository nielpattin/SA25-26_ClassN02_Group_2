import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * Generate a position string between two existing positions.
 * Used for optimistic updates when reordering items.
 */
export const generatePosition = (before: string | null, after: string | null): string => {
  return generateKeyBetween(before, after)
}

/**
 * Generate multiple position strings between two existing positions.
 * Used for bulk inserts.
 */
export const generatePositions = (before: string | null, after: string | null, count: number): string[] => {
  return generateNKeysBetween(before, after, count)
}

/**
 * Get position for inserting at a specific index in an ordered list.
 * Returns { before, after } positions to pass to generatePosition.
 */
export const getPositionBounds = <T extends { position: string }>(
  items: T[],
  targetIndex: number
): { before: string | null; after: string | null } => {
  const sortedItems = [...items].sort((a, b) => a.position.localeCompare(b.position))
  
  const before = targetIndex > 0 ? sortedItems[targetIndex - 1]?.position ?? null : null
  const after = targetIndex < sortedItems.length ? sortedItems[targetIndex]?.position ?? null : null
  
  return { before, after }
}

/**
 * Calculate new position for an item being moved to a target index.
 */
export const calculateNewPosition = <T extends { position: string }>(
  items: T[],
  targetIndex: number
): string => {
  const { before, after } = getPositionBounds(items, targetIndex)
  return generatePosition(before, after)
}
