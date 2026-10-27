import { mulberry32 } from './jigsaw'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface ScatterOptions {
  count: number
  /** Piece cell size, css px. */
  cell: number
  /** Where the portrait assembles, in canvas css px. */
  target: Rect
  /** The canvas, in css px (origin 0,0). */
  bounds: { w: number; h: number }
  /** Rects pieces should not rest on (headline, copy). */
  avoid: Rect[]
  /** Spread as a multiple of the canvas size. */
  rangeX: number
  rangeY: number
  allowOffscreen: boolean
  seed?: number
}

export interface Scatter {
  x: number
  y: number
  rot: number
  scale: number
  /** 0 (far, faint) – 1 (near, crisp). */
  depth: number
}

const inside = (r: Rect, x: number, y: number, pad: number) =>
  x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad

/**
 * Art-directed random: about a third of the pieces linger near the portrait, a
 * third are spread across the hero, and the rest wait outside the canvas edge.
 */
export function scatterLayout(o: ScatterOptions): Scatter[] {
  const rnd = mulberry32(o.seed ?? 11)
  const { w, h } = o.bounds
  const tcx = o.target.x + o.target.w / 2
  const tcy = o.target.y + o.target.h / 2
  const out: Scatter[] = []

  for (let i = 0; i < o.count; i++) {
    const roll = rnd()
    const cls = roll < 0.34 ? 'near' : roll < 0.7 || !o.allowOffscreen ? 'mid' : 'off'
    let x = 0
    let y = 0
    for (let attempt = 0; attempt < 16; attempt++) {
      if (cls === 'near') {
        const a = rnd() * Math.PI * 2
        const rx = o.target.w * (0.55 + rnd() * 0.55)
        const ry = o.target.h * (0.5 + rnd() * 0.4)
        x = tcx + Math.cos(a) * rx
        y = tcy + Math.sin(a) * ry
      } else if (cls === 'mid') {
        x = w / 2 + (rnd() - 0.5) * w * Math.min(o.rangeX, 1.2)
        y = h / 2 + (rnd() - 0.5) * h * Math.min(o.rangeY, 1.1)
      } else {
        const side = Math.floor(rnd() * 4)
        const far = 0.05 + rnd() * 0.35
        if (side === 0) [x, y] = [rnd() * w * o.rangeX - (w * (o.rangeX - 1)) / 2, -h * far]
        else if (side === 1) [x, y] = [w + w * far * 0.5, rnd() * h]
        else if (side === 2) [x, y] = [rnd() * w * o.rangeX - (w * (o.rangeX - 1)) / 2, h + h * far]
        else [x, y] = [-w * far * 0.5, rnd() * h]
      }
      const onTarget = inside(o.target, x, y, -o.target.w * 0.12)
      const onCopy = o.avoid.some((r) => inside(r, x, y, o.cell * 0.4))
      const onScreen = x > 0 && x < w && y > 0 && y < h
      if (!onTarget && !(onCopy && onScreen)) break
    }
    out.push({
      x,
      y,
      rot: (rnd() - 0.5) * 2 * (Math.PI * (0.25 + rnd() * 0.75)),
      scale: 0.7 + rnd() * 0.5,
      depth: rnd(),
    })
  }
  return out
}
