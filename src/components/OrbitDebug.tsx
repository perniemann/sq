import { OrbitControls } from '@react-three/drei'
import type { ReactElement } from 'react'

/** Lazy-loaded only when `?orbit` is present so drei controls stay out of the main path. */
export default function OrbitDebug(): ReactElement {
  return (
    <OrbitControls
      target={[0, 0.5, -2]}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}
