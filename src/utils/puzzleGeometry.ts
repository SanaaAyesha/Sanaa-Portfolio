/**
 * Puzzle geometry
 * ----------------
 * Two neighbouring sections meet along ONE shared boundary curve: the "joint".
 * The upper piece is everything above the curve, the lower piece everything
 * below it. Both outlines are generated from the same curve, so they are exact
 * complements by construction, never approximated separately.
 *
 * A joint is a list of connectors along a horizontal edge. Each connector is a
 * unit profile (cubic Béziers from (0,0) to (1,0), `v` = distance from the
 * edge, 1 = full depth) placed at a position with a width and a signed depth:
 *
 *   dir 'down' → the UPPER piece carries a tab, the lower piece a notch
 *   dir 'up'   → the LOWER piece carries a tab, the upper piece a notch
 *
 * Paths are rebuilt only when a piece is resized, never during scroll.
 */

export type PuzzleShape =
  | 'large-center-tab'
  | 'small-center-tab'
  | 'reverse-tab'
  | 'left-tab'
  | 'right-tab'
  | 'double-tab'
  | 'asymmetric-tab'
  | 'large-notch'

export const PUZZLE_SHAPES: readonly PuzzleShape[] = [
  'large-center-tab',
  'small-center-tab',
  'reverse-tab',
  'left-tab',
  'right-tab',
  'double-tab',
  'asymmetric-tab',
  'large-notch',
]

/** One joint as authored. Sizes are desktop px; they scale down per breakpoint. */
export interface PuzzleDefinition {
  shape: PuzzleShape
  /** 0–1 across the width: centre of the (main) connector. Defaults per shape. */
  position?: number
  /** Connector width in desktop px. */
  size?: number
  /** Connector depth in desktop px. */
  depth?: number
  /** Visible empty space between the pieces before they join, in desktop px. */
  gap?: number
}

export type ProfileName = 'knob' | 'bell' | 'block' | 'dovetail' | 'ramp'
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
export type JointDirection = 'down' | 'up'

export interface Connector {
  /** 0–1 across the width. */
  position: number
  /** px */
  width: number
  /** px, always positive; see `dir`. */
  depth: number
  profile: ProfileName
  dir: JointDirection
}

/** A joint resolved for one viewport width. */
export interface Joint {
  shape: PuzzleShape
  connectors: Connector[]
  /** Visible gap in px. */
  gap: number
  /** How far tabs reach below the baseline (upper piece's tabs), px. */
  reachDown: number
  /** How far tabs reach above the baseline (lower piece's tabs), px. */
  reachUp: number
}

type Vec = readonly [number, number]
/** [control1, control2, end]; start is the previous segment's end. */
type Segment = readonly [Vec, Vec, Vec]

/* -------------------------------------------------------------------------- */
/*  Profiles: edit these to change what a connector looks like                */
/* -------------------------------------------------------------------------- */

