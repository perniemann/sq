import { create } from 'zustand'
import {
  INITIAL_TEACH_PROGRESS,
  advanceTeachProgress,
  type TeachProgress,
} from '../systems/teachPrompts'

type TeachEvent = 'served' | 'returned' | 'chased' | 'doubleBounceSeen'

type TeachStore = {
  progress: TeachProgress
  reset: () => void
  advance: (event: TeachEvent) => void
}

/** Single teach-tip progress owner for WorldHud + aria-live HUD. */
export const useTeachStore = create<TeachStore>((set, get) => ({
  progress: { ...INITIAL_TEACH_PROGRESS },
  reset: () => set({ progress: { ...INITIAL_TEACH_PROGRESS } }),
  advance: (event) => {
    const next = advanceTeachProgress(get().progress, event)
    if (next === get().progress) return
    set({ progress: next })
  },
}))
