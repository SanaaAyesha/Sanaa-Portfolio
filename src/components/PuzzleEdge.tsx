import type { PieceGeometry } from '../utils/puzzleGeometry'

interface PuzzleEdgeProps {
  /** Null until the piece is measured; the SVG still renders so it can be animated. */
  geometry: PieceGeometry | null
  /** CSS colour of the seam light. */
  color?: string
}

/**
 * The light that runs along a joint at the moment of the snap. It traces the
 * piece's top edge, i.e. exactly where the two pieces meet. Invisible unless
 * usePuzzleScroll flashes it.
 */
export function PuzzleEdge({ geometry, color = 'var(--color-electric)' }: PuzzleEdgeProps) {
  const { width = 0, height = 0, seam = null } = geometry ?? {}

  return (
    <svg
      className="ps-seam"
      width={width}
      height={height}
      viewBox={`0 0 ${width || 1} ${height || 1}`}
      aria-hidden="true"
      focusable="false"
    >
      <g data-seam-flash style={{ color }}>
        <path d={seam ?? ''} className="ps-seam-glow" />
        <path d={seam ?? ''} className="ps-seam-core" />
        {/* A short bright spark that runs the length of the joint (pathLength=1 → dash offsets are fractions). */}
        <path d={seam ?? ''} className="ps-seam-sweep" pathLength={1} />
      </g>
    </svg>
  )
}