export const PROFILES: Record<ProfileName, readonly Segment[]> = {
  /** Classic jigsaw knob: narrow neck, rounded head (restrained, not toy-like). */
  knob: [
    [[0.22, 0], [0.36, 0], [0.36, 0.12]],
    [[0.36, 0.28], [0.28, 0.4], [0.3, 0.62]],
    [[0.32, 0.86], [0.4, 1], [0.5, 1]],
    [[0.6, 1], [0.68, 0.86], [0.7, 0.62]],
    [[0.72, 0.4], [0.64, 0.28], [0.64, 0.12]],
    [[0.64, 0], [0.78, 0], [1, 0]],
  ],
  /** Soft bell, no undercut. Mobile replacement for the knob. */
  bell: [
    [[0.22, 0], [0.3, 1], [0.5, 1]],
    [[0.7, 1], [0.78, 0], [1, 0]],
  ],
  /** Rounded block: straight walls, flat head. */
  block: [
    [[0.05, 0], [0.1, 0.04], [0.1, 0.16]],
    [[0.1, 0.4], [0.1, 0.56], [0.1, 0.76]],
    [[0.1, 0.92], [0.14, 1], [0.26, 1]],
    [[0.42, 1], [0.58, 1], [0.74, 1]],
    [[0.86, 1], [0.9, 0.92], [0.9, 0.76]],
    [[0.9, 0.56], [0.9, 0.4], [0.9, 0.16]],
    [[0.9, 0.04], [0.95, 0], [1, 0]],
  ],
  /** Dovetail: head wider than the neck, straight flared walls. */
  dovetail: [
    [[0.12, 0], [0.2, 0.04], [0.2, 0.14]],
    [[0.153, 0.36], [0.107, 0.58], [0.06, 0.8]],
    [[0.04, 0.96], [0.1, 1], [0.2, 1]],
    [[0.4, 1], [0.6, 1], [0.8, 1]],
    [[0.9, 1], [0.96, 0.96], [0.94, 0.8]],
    [[0.893, 0.58], [0.847, 0.36], [0.8, 0.14]],
    [[0.8, 0.04], [0.88, 0], [1, 0]],
  ],
  /** Asymmetric: steep left wall, flat head, long gentle right shoulder. */
  ramp: [
    [[0.04, 0], [0.08, 0.04], [0.08, 0.2]],
    [[0.08, 0.7], [0.1, 1], [0.24, 1]],
    [[0.4, 1], [0.52, 0.98], [0.64, 0.78]],
    [[0.76, 0.56], [0.86, 0], [1, 0]],
  ],
}

/* -------------------------------------------------------------------------- */
/*  Shapes: each preset expands into connectors for a breakpoint              */
/* -------------------------------------------------------------------------- */

interface Preset {
  position: number
  size: number
  depth: number
  gap: number
  build: (p: { position: number; size: number; depth: number }, bp: Breakpoint) => Connector[]
}

const single =
  (profile: ProfileName, dir: JointDirection, mobileProfile: ProfileName = profile): Preset['build'] =>
  ({ position, size, depth }, bp) => [
    { position, width: size, depth, profile: bp === 'mobile' ? mobileProfile : profile, dir },
  ]

export const SHAPE_PRESETS: Record<PuzzleShape, Preset> = {
  'large-center-tab': { position: 0.5, size: 310, depth: 100, gap: 150, build: single('knob', 'down', 'bell') },
  'small-center-tab': { position: 0.5, size: 140, depth: 52, gap: 110, build: single('knob', 'down', 'bell') },
  'reverse-tab': { position: 0.5, size: 230, depth: 78, gap: 130, build: single('knob', 'up', 'bell') },
  'left-tab': { position: 0.24, size: 230, depth: 70, gap: 160, build: single('block', 'down') },
  'right-tab': { position: 0.76, size: 230, depth: 70, gap: 160, build: single('block', 'down') },
  'asymmetric-tab': { position: 0.36, size: 330, depth: 76, gap: 120, build: single('ramp', 'down') },
  'large-notch': { position: 0.5, size: 320, depth: 96, gap: 140, build: single('dovetail', 'down', 'block') },
  'double-tab': {
    position: 0.5,
    size: 170,
    depth: 62,
    gap: 140,
    build: ({ position, size, depth }, bp) =>
      // Two connectors don't fit legibly on a phone: collapse to one.
      bp === 'mobile'
        ? [{ position, width: size * 1.3, depth, profile: 'block', dir: 'down' }]
        : [
            { position: position - 0.13, width: size, depth, profile: 'block', dir: 'down' },
            { position: position + 0.13, width: size, depth, profile: 'block', dir: 'down' },
          ],
  },
}

/* -------------------------------------------------------------------------- */
/*  Responsive resolution                                                     */
/* -------------------------------------------------------------------------- */

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value))

export function getBreakpoint(viewportWidth: number): Breakpoint {
  if (viewportWidth >= 1024) return 'desktop'
  if (viewportWidth >= 640) return 'tablet'
  return 'mobile'
}

const SIZE_SCALE: Record<Breakpoint, number> = { desktop: 1, tablet: 0.7, mobile: 0.46 }
const DEPTH_SCALE: Record<Breakpoint, number> = { desktop: 1, tablet: 0.72, mobile: 0.5 }
/** Visible gap: scale + [min, max] per breakpoint. */
const GAP_RANGE: Record<Breakpoint, [number, number, number]> = {
  desktop: [1, 80, 180],
  tablet: [0.67, 60, 120],
  mobile: [0.45, 40, 80],
}
/** Keep connectors off the screen edges. */
const EDGE_MARGIN = 20

