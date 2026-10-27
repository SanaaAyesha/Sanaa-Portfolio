/**
 * Jigsaw geometry for cutting one image into interlocking pieces.
 *
 * Every internal edge is generated once (with a tab direction) and shared by
 * the two pieces that touch it: one gets the tab, the other the matching
 * notch, so neighbours always fit. Everything is deterministic for a given
 * seed, so an assembly always reconstructs the same picture.
 */

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One cubic segment in the unit edge frame: x along the edge (0–1), y out of it. */
type Seg = readonly [c1x: number, c1y: number, c2x: number, c2y: number, px: number, py: number]

/** Neck, round head, neck. Tab height ≈ 0.39 of the cell. */
const KNOB: readonly Seg[] = [
  [0.2, 0.02, 0.4, 0.0, 0.42, 0.07],
  [0.42, 0.13, 0.35, 0.17, 0.35, 0.25],
  [0.35, 0.34, 0.43, 0.39, 0.5, 0.39],
  [0.57, 0.39, 0.65, 0.34, 0.65, 0.25],
  [0.65, 0.17, 0.58, 0.13, 0.58, 0.07],
  [0.6, 0.0, 0.8, 0.02, 1, 0],
]
const FLAT: readonly Seg[] = [[0.33, 0, 0.66, 0, 1, 0]]

/** How far (as a fraction of the cell) a tab reaches past the cell boundary. */
export const TAB_REACH = 0.4

export interface JigsawGrid {
  cols: number
  rows: number
  /** Tab sign for horizontal edges: h[row][col], row 0..rows. 0 = flat border. */
  h: number[][]
  /** Tab sign for vertical edges: v[row][col], col 0..cols. */
  v: number[][]
}

export function createGrid(cols: number, rows: number, seed = 7): JigsawGrid {
  const rnd = mulberry32(seed)
  const sign = () => (rnd() < 0.5 ? -1 : 1)
  const h = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols }, () => (r === 0 || r === rows ? 0 : sign())),
  )
  const v = Array.from({ length: rows }, () =>
    Array.from({ length: cols + 1 }, (_, c) => (c === 0 || c === cols ? 0 : sign())),
  )
  return { cols, rows, h, v }
}

type Map = (x: number, y: number) => [number, number]

function addEdge(path: Path2D, segs: readonly Seg[], map: Map, reversed: boolean) {
  if (!reversed) {
    for (const [c1x, c1y, c2x, c2y, px, py] of segs) {
      const [a, b] = map(c1x, c1y)
      const [c, d] = map(c2x, c2y)
      const [e, f] = map(px, py)
      path.bezierCurveTo(a, b, c, d, e, f)
    }
    return
  }
  const pts: [number, number][] = [[0, 0], ...segs.map((s) => [s[4], s[5]] as [number, number])]
  for (let i = segs.length - 1; i >= 0; i--) {
    const [c1x, c1y, c2x, c2y] = segs[i]
    const [a, b] = map(c2x, c2y)
    const [c, d] = map(c1x, c1y)
    const [e, f] = map(pts[i][0], pts[i][1])
    path.bezierCurveTo(a, b, c, d, e, f)
  }
}

/**
 * Outline of piece (col,row) in image space, for cells of cw × ch.
 * Clockwise: top → right → bottom (reversed) → left (reversed).
 */
export function piecePath(grid: JigsawGrid, col: number, row: number, cw: number, ch: number): Path2D {
  const k = Math.min(cw, ch)
  const x0 = col * cw
  const y0 = row * ch
  const horizontal =
    (r: number, s: number): Map =>
    (x, y) => [x0 + x * cw, r * ch + s * y * k]
  const vertical =
    (c: number, s: number): Map =>
    (x, y) => [c * cw + s * y * k, y0 + x * ch]

  const segs = (s: number) => (s === 0 ? FLAT : KNOB)
  const top = grid.h[row][col]
  const bottom = grid.h[row + 1][col]
  const left = grid.v[row][col]
  const right = grid.v[row][col + 1]

  const path = new Path2D()
  path.moveTo(x0, y0)
  addEdge(path, segs(top), horizontal(row, top), false)
  addEdge(path, segs(right), vertical(col + 1, right), false)
  // Bottom runs right → left: re-anchor the shared edge at its left end.
  addEdge(path, segs(bottom), (x, y) => [x0 + x * cw, (row + 1) * ch + bottom * y * k], true)
  addEdge(path, segs(left), (x, y) => [x0 + left * y * k, y0 + x * ch], true)
  path.closePath()
  return path
}
