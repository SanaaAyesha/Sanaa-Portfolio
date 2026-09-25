import type { ElementType, ReactNode } from 'react'

interface SectionContentProps {
  children: ReactNode
  className?: string
  /** Vertical alignment of the content inside the full-screen piece. */
  align?: 'center' | 'end' | 'between'
}

const ALIGN = {
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

/** Shared full-screen layout: nav/connector clearance, gutters, max width. */
export function SectionContent({ children, className = '', align = 'center' }: SectionContentProps) {
  return (
    <div
      className={`section-pad relative mx-auto flex w-full max-w-[1680px] flex-col px-5 sm:px-8 lg:px-12 ${ALIGN[align]} ${className}`}
    >
      {children}
    </div>
  )
}

interface EyebrowProps {
  index: string
  children: ReactNode
  className?: string
}

/** Small mono label: "02 — About us". Fades in on reveal. */
export function Eyebrow({ index, children, className = '' }: EyebrowProps) {
  return (
    <p
      data-reveal="fade"
      className={`flex items-center gap-3 font-mono text-[11px] tracking-[0.24em] uppercase ${className}`}
    >
      <span className="tabular-nums opacity-60">{index}</span>
      <span aria-hidden="true" className="h-px w-8 bg-current opacity-40" />
      <span>{children}</span>
    </p>
  )
}

interface RevealLinesProps {
  lines: readonly ReactNode[]
  as?: ElementType
  className?: string
  lineClassName?: string
  id?: string
}

/** Heading whose lines slide up out of a mask when the piece locks in. */
export function RevealLines({ lines, as: Tag = 'h2', className = '', lineClassName = '', id }: RevealLinesProps) {
  return (
    <Tag id={id} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask">
          <span data-reveal="line" className={lineClassName}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}