/** Turn an authored definition into px connectors for a viewport width. */
export function resolveJoint(def: PuzzleDefinition, viewportWidth: number): Joint {
  const preset = SHAPE_PRESETS[def.shape]
  const bp = getBreakpoint(viewportWidth)
  // Wide desktops get slightly larger connectors, so they keep their proportion.
  const fluid = bp === 'desktop' ? clamp(0.85, viewportWidth / 1440, 1.25) : 1
  let position = def.position ?? preset.position
  // On phones, pull off-centre connectors toward the middle so they clear the nav.
  if (bp === 'mobile') position = 0.5 + (position - 0.5) * 0.55
  const size = (def.size ?? preset.size) * SIZE_SCALE[bp] * fluid
  const depth = Math.max(22, (def.depth ?? preset.depth) * DEPTH_SCALE[bp] * fluid)

  const connectors = preset.build({ position, size, depth }, bp).map((c) => {
    const width = Math.min(c.width, viewportWidth * 0.42)
    const half = width / 2 / viewportWidth
    const margin = EDGE_MARGIN / viewportWidth
    return { ...c, width, position: clamp(half + margin, c.position, 1 - half - margin) }
  })

  const [gapScale, gapMin, gapMax] = GAP_RANGE[bp]
  const gap = clamp(gapMin, (def.gap ?? preset.gap) * gapScale, gapMax)

  const reach = (dir: JointDirection) => Math.max(0, ...connectors.filter((c) => c.dir === dir).map((c) => c.depth))
  return { shape: def.shape, connectors, gap, reachDown: reach('down'), reachUp: reach('up') }
}

/**
 * Vertical distances the scroll animation needs, in px, measured between the
 * two pieces' baselines (upper bottom edge → lower top edge).
 */
export function getJointTravel(joint: Joint) {
  const reach = Math.max(joint.reachDown, joint.reachUp)
  return {
    /** Baseline offset at which the visible empty space equals `gap`. */
    separated: joint.gap + joint.reachDown + joint.reachUp,
    /** Connector partly inside its counterpart: clearly lined up. */
    aligned: Math.round(reach * 0.55 + 8),
    /** Close enough for the magnet to take over: a tiny sliver, so the snap is a click, not a jump. */
    near: Math.round(reach * 0.14 + 3),
  }
}

/* -------------------------------------------------------------------------- */
/*  Curves                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The upper piece is drawn slightly larger than the true curve (tabs wider and
 * deeper, notches shallower), so it tucks under the lower piece, which is
 * always stacked above it. This hides anti-aliasing hairlines on the seam.
 */
export const BLEED = 1.5

type Role = 'upper' | 'lower'

interface Curve {
  start: Vec
  /** Absolute cubic segments; straight runs are stored as degenerate cubics. */
  segments: Segment[]
}

const lerp = (a: Vec, b: Vec): Segment => [
  [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3],
  [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3],
  b,
]

/**
 * Joint curve from x=0 to x=width along baseline y. Positive y is down.
 * `role` applies the bleed for the upper piece; the lower piece gets the true curve.
 */
function jointCurve(joint: Joint, width: number, baseline: number, role: Role): Curve {
  const bleed = role === 'upper' ? BLEED : 0
  const y0 = baseline + bleed
  const start: Vec = [0, y0]
  const segments: Segment[] = []
  let cursor: Vec = start

  const sorted = [...joint.connectors].sort((a, b) => a.position - b.position)
  for (const c of sorted) {
    const sign = c.dir === 'down' ? 1 : -1
    // Upper tabs grow, upper notches shrink: both push the upper piece under the lower one.
    const w = c.width + 2 * bleed * sign
    const d = c.depth * sign + bleed
    const x0 = c.position * width - w / 2
    const map = ([u, v]: Vec): Vec => [x0 + u * w, y0 + v * d]
    const from = map([0, 0])
    if (from[0] > cursor[0]) segments.push(lerp(cursor, from))
    for (const [c1, c2, p] of PROFILES[c.profile]) segments.push([map(c1), map(c2), map(p)])
    cursor = map([1, 0])
  }
  segments.push(lerp(cursor, [width, y0]))
  return { start, segments }
}

