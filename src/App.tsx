import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { KernelSize, ToneMappingMode } from 'postprocessing'
import { ErrorBoundary } from './components/ErrorBoundary'
import Scene from './components/Scene'
import { CAMERA_FOV, CAMERA_REST_POSITION } from './systems/cameraRig'
import HUD from './ui/HUD'
import TouchControls from './ui/TouchControls'

/**
 * Bloom costs roughly 1.5 ms/frame, so it needs to stay measurable. Append `?nobloom` to
 * compare against an unprocessed frame, following the same convention as `?orbit`.
 */
const BLOOM_ENABLED =
  typeof window === 'undefined' ||
  !new URLSearchParams(window.location.search).has('nobloom')

export default function App(): React.ReactElement {
  return (
    <>
      <ErrorBoundary>
      <Canvas
        camera={{ position: CAMERA_REST_POSITION, fov: CAMERA_FOV }}
        gl={{ antialias: true }}
      >
        <Physics timeStep={1 / 60} gravity={[0, -9.81, 0]}>
          <Scene />
        </Physics>
        {/* The whole scene is unlit basic materials on black, so bloom is what makes the
            neon lines read as light rather than as thin flat strokes.

            Mounting a composer switches the renderer to NoToneMapping, so the ACES pass
            restores the curve the scene's colours were chosen against, and it has to run
            after bloom. The composer still renders the court's translucent fill panels
            brighter than the direct render did, which is why they were dropped to 2%.

            mipmapBlur is deliberately not used: its low mips average the whole frame and
            lift the black background to teal. */}
        {BLOOM_ENABLED && (
          <EffectComposer>
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.15}
              kernelSize={KernelSize.LARGE}
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
      </ErrorBoundary>
      <HUD />
      <TouchControls />
    </>
  )
}
