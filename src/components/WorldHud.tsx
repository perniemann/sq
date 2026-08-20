import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { getShotConfig } from '../systems/shotTypes'
import { getPointReasonDisplay } from '../systems/scoring'
import { hudPrompts, resolveHudVisibility } from '../systems/hudCopy'
import {
  WORLD_HUD,
  WORLD_HUD_Z,
  WORLD_HUD_RENDER_ORDER,
  TIN_HUD_Y,
  scoreOpponentX,
  scorePlayerX,
  tinPlateWidth,
  turnMarkOpponentX,
  turnMarkPlayerX,
} from '../systems/worldHudLayout'
import { HEX } from '../theme/colors'
import {
  FONT_DISPLAY,
  FONT_READING,
  FONT_UTILITY,
} from '../theme/fonts'
import { displayAlpha } from '../config'
import { APP_VERSION, formatVersionLabel } from '../version'
import { useTeachProgressDriver } from '../hooks/useTeachProgress'
import { StartLockup } from '../ui/StartLockup'
import logoSvg from '../assets/sq-logo.svg?url'

const IS_TOUCH =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const PROMPTS = hudPrompts(IS_TOUCH)

const htmlRootStyle: CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}

type SlotProps = {
  text: string
  position: [number, number, number]
  fontSize: number
  color: string
  font: string
  outlineWidth: number
  visible: boolean
  anchorX?: 'left' | 'center' | 'right'
  maxWidth?: number
  fillOpacity?: number
}

function HudTextSlot({
  text,
  position,
  fontSize,
  color,
  font,
  outlineWidth,
  visible,
  anchorX = 'center',
  maxWidth,
  fillOpacity = 1,
}: SlotProps): ReactElement {
  const opacity = visible ? fillOpacity : 0
  return (
    <Text
      position={position}
      font={font}
      fontSize={fontSize}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      outlineWidth={outlineWidth}
      outlineColor={HEX.void}
      maxWidth={maxWidth}
      fillOpacity={opacity}
      outlineOpacity={opacity}
      depthOffset={-1}
      renderOrder={WORLD_HUD_RENDER_ORDER + 1}
      material-depthTest={true}
      material-depthWrite={false}
    >
      {text.length > 0 ? text : ' '}
    </Text>
  )
}

