/**
 * Troika / drei `Text` font URLs — explicit faces for diegetic HUD (no default troika face).
 * `.woff` is supported by troika-three-text; latin subset keeps the worker payload small.
 */
import outfitBoldUrl from '@fontsource/outfit/files/outfit-latin-800-normal.woff?url'
import outfitRegularUrl from '@fontsource/outfit/files/outfit-latin-400-normal.woff?url'
import plexMonoBoldUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff?url'
import plexMonoRegularUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url'

/** Display / title (Outfit 800). */
export const FONT_DISPLAY = outfitBoldUrl

/** Reading / teach tips (Outfit 400). */
export const FONT_READING = outfitRegularUrl

/** Score digits, CTAs, utility labels (IBM Plex Mono 700). */
export const FONT_UTILITY = plexMonoBoldUrl

/** Muted utility (version string). */
export const FONT_UTILITY_REGULAR = plexMonoRegularUrl
