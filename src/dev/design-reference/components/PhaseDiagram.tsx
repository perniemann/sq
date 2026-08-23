import type { ReactElement } from 'react'
import { cssVar } from '../../../theme/colors'
import { drFontUtility } from '../drStyles'
import { useRevealOnView } from '../useRevealOnView'

type Node = { id: string; x: number; y: number; label: string; accent?: string }
type Edge = { d: string; label: string; labelX: number; labelY: number; dashed?: boolean }

const W = 140
const H = 56

const NODES: readonly Node[] = [
  { id: 'idle', x: 20, y: 182, label: 'idle' },
  { id: 'serving', x: 232, y: 182, label: 'serving' },
  { id: 'rally', x: 444, y: 182, label: 'rally' },
  { id: 'point', x: 700, y: 40, label: 'point' },
  { id: 'gameOver', x: 700, y: 182, label: 'gameOver' },
  { id: 'matchOver', x: 700, y: 324, label: 'matchOver' },
] as const

// Hand-authored so the arrows read cleanly — not derived geometry. Forward transitions
// solid; the two "advance" loops back to serving run dashed along the bottom margin so
// they don't cross the forward row.
const EDGES: readonly Edge[] = [
  { d: 'M160,210 L232,210', label: 'space / click', labelX: 196, labelY: 200 },
  { d: 'M372,210 L444,210', label: 'strike', labelX: 408, labelY: 200 },
  { d: 'M584,196 C 630,160 650,100 700,72', label: 'ball out · tin · double bounce', labelX: 620, labelY: 128 },
  { d: 'M584,210 L700,210', label: 'game won', labelX: 642, labelY: 200 },
  { d: 'M584,224 C 630,260 650,300 700,320', label: 'match won', labelX: 646, labelY: 285 },
  { d: 'M700,92 C 650,140 610,168 584,182', label: 'advance (space)', labelX: 636, labelY: 155, dashed: true },
  { d: 'M700,238 C 650,300 500,360 302,238', label: 'next game (space)', labelX: 500, labelY: 358, dashed: true },
  { d: 'M700,352 C 650,410 400,410 220,238', label: 'restart (space)', labelX: 460, labelY: 402, dashed: true },
] as const

/**
 * Real phase machine — `src/stores/gameStore.ts` string union, transitions wired in
 * `usePhaseInput` and `awardPointTo`. No states or edges beyond what those files do.
 */
export function PhaseDiagram(): ReactElement {
  const { ref, revealed } = useRevealOnView<HTMLDivElement>()
  return (
    <div ref={ref} style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox="0 0 900 430"
        role="img"
        aria-label="Phase machine: idle to serving to rally, rally branches to point, gameOver, or matchOver; point loops back to rally; gameOver and matchOver loop back to serving."
        style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block' }}
        className={revealed ? 'dr-phase-diagram is-revealed' : 'dr-phase-diagram'}
      >
        {EDGES.map((e, i) => (
          <g key={i}>
            <path
              d={e.d}
              pathLength={1}
              fill="none"
              stroke={e.dashed ? cssVar.inkMuted : cssVar.ink}
              strokeOpacity={e.dashed ? 0.55 : 0.85}
              strokeWidth={1.5}
              strokeDasharray={e.dashed ? '0.02 0.02' : undefined}
              markerEnd="url(#dr-arrow)"
              className="dr-phase-edge"
              style={{ animationDelay: `${140 + i * 60}ms` }}
            />
            <text
              x={e.labelX}
              y={e.labelY}
              textAnchor="middle"
              fontFamily={drFontUtility}
              fontSize={11}
              fill={cssVar.inkMuted}
              className="dr-phase-edge-label"
              style={{ animationDelay: `${260 + i * 60}ms` }}
            >
              {e.label}
            </text>
          </g>
        ))}

        <defs>
          <marker
            id="dr-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 z" fill={cssVar.inkMuted} />
          </marker>
        </defs>

        {NODES.map((n, i) => {
          const isTerminalish = n.id === 'gameOver' || n.id === 'matchOver'
          const stroke = n.id === 'rally' ? cssVar.player : isTerminalish ? cssVar.opponent : cssVar.inkMuted
          return (
            <g
              key={n.id}
              className="dr-phase-node"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <rect
                x={n.x}
                y={n.y}
                width={W}
                height={H}
                fill={cssVar.void}
                stroke={stroke}
                strokeOpacity={0.8}
                strokeWidth={1.5}
              />
              <text
                x={n.x + W / 2}
                y={n.y + H / 2 + 5}
                textAnchor="middle"
                fontFamily={drFontUtility}
                fontWeight={700}
                fontSize={14}
                fill={cssVar.ink}
              >
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>

      <style>{`
        .dr-phase-node { opacity: 0; transform: translateY(10px); transform-box: fill-box; transform-origin: center; }
        .dr-phase-edge { stroke-dashoffset: 1; }
        .dr-phase-edge-label { opacity: 0; }
        .dr-phase-diagram.is-revealed .dr-phase-node {
          animation: drPhaseNodeRise 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dr-phase-diagram.is-revealed .dr-phase-edge {
          animation: drPhaseEdgeDraw 480ms ease-out both;
        }
        .dr-phase-diagram.is-revealed .dr-phase-edge-label {
          animation: drPhaseLabelFade 300ms ease-out both;
        }
        @keyframes drPhaseNodeRise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drPhaseEdgeDraw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes drPhaseLabelFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dr-phase-node, .dr-phase-edge, .dr-phase-edge-label {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
