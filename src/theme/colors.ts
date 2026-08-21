/**
 * sq_ color system — black/white court substrate, cool/warm identity accents, dark-only.
 *
 * Hex is the gameplay source of truth (Three `meshBasicMaterial`). CSS custom properties
 * in `tokens.css` mirror these for residual DOM. Court lines are near-white; player neon
 * is reserved for athletes, scores, and feedback — not the court mesh.
 *
 * Accents are authored off pure spectrum (`#00ffff` / `#ff6600`) so they stay game-neon
 * under bloom without reading as default AI cyan/orange.
 */

/** Primitive + semantic hex tokens for the Canvas and shared constants. */
export const HEX = {
  /** Scene / page substrate — near-black with a cool cast (not pure #000). */
  void: '#070a0e',
  /** Primary HUD ink. */
  ink: '#eef6f7',
  /** Secondary HUD ink (prompts, separators). */
  inkMuted: '#9aadb2',
  /** Player neon — ice teal-cyan (not pure #00ffff). */
  player: '#1ad9e8',
  /** Opponent neon — amber-orange (not pure #ff6600). */
  opponent: '#f06e14',
  /**
   * Ball — same family as opponent but hotter, so the two do not read as one mass
   * (audit F7). Still clearly “squash orange.”
   */
  ball: '#ff8f2e',
  /** Tin hit flash — same hue as opponent danger. */
  tinDanger: '#f06e14',
  /** Court line / default tin idle — near-white (decoupled from player neon). */
  courtLine: '#f2f4f5',
  /** Game point — amber (not pure yellow). */
  gamePoint: '#e6c04a',
  /** Match point — magenta, slightly softened. */
  matchPoint: '#d94fff',
  /** Inactive games-won pip (player) — solid muted cyan for ≥3:1 on void. */
  playerPipOff: '#1a555c',
  /** Inactive games-won pip (opponent). */
  opponentPipOff: '#5c2e0e',
} as const

/** CSS variable names matching `tokens.css` semantics. */
export const cssVar = {
  void: 'var(--color-void)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  player: 'var(--color-player)',
  opponent: 'var(--color-opponent)',
  ball: 'var(--color-ball)',
  tinDanger: 'var(--color-tin-danger)',
  courtLine: 'var(--color-court-line)',
  gamePoint: 'var(--color-game-point)',
  matchPoint: 'var(--color-match-point)',
  playerPipOff: 'var(--color-player-pip-off)',
  opponentPipOff: 'var(--color-opponent-pip-off)',
  glowPlayer: 'var(--glow-player)',
  glowOpponent: 'var(--glow-opponent)',
  glowInk: 'var(--glow-ink)',
  glowMatch: 'var(--glow-match)',
  glowGame: 'var(--glow-game)',
} as const
