import { useEffect } from 'react'
import { create } from 'zustand'
import { LOFT_NEUTRAL } from '../systems/shotContext'
import { AIM_NEUTRAL } from '../systems/aimRotation'

/**
 * Squash movement timing constants (from biomechanics research)
 *
 * Shot timing (single intensity axis = hold duration):
 * - Tap: < 120ms → ~30% power
 * - Drive: mid charge → ~55% power
 * - Smash: 750ms → 100% power
 */
export const MOVEMENT_TIMING = {
  SPLIT_STEP_DURATION: 100,    // ms - brief hop before explosive movement
  MAX_CHARGE_TIME: 750,        // ms - full power charge for smash (0.75s)
  QUICK_SHOT_THRESHOLD: 120,   // ms - taps shorter than this = quick shot
  RACQUET_PREP_TIME: 150,      // ms - quick backswing phase
  BODY_COIL_TIME: 400,         // ms - torso rotation phase (reaching charged state)
  FOLLOW_THROUGH_TIME: 200,    // ms - post-hit momentum
  SWING_DURATION: 350,         // ms - active swing window for hit detection (extended for easier hits)
}

/** Minimum power for a quick tap (also first charge-ring tick). */
export const MIN_SHOT_POWER = 0.3

/**
 * Length band levels for charge UI ticks: tap / drive / full length.
 * Endpoints match `chargeDurationToPower` (0.3 and 1.0). The middle mark (0.55) is a
 * labeled drive cue, not the exact mid-hold lerp (~0.65) — keep it for readable thirds.
 * Player-facing copy says length (depth/pace), not loft height.
 */
export const POWER_BAND_LEVELS = [MIN_SHOT_POWER, 0.55, 1.0] as const

/** Player-facing labels for `POWER_BAND_LEVELS` (internal field stays `power`). */
export const LENGTH_BAND_LABELS = ['tap', 'drive', 'length'] as const

/** Chase/strafe multiplier while Button A is held (Mario-style charge tax). */
export const CHARGE_MOVE_SPEED_SCALE = 0.62

/**
 * Aim along the 180° front-wall cone while button A is held: 0 = left, 0.5 = front,
 * 1 = right. Power stays on hold duration; aim is this axis alone.
 */
export const AIM_AXIS_SPEED = 1.4

/** Full aim sweep maps to this many CSS pixels of horizontal mouse / touch drag. */
export const AIM_DRAG_PX = 160

/** Re-export so HUD / tests keep importing neutrals from the input module. */
export { LOFT_NEUTRAL, AIM_NEUTRAL }

/**
 * Fraction of `AIM_DRAG_PX` ignored on vertical drag before loft leaves neutral.
 * Large deadzones made height feel broken on short mouse/touch drags.
 */
export const LOFT_DRAG_DEADZONE = 0.2

/**
 * Map horizontal drag to aim 0–1 (neutral centre). Drag right → higher aim → court right.
 * @param deltaXPx `clientX - originX`
 */
export function applyAimDrag(deltaXPx: number): number {
  return Math.min(1, Math.max(0, AIM_NEUTRAL + deltaXPx / AIM_DRAG_PX))
}

/**
 * Map vertical drag to loft 0–1 (attack plane).
 * Player-relative: drag toward front wall (screen-up, positive `originY - clientY`) =
 * from above (lower loft); drag toward camera (screen-down) = from below (higher loft).
 * @param deltaYPx `originY - clientY`
 */
export function applyLoftDrag(deltaYPx: number): number {
  const deadzonePx = LOFT_DRAG_DEADZONE * AIM_DRAG_PX
  if (Math.abs(deltaYPx) <= deadzonePx) return LOFT_NEUTRAL
  // Invert vs screen-up-raises-loft: front stick closes the face.
  const sign = deltaYPx > 0 ? -1 : 1
  const excess = Math.abs(deltaYPx) - deadzonePx
  const activeRange = AIM_DRAG_PX * (1 - LOFT_DRAG_DEADZONE)
  const t = Math.min(1, excess / activeRange)
  return Math.min(1, Math.max(0, LOFT_NEUTRAL + sign * t * LOFT_NEUTRAL))
}

