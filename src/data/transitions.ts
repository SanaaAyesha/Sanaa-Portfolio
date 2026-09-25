import type { PuzzleDefinition } from '../utils/puzzleGeometry'

/**
 * One entry per boundary, top to bottom: `transitions[i]` joins section i to
 * section i+1. Each transition has its own shape, gap, timing and snap feel.
 */
export interface TransitionDef {
  from: string
  to: string
  puzzle: PuzzleDefinition
  /**
   * Phase boundaries, as fractions of this transition's scroll distance:
   *   0 → pan      the camera moves up with the current piece, revealing its
   *                edge, the empty gap and the waiting next piece
   *   pan → rise   the next piece travels up on its own and slows down
   *   rise → align it straightens and creeps close enough for the magnet
   *   align        the magnet snaps it in (a short tween, see `snap`)
   *   carry → 1    the locked pair moves up together until the new piece fills the screen
   * Keep `align` late (≥ 0.84): the snap should only happen near alignment.
   */
  timing: { pan: number; rise: number; align: number; carry: number }
  /** How the piece arrives misaligned: x offset in desktop px, rotation in degrees. */
  entry: { x: number; rotate: number }
  /** Snap: duration in seconds, overshoot in px past the lock (keep ≤ 2). */
  snap: { duration: number; overshoot: number }
}

export const TRANSITIONS: TransitionDef[] = [
  {
    from: 'hero',
    to: 'about',
    puzzle: { shape: 'large-center-tab', position: 0.5, gap: 150 },
    timing: { pan: 0.18, rise: 0.62, align: 0.86, carry: 0.9 },
    entry: { x: 24, rotate: 0.4 },
    snap: { duration: 0.3, overshoot: 1.5 },
  },
  {
    from: 'about',
    to: 'services',
    puzzle: { shape: 'reverse-tab', position: 0.58, gap: 120 },
    timing: { pan: 0.2, rise: 0.6, align: 0.85, carry: 0.9 },
    entry: { x: -30, rotate: -0.5 },
    snap: { duration: 0.34, overshoot: 1.5 },
  },
  {
    from: 'services',
    to: 'projects',
    puzzle: { shape: 'left-tab', gap: 170 },
    timing: { pan: 0.16, rise: 0.64, align: 0.87, carry: 0.91 },
    entry: { x: 36, rotate: 0.3 },
    snap: { duration: 0.28, overshoot: 1 },
  },
  {
    from: 'projects',
    to: 'contact',
    puzzle: { shape: 'asymmetric-tab', gap: 110 },
    timing: { pan: 0.18, rise: 0.62, align: 0.85, carry: 0.89 },
    entry: { x: -20, rotate: -0.5 },
    snap: { duration: 0.36, overshoot: 2 },
  },
]
