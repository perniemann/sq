import type { CSSProperties, ReactElement, ReactNode } from 'react'
import {
  drArticle,
  drH2,
  drH3,
  drHint,
  drPath,
  drSection,
  drSpecimenBody,
} from './drStyles'

export function Section({
  id,
  title,
  children,
  style,
}: {
  id: string
  title: string
  children: ReactNode
  style?: CSSProperties
}): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      style={{ ...drSection, ...style }}
    >
      <h2 id={`${id}-heading`} style={drH2}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function LabeledBlock({
  id,
  title,
  path,
  hint,
  children,
}: {
  id?: string
  title: string
  path?: string
  hint?: string
  children: ReactNode
}): ReactElement {
  return (
    <article id={id} style={drArticle}>
      <div>
        <h3 style={drH3}>{title}</h3>
        {path ? <code style={drPath}>{path}</code> : null}
        {hint ? <p style={drHint}>{hint}</p> : null}
      </div>
      <div style={drSpecimenBody}>{children}</div>
    </article>
  )
}