interface InputState {
  // Button A: Charge/Shot (Space, LMB, or right touch)
  buttonA: {
    pressed: boolean
    holdStart: number | null
    holdDuration: number
  }
  // Button B: Chase/Move (Shift, RMB, or left touch)
  buttonB: {
    pressed: boolean
    pressStart: number | null
  }
  // Swing state: active for SWING_DURATION ms after release
  swing: {
    active: boolean
    startTime: number | null
    power: number  // Power level (0-1) at time of swing
  }
  /** Shot aim 0–1 along the arc (independent of charge power). */
  aim: number
  /** Held keyboard aim: -1 left, 0 none, +1 right. Touch writes `aim` directly. */
  aimAxis: -1 | 0 | 1
  /** Front-wall height aim 0–1 while charging (0.5 = neutral). */
  loft: number
  /** Held keyboard loft: -1 down, 0 none, +1 up. Touch/mouse write `loft` via drag. */
  loftAxis: -1 | 0 | 1
  // Actions
  pressButtonA: () => void
  releaseButtonA: () => number // Returns hold duration
  pressButtonB: () => void
  releaseButtonB: () => void
  updateHoldDuration: () => void
  startSwing: (power: number) => void
  endSwing: () => void
  setAim: (aim: number) => void
  setAimAxis: (axis: -1 | 0 | 1) => void
  /** Advance aim from a held axis; call from `useFrame` with clamped delta. */
  tickAim: (deltaSeconds: number) => void
  setLoft: (loft: number) => void
  setLoftAxis: (axis: -1 | 0 | 1) => void
  /** Advance loft from a held axis; call from `useFrame` with clamped delta. */
  tickLoft: (deltaSeconds: number) => void
}

export const useInputStore = create<InputState>((set, get) => ({
  buttonA: {
    pressed: false,
    holdStart: null,
    holdDuration: 0
  },
  buttonB: {
    pressed: false,
    pressStart: null
  },
  swing: {
    active: false,
    startTime: null,
    power: 0
  },
  aim: AIM_NEUTRAL,
  aimAxis: 0,
  loft: LOFT_NEUTRAL,
  loftAxis: 0,

  pressButtonA: () => set(() => ({
    buttonA: {
      pressed: true,
      holdStart: Date.now(),
      holdDuration: 0
    },
    // Centre the 180° cone; leave aimAxis alone so arrows held before Space still steer.
    aim: AIM_NEUTRAL,
    // Neutral loft preserves prior auto angles until the player steers height.
    loft: LOFT_NEUTRAL,
  })),

  releaseButtonA: () => {
    const state = get()
    const duration = state.buttonA.holdStart
      ? (Date.now() - state.buttonA.holdStart) / 1000
      : 0
    set({
      buttonA: {
        pressed: false,
        holdStart: null,
        holdDuration: 0
      },
      aimAxis: 0,
      loftAxis: 0,
    })
    return duration
  },
  
  pressButtonB: () => set({ 
    buttonB: { 
      pressed: true,
      pressStart: Date.now()
    } 
  }),
  
  releaseButtonB: () => set({ 
    buttonB: { 
      pressed: false,
      pressStart: null
    } 
  }),
  
  updateHoldDuration: () => set(state => {
    if (!state.buttonA.holdStart) return state
    return {
      buttonA: {
        ...state.buttonA,
        holdDuration: (Date.now() - state.buttonA.holdStart) / 1000
      }
    }
  }),
  
  startSwing: (power: number) => set({
    swing: {
      active: true,
      startTime: Date.now(),
      power
    }
  }),
  
  endSwing: () => set({
    swing: {
      active: false,
      startTime: null,
      power: 0
    }
  }),

  setAim: (aim: number) => set({
    aim: Math.min(1, Math.max(0, aim)),
  }),

  setAimAxis: (aimAxis: -1 | 0 | 1) => set({ aimAxis }),

  tickAim: (deltaSeconds: number) => {
    const { buttonA, aimAxis, aim } = get()
    if (!buttonA.pressed || aimAxis === 0) return
    const next = aim + aimAxis * AIM_AXIS_SPEED * deltaSeconds
    set({ aim: Math.min(1, Math.max(0, next)) })
  },

  setLoft: (loft: number) => set({
    loft: Math.min(1, Math.max(0, loft)),
  }),

  setLoftAxis: (loftAxis: -1 | 0 | 1) => set({ loftAxis }),

  tickLoft: (deltaSeconds: number) => {
    const { buttonA, loftAxis, loft } = get()
    if (!buttonA.pressed || loftAxis === 0) return
    const next = loft + loftAxis * AIM_AXIS_SPEED * deltaSeconds
    set({ loft: Math.min(1, Math.max(0, next)) })
  },
}))

