/**
 * Opening difficulty curve for human matches.
 * Demo stays medium for spectacle; first game of a human match opens easy.
 */

export type MatchDifficulty = 'easy' | 'medium' | 'hard'

/**
 * Opponent AI difficulty for the current match state.
 * Ramps to medium after either side has won a game (default: after game 1).
 */
export function opponentMatchDifficulty(input: {
  demoMode: boolean
  gamesWonPlayer: number
  gamesWonOpponent: number
}): MatchDifficulty {
  if (input.demoMode) return 'medium'
  if (input.gamesWonPlayer === 0 && input.gamesWonOpponent === 0) return 'easy'
  return 'medium'
}
