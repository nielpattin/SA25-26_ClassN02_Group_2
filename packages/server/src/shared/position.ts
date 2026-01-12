import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * Generate a position string between two existing positions.
 * @param before - Position to place after (null = place at start)
 * @param after - Position to place before (null = place at end)
 * @returns A new position string lexicographically between before and after
 */
export const generatePosition = (before: string | null, after: string | null): string => {
  return generateKeyBetween(before, after)
}

/**
 * Generate multiple position strings between two existing positions.
 * Useful for bulk inserts or rebalancing operations.
 * @param before - Position to place after (null = place at start)
 * @param after - Position to place before (null = place at end)
 * @param count - Number of positions to generate
 * @returns Array of position strings, evenly distributed between before and after
 */
export const generatePositions = (before: string | null, after: string | null, count: number): string[] => {
  return generateNKeysBetween(before, after, count)
}

/**
 * Check if a position string is getting too long and may need rebalancing.
 * Positions grow longer with repeated insertions in the same spot.
 * @param position - Position string to check
 * @param threshold - Maximum acceptable length (default: 50 characters)
 * @returns true if position exceeds threshold and rebalancing is recommended
 */
export const needsRebalancing = (position: string, threshold = 50): boolean => {
  return position.length > threshold
}
