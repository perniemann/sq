/**
 * Troika / drei `Text` font URLs — explicit faces for diegetic HUD (no default troika face).
 * `.woff` is supported by troika-three-text; latin subset keeps the worker payload small.
 *
 * Display = Chakra Petch (technical arcade). Utility = IBM Plex Mono.
 */
import chakraPetchBoldUrl from '@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff?url'
import chakraPetchRegularUrl from '@fontsource/chakra-petch/files/chakra-petch-latin-400-normal.woff?url'
import plexMonoBoldUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff?url'
import plexMonoRegularUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url'

/** CSS / DOM display stack (matches @fontsource CSS family name). */
export const FONT_DISPLAY_STACK =
  '"Chakra Petch", Bahnschrift, "Segoe UI", sans-serif'

/** CSS / DOM utility stack. */
export const FONT_UTILITY_STACK =
  '"IBM Plex Mono", ui-monospace, monospace'

/** Display / title (Chakra Petch 700). */
export const FONT_DISPLAY = chakraPetchBoldUrl

/** Reading / teach tips (Chakra Petch 400). */
export const FONT_READING = chakraPetchRegularUrl

/** Score digits, CTAs, utility labels (IBM Plex Mono 700). */
export const FONT_UTILITY = plexMonoBoldUrl

/** Muted utility (version string). */
export const FONT_UTILITY_REGULAR = plexMonoRegularUrl