function straight(width: number, y: number): Curve {
  return { start: [0, y], segments: [lerp([0, y], [width, y])] }
}

/** Same curve, walked from the other end. Reversing a cubic swaps its control points. */
function reverse(curve: Curve): Curve {
  const points = [curve.start, ...curve.segments.map((s) => s[2])]
  const segments: Segment[] = []
  for (let i = curve.segments.length - 1; i >= 0; i--) {
    const [c1, c2] = curve.segments[i]
    segments.push([c2, c1, points[i]])
  }
  return { start: points[points.length - 1], segments }
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString()
const pt = (p: Vec) => `${fmt(p[0])} ${fmt(p[1])}`
const cubics = (c: Curve) => c.segments.map(([c1, c2, p]) => `C${pt(c1)} ${pt(c2)} ${pt(p)}`).join('')
const openPath = (c: Curve) => `M${pt(c.start)}${cubics(c)}`

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

export interface Pads {
  top: number
  bottom: number
}

/** Room a piece needs outside its box: upward tabs on top, downward tabs below. */
export function getPiecePads(top: Joint | null, bottom: Joint | null): Pads {
  return {
    top: top?.reachUp ? Math.ceil(top.reachUp + 2) : 0,
    bottom: bottom?.reachDown ? Math.ceil(bottom.reachDown + BLEED * 2 + 2) : 0,
  }
}

/** How far each joint cuts INTO the piece body (notches), so content can keep clear. */
export function getPieceCuts(top: Joint | null, bottom: Joint | null) {
  return { top: top?.reachDown ?? 0, bottom: bottom?.reachUp ?? 0 }
}

export interface PieceGeometry {
  width: number
  height: number
  /** Closed outline for `clip-path: path()`, in the piece element's box. */
  outline: string
  /** Top edge (true curve), for the seam light. Null when there is no top joint. */
  seam: string | null
  /** Open paths along each joint edge, for rim lighting. */
  rims: string[]
}

/**
 * Outline of one section piece.
 * @param width/height  Size of the piece element (section box + pads).
 * @param top           Joint with the previous section (this piece is its lower side).
 * @param bottom        Joint with the next section (this piece is its upper side).
 */
export function buildPieceGeometry(
  width: number,
  height: number,
  pads: Pads,
  top: Joint | null,
  bottom: Joint | null,
): PieceGeometry {
  const topY = pads.top
  const bottomY = height - pads.bottom
  const topCurve = top ? jointCurve(top, width, topY, 'lower') : straight(width, topY)
  const bottomCurve = bottom ? jointCurve(bottom, width, bottomY, 'upper') : straight(width, bottomY)
  const back = reverse(bottomCurve)

  const outline = `${openPath(topCurve)}L${pt(back.start)}${cubics(back)}Z`
  const rims: string[] = []
  if (top) rims.push(openPath(topCurve))
  if (bottom) rims.push(openPath(bottomCurve))

  return { width, height, outline, seam: top ? openPath(topCurve) : null, rims }
}

/**
 * Standalone path for one side of a joint, for previews and tests.
 *
 *   direction 'outward' → the upper piece (joint on its bottom edge)
 *   direction 'inward'  → the lower piece (joint on its top edge)
 *
 * Both come from the same curve, so they always fit.
 */
export function getPuzzlePath(opts: PuzzleDefinition & { width: number; height: number; direction: 'outward' | 'inward' }) {
  const joint = resolveJoint(opts, opts.width)
  const { width, height } = opts
  if (opts.direction === 'outward') {
    const pads = getPiecePads(null, joint)
    return buildPieceGeometry(width, height + pads.bottom, pads, null, joint).outline
  }
  const pads = getPiecePads(joint, null)
  return buildPieceGeometry(width, height + pads.top, pads, joint, null).outline
}
