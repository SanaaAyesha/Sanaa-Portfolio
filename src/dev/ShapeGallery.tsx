import { useViewportWidth } from '../hooks/useViewportWidth'
import {
  PUZZLE_SHAPES,
  getBreakpoint,
  getJointTravel,
  getPiecePads,
  getPuzzlePath,
  resolveJoint,
} from '../utils/puzzleGeometry'

const BODY = 110

/**
 * Dev-only preview of every puzzle shape at the current viewport width
 * (open with `?gallery`). Each row shows the pair separated by its gap, then
 * joined. Both outlines come from one definition, so the joined pair must
 * show no gap and no overlap.
 */
export function ShapeGallery() {
  const vw = useViewportWidth()
  const width = vw - 32

  return (
    <main className="min-h-screen bg-[#d8d4ca] px-4 py-6 font-mono text-xs text-ink/70">
      <h1 className="mb-4 text-sm text-ink">
        Puzzle shapes · {Math.round(vw)}px · {getBreakpoint(vw)}
      </h1>
      {PUZZLE_SHAPES.map((shape) => {
        const joint = resolveJoint({ shape }, vw)
        const travel = getJointTravel(joint)
        const upperPads = getPiecePads(null, joint)
        const lowerPads = getPiecePads(joint, null)
        const upper = getPuzzlePath({ shape, width, height: BODY, direction: 'outward' })
        const lower = getPuzzlePath({ shape, width, height: BODY, direction: 'inward' })
        const pair = (offset: number) => {
          const h = BODY + offset + BODY + upperPads.bottom
          return (
            <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} className="block">
              <path d={upper} fill="#f7f6f1" />
              <path d={lower} fill="#8fb1d1" transform={`translate(0 ${BODY + offset - lowerPads.top})`} />
            </svg>
          )
        }
        return (
          <section key={shape} data-shape={shape} className="mb-8">
            <p className="mb-2 text-ink">
              {shape} · gap {Math.round(joint.gap)}px · connectors{' '}
              {joint.connectors.map((c) => `${c.profile}/${c.dir} ${Math.round(c.width)}×${Math.round(c.depth)}`).join(', ')}
            </p>
            {pair(travel.separated)}
            <div className="h-3" />
            {pair(0)}
          </section>
        )
      })}
    </main>
  )
}
