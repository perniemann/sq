/**
 * Squash Scoring System
 *
 * Implements official PARS-11 scoring (Point-A-Rally Scoring to 11)
 * with win-by-2 rule at 10-10 and best-of-3 match structure.
 *
 * noFrontWall (NOT UP) is detected via strike-to-wall order tracking in collision
 * handlers: the ball must reach the front wall before any other wall after a strike.
 */

/** Who can score/hit */
export type PlayerSide = 'player' | 'opponent'

/** Reasons for point being awarded */
export type PointReason = 
  | 'doubleBounce'  // Ball bounced twice before striker hit
  | 'tin'           // Ball hit tin (below tin line on front wall)
  | 'out'           // Ball went out of bounds (above out lines)
  | 'stroke'        // Interference - opponent blocked path
  | 'noFrontWall'   // Ball hit side/back/floor before front wall (NOT UP)
  | 'serve'         // Valid serve (starts rally, no point)
  | 'serveFault'    // Invalid serve (below service line or wrong landing zone)

/** Result of a rally */
export interface RallyResult {
  winner: PlayerSide
  reason: PointReason
}

/** Match configuration */
export interface MatchConfig {
  gamesToWin: number      // 2 for best-of-3, 3 for best-of-5
  pointsToWin: number     // 11 for standard PARS-11
  winByTwo: boolean       // Must win by 2 at 10-10
}

/** Current match state */
export interface MatchState {
  gamesWon: { player: number; opponent: number }
  currentGame: number     // 1-indexed game number
  config: MatchConfig
}

/** Current game score */
export interface GameScore {
  player: number
  opponent: number
}

/** Default match configuration (best of 3) */
export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  gamesToWin: 2,
  pointsToWin: 11,
  winByTwo: true
}

/**
 * Create initial match state
 */
export function createMatchState(config: MatchConfig = DEFAULT_MATCH_CONFIG): MatchState {
  return {
    gamesWon: { player: 0, opponent: 0 },
    currentGame: 1,
    config
  }
}

/**
 * Check if a player has won the current game
 * PARS-11: First to 11, must win by 2 if tied at 10-10
 */
export function checkGameWon(
  score: GameScore, 
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): PlayerSide | null {
  const { pointsToWin, winByTwo } = config
  const { player, opponent } = score
  
  // Standard win: reach pointsToWin with required lead
  if (player >= pointsToWin || opponent >= pointsToWin) {
    const lead = Math.abs(player - opponent)
    const requiredLead = winByTwo && (player >= pointsToWin - 1 && opponent >= pointsToWin - 1) ? 2 : 1
    
    if (lead >= requiredLead) {
      return player > opponent ? 'player' : 'opponent'
    }
  }
  
  return null
}

/**
 * Check if a player has won the match
 */
export function checkMatchWon(matchState: MatchState): PlayerSide | null {
  const { gamesWon, config } = matchState
  
  if (gamesWon.player >= config.gamesToWin) {
    return 'player'
  }
  if (gamesWon.opponent >= config.gamesToWin) {
    return 'opponent'
  }
  
  return null
}

/**
 * Award a point and return updated score
 * Returns the new score and whether the game was won
 */
export function awardPoint(
  score: GameScore,
  winner: PlayerSide,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): { newScore: GameScore; gameWinner: PlayerSide | null } {
  const newScore = {
    ...score,
    [winner]: score[winner] + 1
  }
  
  const gameWinner = checkGameWon(newScore, config)
  
  return { newScore, gameWinner }
}

/**
 * Award a game and return updated match state
 */
export function awardGame(
  matchState: MatchState,
  winner: PlayerSide
): { newMatchState: MatchState; matchWinner: PlayerSide | null } {
  const newMatchState: MatchState = {
    ...matchState,
    gamesWon: {
      ...matchState.gamesWon,
      [winner]: matchState.gamesWon[winner] + 1
    },
    currentGame: matchState.currentGame + 1
  }
  
  const matchWinner = checkMatchWon(newMatchState)
  
  return { newMatchState, matchWinner }
}

/**
 * Check if this point would win the game ("Game Ball")
 * At game point and leading (or opponent not at deuce); in deuce zone need at least 1-point lead.
 */
export function isGameBall(score: GameScore, config: MatchConfig = DEFAULT_MATCH_CONFIG): PlayerSide | null {
  const { pointsToWin, winByTwo } = config

  const inDeuce = winByTwo && score.player >= pointsToWin - 1 && score.opponent >= pointsToWin - 1

  if (score.player >= pointsToWin - 1 && (!inDeuce || score.player - score.opponent >= 1)) {
    return 'player'
  }
  if (score.opponent >= pointsToWin - 1 && (!inDeuce || score.opponent - score.player >= 1)) {
    return 'opponent'
  }
  return null
}

/**
 * Check if this point would win the match ("Match Ball")
 */
export function isMatchBall(
  score: GameScore, 
  matchState: MatchState
): PlayerSide | null {
  const gameBallHolder = isGameBall(score, matchState.config)
  
  if (!gameBallHolder) return null
  
  // Check if winning this game would win the match
  const gamesNeeded = matchState.config.gamesToWin
  if (matchState.gamesWon[gameBallHolder] === gamesNeeded - 1) {
    return gameBallHolder
  }
  
  return null
}

/**
 * Get display name for point reason
 */
export function getPointReasonDisplay(reason: PointReason): string {
  switch (reason) {
    case 'doubleBounce': return 'DOUBLE BOUNCE'
    case 'tin': return 'TIN'
    case 'out': return 'OUT'
    case 'stroke': return 'STROKE'
    case 'noFrontWall': return 'NOT UP'
    case 'serve': return 'SERVE'
    case 'serveFault': return 'FAULT'
  }
}

/**
 * Determine who gets the point based on rally result
 * In squash, the striker who made the error loses the point
 */
export function determinePointWinner(
  lastHitter: PlayerSide,
  currentStriker: PlayerSide,
  reason: PointReason
): PlayerSide {
  switch (reason) {
    case 'doubleBounce':
      // Current striker failed to return - point to last hitter
      return lastHitter
    case 'tin':
    case 'out':
    case 'noFrontWall':
    case 'serveFault':
      // Last hitter made an error - point to opponent
      return lastHitter === 'player' ? 'opponent' : 'player'
    case 'stroke':
      // Interference - point to the blocked player (current striker)
      return currentStriker
    default:
      return lastHitter
  }
}