/**
 * Button A means different things depending on game phase (advance the phase, or charge
 * and release a shot). Keyboard, mouse, and touch all reach the same logic via
 * `pressButtonAction` / `releaseButtonAction`. `usePhaseInput` registers the handlers.
 */
export interface ButtonAActions {
  press: () => void
  release: () => void
}

let buttonAActions: ButtonAActions | null = null

export function registerButtonAActions(actions: ButtonAActions | null): void {
  buttonAActions = actions
}

/** Single entry point for "button A pressed", whatever the input device. */
export function pressButtonAction(): void {
  buttonAActions?.press()
}

/** Single entry point for "button A released", whatever the input device. */
export function releaseButtonAction(): void {
  buttonAActions?.release()
}

function axisFromKeys(neg: boolean, pos: boolean): -1 | 0 | 1 {
  if (neg === pos) return 0
  return neg ? -1 : 1
}

// Hook to set up keyboard listeners
export function useKeyboardInput(): void {
  const pressButtonB = useInputStore(state => state.pressButtonB)
  const releaseButtonB = useInputStore(state => state.releaseButtonB)
  const setAimAxis = useInputStore(state => state.setAimAxis)
  const setLoftAxis = useInputStore(state => state.setLoftAxis)

  useEffect(() => {
    const held = { left: false, right: false, down: false, up: false }

    const syncAimAxis = (): void => {
      setAimAxis(axisFromKeys(held.left, held.right))
    }

    const syncLoftAxis = (): void => {
      // W/↑ = toward front wall = from above = lower loft; S/↓ = from below = higher loft.
      setLoftAxis(axisFromKeys(held.up, held.down))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          if (e.repeat) return
          e.preventDefault()
          pressButtonAction()
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          if (e.repeat) return
          pressButtonB()
          break
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault()
          held.left = true
          syncAimAxis()
          break
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault()
          held.right = true
          syncAimAxis()
          break
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault()
          held.down = true
          syncLoftAxis()
          break
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault()
          held.up = true
          syncLoftAxis()
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          releaseButtonAction()
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          releaseButtonB()
          break
        case 'ArrowLeft':
        case 'KeyA':
          held.left = false
          syncAimAxis()
          break
        case 'ArrowRight':
        case 'KeyD':
          held.right = false
          syncAimAxis()
          break
        case 'ArrowDown':
        case 'KeyS':
          held.down = false
          syncLoftAxis()
          break
        case 'ArrowUp':
        case 'KeyW':
          held.up = false
          syncLoftAxis()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [pressButtonB, releaseButtonB, setAimAxis, setLoftAxis])
}

/**
 * Mouse: LMB = button A (charge / phase advance), RMB = button B (chase).
 * Drag while LMB held: X → aim, Y → loft (with deadzone). Same as right touch zone.
 * Skipped on coarse pointers so TouchControls owns the screen halves.
 */
export function useMouseInput(): void {
  const pressButtonB = useInputStore(state => state.pressButtonB)
  const releaseButtonB = useInputStore(state => state.releaseButtonB)
  const setAim = useInputStore(state => state.setAim)
  const setLoft = useInputStore(state => state.setLoft)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let lmbDown = false
    let rmbDown = false
    let aimOriginX: number | null = null
    let loftOriginY: number | null = null

    const clearAimOrigins = (): void => {
      aimOriginX = null
      loftOriginY = null
    }

    const releaseAll = (): void => {
      if (lmbDown) {
        lmbDown = false
        clearAimOrigins()
        releaseButtonAction()
      }
      if (rmbDown) {
        rmbDown = false
        releaseButtonB()
      }
      clearAimOrigins()
    }

    const handleMouseDown = (e: MouseEvent): void => {
      if (e.button === 0) {
        e.preventDefault()
        if (lmbDown) return
        lmbDown = true
        aimOriginX = e.clientX
        loftOriginY = e.clientY
        pressButtonAction()
        return
      }
      if (e.button === 2) {
        e.preventDefault()
        if (rmbDown) return
        rmbDown = true
        pressButtonB()
      }
    }

    const handleMouseUp = (e: MouseEvent): void => {
      if (e.button === 0 && lmbDown) {
        lmbDown = false
        clearAimOrigins()
        releaseButtonAction()
        return
      }
      if (e.button === 2 && rmbDown) {
        rmbDown = false
        releaseButtonB()
      }
    }

    const handleMouseMove = (e: MouseEvent): void => {
      if (!useInputStore.getState().buttonA.pressed) {
        if (!lmbDown) clearAimOrigins()
        return
      }
      // Space charge + mouse: latch origin on first move. LMB already set it on down.
      if (aimOriginX === null) aimOriginX = e.clientX
      if (loftOriginY === null) loftOriginY = e.clientY
      setAim(applyAimDrag(e.clientX - aimOriginX))
      setLoft(applyLoftDrag(loftOriginY - e.clientY))
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      // Space release ends charge without a mouseup — drop drag origins.
      if (e.code === 'Space' && !lmbDown) clearAimOrigins()
    }

    const handleContextMenu = (e: Event): void => {
      e.preventDefault()
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('blur', releaseAll)

    return () => {
      releaseAll()
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('blur', releaseAll)
    }
  }, [pressButtonB, releaseButtonB, setAim, setLoft])
}

// Hook to get normalized charge level (0-1)
export function useChargeLevel(): number {
  const holdDuration = useInputStore(state => state.buttonA.holdDuration)
  const maxChargeDuration = MOVEMENT_TIMING.MAX_CHARGE_TIME / 1000
  return Math.min(1, holdDuration / maxChargeDuration)
}

/** Map a button-A hold (seconds) onto shot power, with a floor for quick taps. */
export function chargeDurationToPower(duration: number): number {
  const quickShotThreshold = MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD / 1000
  const maxChargeSeconds = MOVEMENT_TIMING.MAX_CHARGE_TIME / 1000

  if (duration < quickShotThreshold) return MIN_SHOT_POWER

  const chargeTime = duration - quickShotThreshold
  const chargeRange = maxChargeSeconds - quickShotThreshold
  return Math.min(1, MIN_SHOT_POWER + (chargeTime / chargeRange) * (1 - MIN_SHOT_POWER))
}

/**
 * The power the shot would have if button A were released right now. The charge preview
 * must use this rather than `useChargeLevel`, or the previewed shot type can differ from
 * the one actually executed.
 */
export function usePendingShotPower(): number {
  const holdDuration = useInputStore(state => state.buttonA.holdDuration)
  return chargeDurationToPower(holdDuration)
}

/**
 * Get current charge phase based on hold duration
 * Phases: none -> racquetPrep -> bodyCoil -> powerLoad
 * 
 * Quick shot: < 120ms (no visible charge phase)
 * Charged: 120-750ms scales through phases to smash
 */
export function useChargePhase(): 'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad' {
  const holdDuration = useInputStore(state => state.buttonA.holdDuration) * 1000 // to ms
  const pressed = useInputStore(state => state.buttonA.pressed)
  
  if (!pressed || holdDuration === 0) return 'none'
  if (holdDuration < MOVEMENT_TIMING.RACQUET_PREP_TIME + MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD) return 'racquetPrep'
  if (holdDuration < MOVEMENT_TIMING.BODY_COIL_TIME) return 'bodyCoil'
  return 'powerLoad'
}

// Hook to check if chasing
export function useIsChasing(): boolean {
  return useInputStore(state => state.buttonB.pressed)
}

// Hook to check if charging
export function useIsCharging(): boolean {
  return useInputStore(state => state.buttonA.pressed)
}

// Hook to get charge start time (for swing animation)
export function useChargeStartTime(): number | null {
  return useInputStore(state => state.buttonA.holdStart)
}

// Hook to get chase start time (for split-step timing)
export function useChaseStartTime(): number | null {
  return useInputStore(state => state.buttonB.pressStart)
}

// Hook to check if currently swinging
export function useIsSwinging(): boolean {
  return useInputStore(state => state.swing.active)
}

// Hook to get swing start time
export function useSwingStartTime(): number | null {
  return useInputStore(state => state.swing.startTime)
}

// Hook to get swing power
export function useSwingPower(): number {
  return useInputStore(state => state.swing.power)
}

/** Current aim along the shot arc (0–1), independent of charge power. */
export function useAim(): number {
  return useInputStore(state => state.aim)
}

/** Current loft (0–1), independent of charge power. Neutral is 0.5. */
export function useLoft(): number {
  return useInputStore(state => state.loft)
}
