import type { ReactElement, ReactNode } from 'react'
import { cssVar } from '../../../theme/colors'
import { drFontUtility, drH2, drSection } from '../drStyles'

/** Fit-style section: kicker + title + body. */
export function RefSection({
  id,
  title,
  kicker,
  children,
}: {
  id: string
  title: string
  kicker?: string
  children: ReactNode
}): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      style={drSection}
    >
      <header style={{ marginBottom: 20 }}>
        {kicker ? (
          <p
            style={{
              margin: '0 0 6px',
              fontFamily: drFontUtility,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: cssVar.inkMuted,
            }}
          >
            {kicker}
          </p>
        ) : null}
        <h2 id={`${id}-heading`} style={{ ...drH2, margin: 0 }}>
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}
