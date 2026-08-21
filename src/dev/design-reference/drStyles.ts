import type { CSSProperties } from 'react'
import { cssVar } from '../../theme/colors'

/** Shared inline styles for the design reference page (sq_ look, no CSS framework). */
export const drFontDisplay = 'Outfit, Bahnschrift, "Segoe UI", system-ui, sans-serif'
export const drFontUtility = '"IBM Plex Mono", ui-monospace, monospace'

export const drPage: CSSProperties = {
  minHeight: '100vh',
  background: cssVar.void,
  color: cssVar.ink,
  fontFamily: drFontDisplay,
}

export const drSkipLink: CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 8,
  zIndex: 100,
  padding: '8px 14px',
  background: cssVar.void,
  color: cssVar.player,
  fontFamily: drFontUtility,
  fontSize: 13,
}

export const drHeader: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 40,
  borderBottom: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 35%, transparent)`,
  background: 'color-mix(in oklch, var(--color-void) 92%, transparent)',
  backdropFilter: 'blur(8px)',
  padding: '14px 20px',
}

export const drHeaderInner: CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'baseline',
  justifyContent: 'space-between',
}

export const drH1: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: cssVar.player,
  textShadow: cssVar.glowPlayer,
}

export const drLede: CSSProperties = {
  margin: '6px 0 0',
  maxWidth: '65ch',
  fontSize: 14,
  lineHeight: 1.5,
  color: cssVar.inkMuted,
  fontFamily: drFontUtility,
}

export const drLink: CSSProperties = {
  color: cssVar.player,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  fontFamily: drFontUtility,
  fontSize: 13,
}

export const drShell: CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '28px 20px 96px',
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 40,
  alignItems: 'flex-start',
}

export const drAside: CSSProperties = {
  flex: '0 0 180px',
  position: 'sticky',
  top: 88,
  alignSelf: 'flex-start',
}

export const drTocLabel: CSSProperties = {
  margin: '0 0 8px',
  fontFamily: drFontUtility,
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: cssVar.inkMuted,
}

export const drTocList: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

export const drTocLink: CSSProperties = {
  color: cssVar.inkMuted,
  textDecoration: 'none',
  fontFamily: drFontUtility,
  fontSize: 13,
}

export const drMain: CSSProperties = {
  flex: '1 1 320px',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 56,
}

export const drSection: CSSProperties = {
  scrollMarginTop: 96,
  paddingBottom: 40,
  borderBottom: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 28%, transparent)`,
}

export const drH2: CSSProperties = {
  margin: '0 0 20px',
  fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: cssVar.ink,
}

export const drArticle: CSSProperties = {
  scrollMarginTop: 96,
  marginBottom: 28,
  paddingBottom: 20,
  borderBottom: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 18%, transparent)`,
}

export const drH3: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: cssVar.player,
  fontFamily: drFontDisplay,
}

export const drPath: CSSProperties = {
  display: 'block',
  marginTop: 4,
  fontFamily: drFontUtility,
  fontSize: 11,
  color: cssVar.inkMuted,
  wordBreak: 'break-all',
}

export const drHint: CSSProperties = {
  margin: '6px 0 0',
  maxWidth: '65ch',
  fontFamily: drFontUtility,
  fontSize: 12,
  lineHeight: 1.45,
  color: cssVar.inkMuted,
}

export const drSpecimenBody: CSSProperties = {
  marginTop: 14,
  minWidth: 0,
}

export const drFeatured: CSSProperties = {
  padding: '20px 0 8px',
  marginBottom: 8,
}
