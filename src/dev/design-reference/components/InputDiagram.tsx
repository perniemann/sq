import type { ReactElement } from 'react'
import { cssVar } from '../../../theme/colors'
import { drFontDisplay, drFontUtility } from '../drStyles'
import { useRevealOnView } from '../useRevealOnView'

/**
 * The whole input surface, to scale — two buttons, two touch zones, same action path.
 * Source: `useInput.ts` (`registerButtonAActions`), `TouchControls.tsx` (zone split).
 */
export function InputDiagram(): ReactElement {
  const { ref, revealed } = useRevealOnView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={revealed ? 'dr-input-diagram is-revealed' : 'dr-input-diagram'}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: `color-mix(in oklch, ${cssVar.inkMuted} 35%, transparent)`,
        border: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 35%, transparent)`,
      }}
    >
      <div
        className="dr-input-zone"
        style={{
          background: cssVar.void,
          padding: '22px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: drFontDisplay,
            fontWeight: 700,
            fontSize: 28,
            color: cssVar.opponent,
          }}
        >
          B
        </span>
        <span style={{ fontFamily: drFontUtility, fontSize: 12, color: cssVar.ink }}>
          Shift · left half of screen
        </span>
        <span style={{ fontFamily: drFontUtility, fontSize: 12, color: cssVar.inkMuted }}>
          Chase — one meaning, every phase: burst toward the ball while it's returnable.
        </span>
      </div>
      <div
        className="dr-input-zone"
        style={{
          background: cssVar.void,
          padding: '22px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          animationDelay: '90ms',
        }}
      >
        <span
          style={{
            fontFamily: drFontDisplay,
            fontWeight: 700,
            fontSize: 28,
            color: cssVar.player,
          }}
        >
          A
        </span>
        <span style={{ fontFamily: drFontUtility, fontSize: 12, color: cssVar.ink }}>
          Space · right half of screen
        </span>
        <span style={{ fontFamily: drFontUtility, fontSize: 12, color: cssVar.inkMuted }}>
          Phase-dependent: start · hold-to-charge-and-release a shot · advance past a
          callout. Same handler for keyboard and touch — never a separate key binding.
        </span>
      </div>

      <style>{`
        .dr-input-zone { opacity: 0; transform: translateY(8px); }
        .dr-input-diagram.is-revealed .dr-input-zone {
          animation: drInputRise 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes drInputRise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dr-input-zone { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </div>
  )
}