function GamesPips({
  x,
  y,
  won,
  total,
  onColor,
  offColor,
  visible,
  dimmed,
}: {
  x: number
  y: number
  won: number
  total: number
  onColor: string
  offColor: string
  visible: boolean
  dimmed: boolean
}): ReactElement {
  const startX = x - ((total - 1) * WORLD_HUD.pipGap) / 2
  const dim = dimmed ? 0.55 : 1
  return (
    <group visible={visible}>
      {Array.from({ length: total }).map((_, i) => (
          <mesh
          key={i}
          position={[startX + i * WORLD_HUD.pipGap, y, WORLD_HUD_Z + 0.002]}
          renderOrder={WORLD_HUD_RENDER_ORDER + 1}
        >
          <circleGeometry args={[0.022, 10]} />
          <meshBasicMaterial
            color={i < won ? onColor : offColor}
            transparent
            opacity={displayAlpha((i < won ? 0.95 : 0.55) * dim)}
            depthTest
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function TinLogoMark(): ReactElement {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(logoSvg)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])

  return (
    <mesh
      position={[WORLD_HUD.logoX + 0.22, WORLD_HUD.tinTextY + 0.02, WORLD_HUD_Z + 0.002]}
      renderOrder={WORLD_HUD_RENDER_ORDER + 1}
    >
      <planeGeometry args={[0.14, 0.14]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={displayAlpha(0.7)}
        depthTest
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * Tin: dark plate + troika columns. Start: wall Html lockup (no ink bar).
 */
export default function WorldHud(): ReactElement {
  const score = useGameStore(s => s.score)
  const matchState = useGameStore(s => s.matchState)
  const phase = useGameStore(s => s.phase)
  const currentStriker = useGameStore(s => s.currentStriker)
  const lastShotType = useGameStore(s => s.lastShotType)
  const lastShotTime = useGameStore(s => s.lastShotTime)
  const pointReason = useGameStore(s => s.pointReason)
  const pointWinner = useGameStore(s => s.pointWinner)
  const gameBallHolder = useGameStore(s => s.gameBallHolder)
  const matchBallHolder = useGameStore(s => s.matchBallHolder)
  const demoMode = useGameStore(s => s.demoMode)
  const letCalled = useGameStore(s => s.letCalled)

  const teachLabel = useTeachProgressDriver(IS_TOUCH)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!lastShotTime) return
    const remaining = 1500 - (Date.now() - lastShotTime)
    if (remaining <= 0) return
    const id = window.setTimeout(() => setTick(t => t + 1), remaining + 16)
    return () => window.clearTimeout(id)
  }, [lastShotTime])

  const showLastShot = Boolean(lastShotTime && Date.now() - lastShotTime < 1500)
  const lastShotName = lastShotType ? getShotConfig(lastShotType).displayName : null
  const pointReasonText = pointReason ? getPointReasonDisplay(pointReason) : null
  const { gamesWon, config } = matchState
  const gamesToWin = config.gamesToWin
  const versionLabel = formatVersionLabel(APP_VERSION)
  const showTurnIndicator = phase === 'rally' || phase === 'serving'
  const scoreDim = demoMode ? 0.55 : 1

  const vis = resolveHudVisibility({
    phase,
    demoMode,
    letCalled,
    pointReasonText,
    pointWinner,
    lastShotName,
    showLastShot,
    teachLabel,
    gameBallHolder,
    matchBallHolder,
    gamesWonPlayer: gamesWon.player,
    gamesWonOpponent: gamesWon.opponent,
  }, PROMPTS)

  const calloutColor =
    vis.calloutTone === 'player'
      ? HEX.player
      : vis.calloutTone === 'opponent'
        ? HEX.opponent
        : HEX.ink

  const matchColor =
    gamesWon.player > gamesWon.opponent ? HEX.player : HEX.opponent

  const gamePointColor =
    vis.gamePointLabel === 'MATCH POINT' ? HEX.matchPoint : HEX.gamePoint

  const plateW = tinPlateWidth()
  const y = WORLD_HUD.tinTextY
  const z = WORLD_HUD_Z

  // Point / game / match end: keep callout/result AND the advance cue (callout alone
  // looked like a dead end after winning a point).
  const centrePrimary =
    vis.callout ??
    vis.matchResult ??
    vis.advancePrompt ??
    vis.teachLabel ??
    ' '
  // First player-lost DOUBLE BOUNCE: chase tip replaces generic continue on the
  // secondary line (primary stays the point callout).
  const centreSecondary =
    vis.advancePrompt && (vis.callout || vis.matchResult)
      ? (vis.teachLabel ?? vis.advancePrompt)
      : null

  const centreColor = vis.callout
    ? calloutColor
    : vis.matchResult
      ? matchColor
      : HEX.inkMuted

  const centreSize = vis.callout || vis.matchResult
    ? WORLD_HUD.fontCallout
    : vis.advancePrompt
      ? WORLD_HUD.fontPrompt
      : WORLD_HUD.fontTeach

  const centreFont = vis.teachLabel && !vis.callout && !vis.matchResult && !vis.advancePrompt
    ? FONT_READING
    : FONT_UTILITY

  const centreVisible = Boolean(
    !demoMode && (vis.callout || vis.matchResult || vis.advancePrompt || vis.teachLabel),
  )

  return (
    <group>
      {/* Dark plate behind tin type — contrast against white tin substrate */}
      <mesh
        position={[0, TIN_HUD_Y, z - 0.01]}
        renderOrder={WORLD_HUD_RENDER_ORDER}
      >
        <planeGeometry args={[plateW, WORLD_HUD.tinHeight]} />
        <meshBasicMaterial
          color={HEX.void}
          transparent
          opacity={displayAlpha(0.97)}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Logo column */}
      <HudTextSlot
        text="sq"
        position={[WORLD_HUD.logoX, y + 0.02, z]}
        fontSize={WORLD_HUD.fontLogo}
        color={HEX.ink}
        font={FONT_DISPLAY}
        outlineWidth={WORLD_HUD.outlinePrompt}
        visible
        anchorX="left"
        fillOpacity={1}
      />
      <TinLogoMark />

      {/* Gameplay centre */}
      <HudTextSlot
        text={vis.gamePointLabel ?? ' '}
        position={[WORLD_HUD.gameplayX, y + 0.12, z]}
        fontSize={WORLD_HUD.fontGamePoint}
        color={gamePointColor}
        font={FONT_UTILITY}
        outlineWidth={WORLD_HUD.outlinePrompt}
        visible={!demoMode && Boolean(vis.gamePointLabel)}
      />
      <HudTextSlot
        text={centrePrimary}
        position={[WORLD_HUD.gameplayX, y - (vis.gamePointLabel ? 0.04 : 0) + (centreSecondary ? 0.05 : 0), z]}
        fontSize={centreSize}
        color={centreColor}
        font={centreFont}
        outlineWidth={WORLD_HUD.outlineCallout}
        visible={centreVisible}
        maxWidth={2.8}
      />
      <HudTextSlot
        text={centreSecondary ?? ' '}
        position={[WORLD_HUD.gameplayX, y - (vis.gamePointLabel ? 0.04 : 0) - 0.08, z]}
        fontSize={WORLD_HUD.fontPrompt}
        color={HEX.inkMuted}
        font={FONT_UTILITY}
        outlineWidth={WORLD_HUD.outlinePrompt}
        visible={Boolean(centreSecondary)}
        maxWidth={2.8}
      />

      {/* Score column */}
      <HudTextSlot
        text={String(score.player)}
        position={[scorePlayerX(), y + 0.04, z]}
        fontSize={WORLD_HUD.fontScore}
        color={HEX.player}
        font={FONT_UTILITY}
        outlineWidth={WORLD_HUD.outlineScore}
        visible
        fillOpacity={scoreDim}
      />
      <HudTextSlot
        text=":"
        position={[WORLD_HUD.scoreX, y + 0.04, z]}
        fontSize={WORLD_HUD.fontColon}
        color={HEX.inkMuted}
        font={FONT_UTILITY}
        outlineWidth={WORLD_HUD.outlinePrompt}
        visible
        fillOpacity={scoreDim}
      />
      <HudTextSlot
        text={String(score.opponent)}
        position={[scoreOpponentX(), y + 0.04, z]}
        fontSize={WORLD_HUD.fontScore}
        color={HEX.opponent}
        font={FONT_UTILITY}
        outlineWidth={WORLD_HUD.outlineScore}
        visible
        fillOpacity={scoreDim}
      />
      <GamesPips
        x={scorePlayerX()}
        y={y - WORLD_HUD.pipBelow}
        won={gamesWon.player}
        total={gamesToWin}
        onColor={HEX.player}
        offColor={HEX.playerPipOff}
        visible
        dimmed={demoMode}
      />
      <GamesPips
        x={scoreOpponentX()}
        y={y - WORLD_HUD.pipBelow}
        won={gamesWon.opponent}
        total={gamesToWin}
        onColor={HEX.opponent}
        offColor={HEX.opponentPipOff}
        visible
        dimmed={demoMode}
      />
      <HudTextSlot
        text=">"
        position={[turnMarkPlayerX(), y + 0.04, z]}
        fontSize={WORLD_HUD.fontMark}
        color={HEX.player}
        font={FONT_UTILITY}
        outlineWidth={0.006}
        visible={showTurnIndicator && currentStriker === 'player'}
      />
      <HudTextSlot
        text="<"
        position={[turnMarkOpponentX(), y + 0.04, z]}
        fontSize={WORLD_HUD.fontMark}
        color={HEX.opponent}
        font={FONT_UTILITY}
        outlineWidth={0.006}
        visible={showTurnIndicator && currentStriker === 'opponent'}
      />

      {/* Start lockup — wall Html, no ink bar */}
      {vis.demoLockup && (
        <Html
          transform
          position={[0, WORLD_HUD.startY, z]}
          distanceFactor={WORLD_HUD.startDistanceFactor}
          style={htmlRootStyle}
          zIndexRange={[120, 0]}
          occlude={false}
        >
          <div style={{ transform: 'translate(-50%, -50%)' }}>
            <StartLockup
              versionLabel={versionLabel}
              startLabel={PROMPTS.start}
              startA11y={PROMPTS.startA11y}
            />
          </div>
        </Html>
      )}
    </group>
  )
}
