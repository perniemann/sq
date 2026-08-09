import { useEffect } from 'react'
import { create } from 'zustand'

/**
 * Squash movement timing constants (from biomechanics research)
 * 
 * Shot timing:
 * - Quick shot (tap): < 120ms = instant shot with ~30% power
 * - Charged shot: 120-750ms = power scales from 30% to 100% (smash)
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

/**
 * Aim along the charge arc while button A is held: 0 = face the front wall, 1 = full
 * `ROTATION_CONFIG.arcRange`. Power stays on hold duration; aim is this axis alone.
 */
export const AIM_AXIS_SPEED = 1.4

/** Full aim sweep maps to this many CSS pixels of horizontal mouse / touch drag. */
export const AIM_DRAG_PX = 160

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
  aim: 0,
  aimAxis: 0,
  
  pressButtonA: () => set(() => ({
    buttonA: {
      pressed: true,
      holdStart: Date.now(),
      holdDuration: 0
    },
    // Reset aim for the new charge; leave aimAxis alone so arrows held before Space still steer.
    aim: 0,
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

function aimAxisFromKeys(left: boolean, right: boolean): -1 | 0 | 1 {
  if (left === right) return 0
  return left ? -1 : 1
}

// Hook to set up keyboard listeners
export function useKeyboardInput(): void {
  const pressButtonB = useInputStore(state => state.pressButtonB)
  const releaseButtonB = useInputStore(state => state.releaseButtonB)
  const setAimAxis = useInputStore(state => state.setAimAxis)
  
  useEffect(() => {
    const held = { left: false, right: false }

    const syncAimAxis = (): void => {
      setAimAxis(aimAxisFromKeys(held.left, held.right))
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
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [pressButtonB, releaseButtonB, setAimAxis])
}

/**
 * Mouse: LMB = button A (charge / phase advance), RMB = button B (chase).
 * Horizontal drag while LMB is held sets aim (same mapping as the right touch zone).
 * Skipped on coarse pointers so TouchControls owns the screen halves.
 */
export function useMouseInput(): void {
  const pressButtonB = useInputStore(state => state.pressButtonB)
  const releaseButtonB = useInputStore(state => state.releaseButtonB)
  const setAim = useInputStore(state => state.setAim)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let lmbDown = false
    let rmbDown = false
    let aimOriginX: number | null = null

    const releaseAll = (): void => {
      if (lmbDown) {
        lmbDown = false
        aimOriginX = null
        releaseButtonAction()
      }
      if (rmbDown) {
        rmbDown = false
        releaseButtonB()
      }
    }

    const handleMouseDown = (e: MouseEvent): void => {
      if (e.button === 0) {
        e.preventDefault()
        if (lmbDown) return
        lmbDown = true
        aimOriginX = e.clientX
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
        aimOriginX = null
        releaseButtonAction()
        return
      }
      if (e.button === 2 && rmbDown) {
        rmbDown = false
        releaseButtonB()
      }
    }

    const handleMouseMove = (e: MouseEvent): void => {
      if (!lmbDown || aimOriginX === null) return
      if (!useInputStore.getState().buttonA.pressed) return
      setAim((e.clientX - aimOriginX) / AIM_DRAG_PX)
    }

    const handleContextMenu = (e: Event): void => {
      e.preventDefault()
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('blur', releaseAll)

    return () => {
      releaseAll()
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('blur', releaseAll)
    }
  }, [pressButtonB, releaseButtonB, setAim])
}

// Hook to get normalized charge level (0-1)
export function useChargeLevel(): number {
  const holdDuration = useInputStore(state => state.buttonA.holdDuration)
  const maxChargeDuration = MOVEMENT_TIMING.MAX_CHARGE_TIME / 1000
  return Math.min(1, holdDuration / maxChargeDuration)
}

/** Minimum power for a quick tap, before any charge is applied. */
const MIN_POWER = 0.3

/** Map a button-A hold (seconds) onto shot power, with a floor for quick taps. */
export function chargeDurationToPower(duration: number): number {
  const quickShotThreshold = MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD / 1000
  const maxChargeSeconds = MOVEMENT_TIMING.MAX_CHARGE_TIME / 1000

  if (duration < quickShotThreshold) return MIN_POWER

  const chargeTime = duration - quickShotThreshold
  const chargeRange = maxChargeSeconds - quickShotThreshold
  return Math.min(1, MIN_POWER + (chargeTime / chargeRange) * (1 - MIN_POWER))
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
