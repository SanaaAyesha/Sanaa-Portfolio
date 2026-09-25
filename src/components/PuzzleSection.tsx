import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useViewportWidth } from '../hooks/useViewportWidth'
import {
  buildPieceGeometry,
  getPieceCuts,
  getPiecePads,
  resolveJoint,
  type PieceGeometry,
  type PuzzleDefinition,
} from '../utils/puzzleGeometry'
import { PuzzleEdge } from './PuzzleEdge'

export type SectionTheme = 'dark' | 'light'

interface PuzzleSectionProps {
  id: string
  index: number
  /** Accessible name for the region (usually matches the nav label). */
  label: string
  theme: SectionTheme
  /** Any CSS background: colour, gradient or image. Fills the tabs too. */
  background: string
  /** Joint with the previous section: the shape this piece snaps into. */
  puzzle?: PuzzleDefinition
  /** Joint with the next section. Pass the next section's `puzzle`. */
  nextPuzzle?: PuzzleDefinition
  /** Decorative layer that fills the whole piece, tabs included. */
  backdrop?: ReactNode
  /** Colour of the seam flash when this piece locks into the previous one. */
  seamColor?: string
  children: ReactNode
}

/**
 * One full-screen puzzle piece.
 *
 *  section[data-puzzle-section]    ← scroll-scrubbed: position, alignment, scale
 *  └─ .ps-float[data-puzzle-float] ← magnetic snap only (time-based)
 *     ├─ .ps-shadow                ← "lifted" shadow in the piece's shape
 *     ├─ .ps-piece (clip-path)     ← background + content; overhangs the
 *     │   ├─ backdrop                 section box wherever it has a tab
 *     │   └─ .ps-body              ← children
 *     └─ PuzzleEdge                ← seam flash along the top joint
 */
export function PuzzleSection({
  id,
  index,
  label,
  theme,
  background,
  puzzle,
  nextPuzzle,
  backdrop,
  seamColor,
  children,
}: PuzzleSectionProps) {
  const vw = useViewportWidth()
  const top = useMemo(() => (puzzle ? resolveJoint(puzzle, vw) : null), [puzzle, vw])
  const bottom = useMemo(() => (nextPuzzle ? resolveJoint(nextPuzzle, vw) : null), [nextPuzzle, vw])
  const pads = useMemo(() => getPiecePads(top, bottom), [top, bottom])
  const cuts = getPieceCuts(top, bottom)
  const pieceRef = useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = useState<PieceGeometry | null>(null)

  // Rebuild the outline only when the piece is resized, never on scroll.
  useLayoutEffect(() => {
    const el = pieceRef.current
    if (!el) return
    let last = ''
    const update = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const key = `${w}x${h}`
      if (!w || !h || key === last) return
      last = key
      setGeometry(buildPieceGeometry(w, h, pads, top, bottom))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pads, top, bottom])

  const vars = {
    '--pad-top': `${pads.top}px`,
    '--pad-bottom': `${pads.bottom}px`,
    '--cut-top': `${cuts.top}px`,
    '--cut-bottom': `${cuts.bottom}px`,
  } as CSSProperties
  const clip = geometry ? `path('${geometry.outline}')` : undefined
  // Rotate/scale around the top connector, so alignment reads as pivoting into place.
  const origin = `${(top?.connectors[0]?.position ?? 0.5) * 100}% 0%`

  return (
    <section
      id={id}
      className="ps"
      data-puzzle-section
      data-theme={theme}
      aria-label={label}
      tabIndex={-1}
      style={{ ...vars, zIndex: index + 1, transformOrigin: origin }}
    >
      <div className="ps-float" data-puzzle-float style={{ transformOrigin: origin }}>
        {puzzle && (
          <div className="ps-shadow" data-puzzle-shadow aria-hidden="true">
            <div className="ps-shadow-shape" data-puzzle-shadow-shape style={{ clipPath: clip, WebkitClipPath: clip }} />
          </div>
        )}

        <div ref={pieceRef} className="ps-piece" style={{ clipPath: clip, WebkitClipPath: clip }}>
          <div className="ps-bg" style={{ background }} aria-hidden="true">
            {backdrop}
          </div>
          {geometry && geometry.rims.length > 0 && (
            <svg
              className="ps-rim"
              width={geometry.width}
              height={geometry.height}
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              aria-hidden="true"
              focusable="false"
            >
              {geometry.rims.map((d, i) => (
                <path key={i} d={d} className="ps-rim-line" />
              ))}
            </svg>
          )}
          <div className="ps-body">{children}</div>
        </div>

        {puzzle && (
          <div className="ps-seam-wrap" aria-hidden="true">
            <PuzzleEdge geometry={geometry} color={seamColor} />
          </div>
        )}
      </div>
    </section>
  )
}
