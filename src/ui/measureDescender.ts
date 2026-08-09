/**
 * Pixel depth of the lowercase "q" descender for a CSS font shorthand.
 * Uses Canvas `actualBoundingBoxDescent` — the distance from baseline to
 * the bottom of "q", i.e. descender-only height (not the full glyph).
 */
export function measureQDescenderPx(fontCss: string): number {
  if (typeof document === 'undefined') return 0
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  ctx.font = fontCss
  const descent = ctx.measureText('q').actualBoundingBoxDescent
  return Number.isFinite(descent) ? Math.max(1, descent) : 0
}
