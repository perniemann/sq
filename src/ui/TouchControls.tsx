import { useEffect, useRef } from 'react'
import {
  applyAimDrag,
  applyLoftDrag,
  useInputStore,
  pressButtonAction,
  releaseButtonAction,
} from '../hooks/useInput'
import { HEX } from '../theme/colors'

/**
 * Mobile Touch Controls
 *
 * Left half of screen: Button B (chase/move toward ball)
 * Right half of screen: Button A (charge/shot); drag X = aim, drag Y = loft.
 *
 * Supports simultaneous touches for both buttons.
 * Visual feedback is minimal - just a subtle center divider.
 */

interface TouchZone {
  id: string
  side: 'left' | 'right'
  active: boolean
  startX: number
  startY: number
}

export default function TouchControls() {
  const pressButtonB = useInputStore(state => state.pressButtonB)
  const releaseButtonB = useInputStore(state => state.releaseButtonB)
  const setAim = useInputStore(state => state.setAim)
  const setLoft = useInputStore(state => state.setLoft)

  const activeTouches = useRef<Map<number, TouchZone>>(new Map())
  const leftZoneActive = useRef(false)
  const rightZoneActive = useRef(false)

  useEffect(() => {
    const getZone = (clientX: number): 'left' | 'right' => {
      return clientX < window.innerWidth / 2 ? 'left' : 'right'
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault()
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const zone = getZone(touch.clientX)

        activeTouches.current.set(touch.identifier, {
          id: touch.identifier.toString(),
          side: zone,
          active: true,
          startX: touch.clientX,
          startY: touch.clientY,
        })

        if (zone === 'left' && !leftZoneActive.current) {
          leftZoneActive.current = true
          pressButtonB()
        } else if (zone === 'right' && !rightZoneActive.current) {
          rightZoneActive.current = true
          pressButtonAction()
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const touchData = activeTouches.current.get(touch.identifier)
        if (!touchData || touchData.side !== 'right') continue
        if (!useInputStore.getState().buttonA.pressed) continue

        setAim(applyAimDrag(touch.clientX - touchData.startX))
        setLoft(applyLoftDrag(touchData.startY - touch.clientY))
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const touchData = activeTouches.current.get(touch.identifier)

        if (touchData) {
          activeTouches.current.delete(touch.identifier)

          let leftStillActive = false
          let rightStillActive = false

          activeTouches.current.forEach((t) => {
            if (t.side === 'left') leftStillActive = true
            if (t.side === 'right') rightStillActive = true
          })

          if (touchData.side === 'left' && !leftStillActive && leftZoneActive.current) {
            leftZoneActive.current = false
            releaseButtonB()
          } else if (touchData.side === 'right' && !rightStillActive && rightZoneActive.current) {
            rightZoneActive.current = false
            releaseButtonAction()
          }
        }
      }
    }

    const handleTouchCancel = (e: TouchEvent) => {
      handleTouchEnd(e)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })
    document.addEventListener('touchcancel', handleTouchCancel, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [pressButtonB, releaseButtonB, setAim, setLoft])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
      }}
      className="touch-zones"
    >
      <div style={{
        width: '1px',
        background: `linear-gradient(to bottom, transparent 20%, ${HEX.player}26 50%, transparent 80%)`,
        height: '100%',
      }} />
    </div>
  )
}
