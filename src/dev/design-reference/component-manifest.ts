// Coverage source of truth for src/ui and src/components .tsx modules.
// Kept in sync with scripts/design-reference-coverage.mjs.

export type ManifestKind = 'specimen' | 'excluded'

export interface ComponentManifestEntry {
  /** Path relative to `src/`, forward slashes */
  readonly file: string
  readonly sectionId: string
  readonly displayTitle: string
  readonly kind: ManifestKind
  readonly reason?: string
}

export const COMPONENT_MANIFEST: readonly ComponentManifestEntry[] = [
  {
    file: 'ui/StartLockup.tsx',
    sectionId: 'dr-kit',
    displayTitle: 'StartLockup',
    kind: 'specimen',
  },
  {
    file: 'ui/Scoreboard.tsx',
    sectionId: 'dr-kit',
    displayTitle: 'Scoreboard',
    kind: 'specimen',
  },
  {
    file: 'ui/TinGameplay.tsx',
    sectionId: 'dr-kit',
    displayTitle: 'TinGameplay',
    kind: 'specimen',
  },
  {
    file: 'components/ErrorBoundary.tsx',
    sectionId: 'dr-kit',
    displayTitle: 'ErrorBoundary fallback',
    kind: 'specimen',
  },
  {
    file: 'ui/HUD.tsx',
    sectionId: 'dr-system',
    displayTitle: 'HUD (aria-live)',
    kind: 'excluded',
    reason:
      'Binds gameStore; catalog shows a static aria-live stub instead of mounting live HUD.',
  },
  {
    file: 'ui/TouchControls.tsx',
    sectionId: 'dr-system',
    displayTitle: 'TouchControls',
    kind: 'excluded',
    reason: 'Invisible half-screen input layer; no visible chrome to specimen.',
  },
  {
    file: 'components/Scene.tsx',
    sectionId: 'dr-system',
    displayTitle: 'Scene',
    kind: 'excluded',
    reason: 'Requires Canvas + Physics + full game loop.',
  },
  {
    file: 'components/Player.tsx',
    sectionId: 'dr-system',
    displayTitle: 'Player',
    kind: 'excluded',
    reason: 'Requires Rapier bodies and Scene context.',
  },
  {
    file: 'components/Ball.tsx',
    sectionId: 'dr-system',
    displayTitle: 'Ball',
    kind: 'excluded',
    reason: 'Requires Rapier + Scene context.',
  },
  {
    file: 'components/Court.tsx',
    sectionId: 'dr-system',
    displayTitle: 'Court',
    kind: 'excluded',
    reason: 'Requires Canvas; WSF geometry documented in systems/court.ts.',
  },
  {
    file: 'components/WorldHud.tsx',
    sectionId: 'dr-system',
    displayTitle: 'WorldHud',
    kind: 'excluded',
    reason: 'Diegetic front-wall HUD via troika Text; needs R3F scene.',
  },
  {
    file: 'components/GameCamera.tsx',
    sectionId: 'dr-system',
    displayTitle: 'GameCamera',
    kind: 'excluded',
    reason: 'Camera rig inside Canvas.',
  },
  {
    file: 'components/OrbitDebug.tsx',
    sectionId: 'dr-system',
    displayTitle: 'OrbitDebug',
    kind: 'excluded',
    reason: 'Dev orbit helper; gated by ?orbit.',
  },
] as const
