import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'
import type { TransitionDef } from '../data/transitions'
import { getJointTravel, resolveJoint } from '../utils/puzzleGeometry'
import { MOTION_QUERY } from './useSmoothScroll'
import { readViewportWidth } from './useViewportWidth'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })
// Sections opt in to parallax/reveal layers, so empty target lists are expected.
gsap.config({ nullTargetWarn: false })

/* -------------------------------------------------------------------------- */
/*  Motion settings shared by every transition. Per-transition feel (shape,   */
/*  gap, phase timing, entry misalignment, snap) lives in data/transitions.ts */
/* -------------------------------------------------------------------------- */

export const MOTION = {
  /** Scroll distance per transition, in viewport heights. Higher = slower. */
  scrollPerSection: 1.6,
  /**
   * Scrub smoothing in seconds. Lenis already smooths the wheel, so this only
   * needs to soften residual steps (touch, keyboard). Higher values stack a
   * second delay on top of Lenis and the pieces start to lag the scroll.
   */
  scrub: 0.5,
  /** How far the camera pans up to expose the current piece's lower edge (fraction of viewport). */
  lift: 0.5,
  /**
   * Resting: when scrolling stops this close to a section (in transitions),
   * glide the last bit so the section sits flush. Further away, the page stays
   * exactly where the user left it.
   */
  settle: { range: 0.14, duration: { min: 0.2, max: 0.45 } },
  /** Seconds per section for nav-driven scrolling. */
  navSecondsPerSection: 0.7,
} as const

/**
 *  IDLE         next piece waiting below the visible gap
 *  APPROACHING  next piece rising toward the current one
 *  ALIGNING     connectors lined up, closing the last few px
 *  SNAPPED      magnet engaged: the pieces are locked together
 */
export type SnapState = 'IDLE' | 'APPROACHING' | 'ALIGNING' | 'SNAPPED'

export type PuzzleScrollMode = 'animated' | 'static'

interface Options {
  transitions: readonly TransitionDef[]
  /** The smooth-scroll instance (null when motion is reduced). */
  lenisRef: RefObject<Lenis | null>
}

/** Scroll velocity (px per frame) below which the page reads as stopped. */
const STOPPED_VELOCITY = 0.3

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Unhurried start, one long glide, a soft landing: the pieces ease into their magnet. */
const easeStep = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2)

/**
 * Pins the stage and maps scroll position onto puzzle transitions. One pinned
 * ScrollTrigger drives one scrubbed timeline: that is the single source of
 * truth for every section's transform.
 *
 * Transition k joins section k-1 (current, "upper") and section k (incoming,
 * "lower"). It spans timeline time [k-1, k]:
 *
 *   pan     the current piece and the waiting next piece move up together, so
 *           the joint edge, the empty gap and the next piece come into view.
 *   rise    the next piece travels up on its own, decelerating.
 *   align   it straightens (x, rotation) and creeps within magnet range.
 *   SNAP    at the end of `align`, a short tween on the piece's float layer (a
 *           separate element, so it never competes with the scrub) closes the
 *           last few px: pull, tiny overshoot, settle.
 *   carry   the locked pair moves up together until the new piece fills the screen.
 *
 * Scrolling back past the snap point releases the pieces; the scrub then
 * carries the lower piece back down and the gap re-opens.
 */
export function usePuzzleScroll(stageRef: RefObject<HTMLElement | null>, { transitions, lenisRef }: Options) {
  const count = transitions.length + 1
  const [active, setActive] = useState(0)
  /** The piece currently under the nav bar (drives nav colours). */
  const [topIndex, setTopIndex] = useState(0)
  const [mode, setMode] = useState<PuzzleScrollMode>('static')
  const activeRef = useRef(0)
  const topIndexRef = useRef(0)
  const triggerRef = useRef<ScrollTrigger | null>(null)
  const modeRef = useRef<PuzzleScrollMode>('static')

  // State setters only fire when the value changes, so scrolling never re-renders React.
  const commitActive = useCallback((index: number) => {
    if (index === activeRef.current) return
    activeRef.current = index
    setActive(index)
  }, [])
  const commitTop = useCallback((index: number) => {
    if (index === topIndexRef.current) return
    topIndexRef.current = index
    setTopIndex(index)
  }, [])

  const scrollToIndex = useCallback(
    (index: number) => {
      const stage = stageRef.current
      if (!stage) return
      const sections = Array.from(stage.querySelectorAll<HTMLElement>('[data-puzzle-section]'))
      const target = sections[index]
      if (!target) return
      const focusTarget = () => target.focus({ preventScroll: true })

      const trigger = triggerRef.current
      const lenis = lenisRef.current
      if (modeRef.current === 'animated' && trigger && lenis) {
        const distance = Math.abs(index - trigger.progress * (sections.length - 1))
        lenis.scrollTo(trigger.labelToScroll(`s${index}`), {
          duration: Math.min(3, 0.6 + distance * MOTION.navSecondsPerSection),
          easing: easeInOutCubic,
          onComplete: () => {
            commitActive(index)
            focusTarget()
          },
        })
      } else {
        target.scrollIntoView({ behavior: 'auto', block: 'start' })
        focusTarget()
      }
    },
    [stageRef, lenisRef, commitActive],
  )

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || count < 1) return

    const mm = gsap.matchMedia()

    /* ---------------------------- Animated mode ---------------------------- */
    mm.add(
      MOTION_QUERY,
      () => {
        modeRef.current = 'animated'
        setMode('animated')
        stage.classList.add('is-animated')

        const sections = gsap.utils.toArray<HTMLElement>('[data-puzzle-section]', stage)
        const n = Math.min(sections.length, count)
        const one = (el: HTMLElement, sel: string) => el.querySelector<HTMLElement>(sel)
        const all = (el: HTMLElement, sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel))
        const floats = sections.map((s) => one(s, ':scope > [data-puzzle-float]'))
        const shadows = sections.map((s) => one(s, '[data-puzzle-shadow]'))
        const shadowShapes = sections.map((s) => one(s, '[data-puzzle-shadow-shape]'))
        const flashes = sections.map((s) => one(s, '[data-seam-flash]'))
        const H = () => stage.clientHeight
        const LIFT = MOTION.lift * 100

        /* Distances depend on the viewport, so they are re-measured before every refresh. */
        let travel = sections.map(() => ({ separated: 0, aligned: 0, near: 0 }))
        let entryScale = 1
        const measure = () => {
          const vw = readViewportWidth()
          entryScale = clamp(0.35, vw / 1440, 1)
          travel = sections.map((_, k) =>
            k === 0 || !transitions[k - 1]
              ? { separated: 0, aligned: 0, near: 0 }
              : getJointTravel(resolveJoint(transitions[k - 1].puzzle, vw)),
          )
        }
        measure()
        ScrollTrigger.addEventListener('refreshInit', measure)

        // Resting state: section 0 in view, every other piece waiting below the fold,
        // already separated from its neighbour by its gap.
        sections.forEach((s, k) => {
          if (k === 0 || k >= n) {
            gsap.set(s, { yPercent: 0, y: 0, force3D: true })
            return
          }
          const { entry } = transitions[k - 1]
          gsap.set(s, {
            yPercent: 100,
            y: travel[k].separated,
            x: entry.x * entryScale,
            rotation: entry.rotate,
            force3D: true,
          })
          s.dataset.puzzleState = 'IDLE'
        })

        const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } })
        tl.addLabel('s0', 0)

        for (let k = 1; k < n; k++) {
          const t0 = k - 1
          const { timing: T, entry } = transitions[k - 1]
          const incoming = sections[k]
          const outgoing = sections[k - 1]
          const carryD = 1 - T.carry
          const ex = () => entry.x * entryScale

          /* ---- camera pan + locked carry: the current piece and the one locked above it ---- */
          for (let j = Math.max(0, k - 2); j <= k - 1; j++) {
            const base = -(k - 1 - j) * 100
            tl.fromTo(sections[j], { yPercent: base }, { yPercent: base - LIFT, duration: T.pan, ease: 'power1.inOut' }, t0)
            tl.fromTo(
              sections[j],
              { yPercent: base - LIFT },
              { yPercent: base - 100, duration: carryD, ease: 'power1.inOut' },
              t0 + T.carry,
            )
          }

          /* ---- incoming piece: one element, one transform, every property from this timeline ---- */
          // Pan: moves with the camera, so the gap in front of it stays exactly `gap`.
          tl.fromTo(incoming, { yPercent: 100 }, { yPercent: 100 - LIFT, duration: T.pan, ease: 'power1.inOut' }, t0)
          // Rise: the gap closes continuously with scroll, decelerating toward the joint.
          tl.fromTo(
            incoming,
            { y: () => travel[k].separated },
            { y: () => travel[k].aligned, duration: T.rise - T.pan, ease: 'power2.out' },
            t0 + T.pan,
          )
          // Align: the last few px, slowly.
          tl.fromTo(
            incoming,
            { y: () => travel[k].aligned },
            { y: () => travel[k].near, duration: T.align - T.rise, ease: 'sine.out' },
            t0 + T.rise,
          )
          // It arrives slightly crooked and straightens as the connectors line up.
          tl.fromTo(
            incoming,
            { x: ex, rotation: entry.rotate },
            { x: 0, rotation: 0, duration: T.align - T.pan, ease: 'power2.inOut' },
            t0 + T.pan,
          )
          // Carry: locked to the piece above.
          tl.fromTo(
            incoming,
            { yPercent: 100 - LIFT },
            { yPercent: 0, duration: carryD, ease: 'power1.inOut' },
            t0 + T.carry,
          )

          // Lifted shadow while it travels (opacity only; the blur itself is static).
          tl.fromTo(shadows[k], { opacity: 0 }, { opacity: 1, duration: T.pan }, t0).fromTo(
            shadows[k],
            { opacity: 1 },
            { opacity: 0, duration: carryD },
            t0 + T.carry,
          )

          /* ---- content: parallax and short reveals on child elements only ---- */
          tl.fromTo(
            all(incoming, '[data-depth]'),
            { y: (_i: number, el: HTMLElement) => Number(el.dataset.depth) * H() * 0.3 },
            { y: 0, duration: 1, immediateRender: true },
            t0,
          )
          tl.fromTo(
            all(outgoing, '[data-depth]'),
            { y: 0 },
            { y: (_i: number, el: HTMLElement) => -Number(el.dataset.depth) * H() * 0.3, duration: 1 },
            t0,
          )
          // Staggers use a fixed `amount` so every reveal ends inside its transition,
          // keeping labels exactly on whole numbers.
          tl.fromTo(
            all(incoming, '[data-reveal="line"]'),
            { yPercent: 110 },
            { yPercent: 0, duration: 0.3, stagger: { amount: 0.1 }, ease: 'power3.out', immediateRender: true },
            t0 + T.pan + 0.08,
          )
            .fromTo(
              all(incoming, '[data-reveal="fade"]'),
              { y: 20, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.22, stagger: { amount: 0.1 }, ease: 'power2.out', immediateRender: true },
              t0 + T.rise - 0.06,
            )
            .fromTo(
              all(incoming, '[data-reveal="image"]'),
              { scale: 1.03 },
              { scale: 1, duration: 0.4, ease: 'power2.out', immediateRender: true },
              t0 + T.rise - 0.06,
            )

          tl.addLabel(`s${k}`, k)
        }

        if (import.meta.env.DEV && Math.abs(tl.duration() - (n - 1)) > 1e-6) {
          console.warn(`[usePuzzleScroll] timeline is ${tl.duration()} long; tweens overrun their transition.`)
        }

        /* ---------------------------- Snap state ---------------------------- */
        const states: SnapState[] = sections.map((_, k) => (k === 0 ? 'SNAPPED' : 'IDLE'))
        const snapTweens: (gsap.core.Timeline | null)[] = sections.map(() => null)

        /**
         * Once the visitor has reached the bottom, the sections stay joined for good:
         * scrolling back up carries the whole locked stack instead of un-making each joint.
         */
        let connected = false

        const stateAt = (k: number, time: number): SnapState => {
          if (connected) return 'SNAPPED'
          const T = transitions[k - 1].timing
          const t = time - (k - 1)
          if (t >= T.align) return 'SNAPPED'
          if (t >= T.rise) return 'ALIGNING'
          if (t >= T.pan) return 'APPROACHING'
          return 'IDLE'
        }

        /** Stop any snap/release in flight on piece k: never two at once. */
        const stopSnap = (k: number) => {
          snapTweens[k]?.kill()
          snapTweens[k] = null
          gsap.killTweensOf([floats[k], shadowShapes[k], flashes[k]].filter(Boolean))
        }

        /** Magnet engages: short pull, a hair of overshoot, settle, lock. */
        const snapIn = (k: number, instant: boolean) => {
          const float = floats[k]
          if (!float) return
          stopSnap(k)
          const near = travel[k].near
          if (instant) {
            gsap.set(float, { y: -near })
            gsap.set(shadowShapes[k], { opacity: 0 })
            return
          }
          const { duration: d, overshoot } = transitions[k - 1].snap
          const pull = Math.min(0.24, d * 0.3)
          const rebound = d * 0.28
          const settle = d * 0.42
          const sweep = flashes[k]?.querySelector<SVGPathElement>('.ps-seam-sweep') ?? null
          const glow = flashes[k]?.querySelector<SVGPathElement>('.ps-seam-glow') ?? null
          snapTweens[k] = gsap
            .timeline()
            // The magnet is strongest at the end: the pull accelerates into contact...
            .to(float, { y: -near - overshoot, scale: 0.996, transformOrigin: '50% 0%', duration: pull, ease: 'power3.in' })
            // ...the pieces press together, rebound a hair, and settle into the exact joint.
            .to(float, { y: -near + overshoot * 0.3, scale: 1.0025, duration: rebound, ease: 'power2.out' })
            .to(float, { y: -near, scale: 1, duration: settle, ease: 'power2.inOut' })
            .to(shadowShapes[k], { opacity: 0, duration: pull, ease: 'power2.in' }, 0)
            // Impact light: the joint flares, a bright spark runs along it, and the glow decays.
            .fromTo(flashes[k], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, pull)
            .fromTo(glow, { attr: { 'stroke-width': 8 } }, { attr: { 'stroke-width': 30 }, duration: 0.8, ease: 'power2.out' }, pull)
            .fromTo(sweep, { strokeDashoffset: 0.16 }, { strokeDashoffset: -1, duration: 0.95, ease: 'power2.inOut' }, pull)
            .to(flashes[k], { autoAlpha: 0, duration: 0.9, ease: 'power2.out' }, pull + 0.35)
        }

        /** Scrolling back past the snap point: the pieces separate. */
        const snapOut = (k: number, instant: boolean) => {
          const float = floats[k]
          if (!float) return
          stopSnap(k)
          if (instant) {
            gsap.set(float, { y: 0, scale: 1 })
            gsap.set(shadowShapes[k], { opacity: 1 })
            gsap.set(flashes[k], { autoAlpha: 0 })
            return
          }
          snapTweens[k] = gsap
            .timeline()
            .to(float, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out' })
            .to(shadowShapes[k], { opacity: 1, duration: 0.25, ease: 'power1.out' }, 0.05)
            .set(flashes[k], { autoAlpha: 0 }, 0)
        }

        const sync = (instant: boolean) => {
          const time = tl.time()
          for (let k = 1; k < n; k++) {
            const next = stateAt(k, time)
            const prev = states[k]
            if (next === prev) continue
            states[k] = next
            sections[k].dataset.puzzleState = next
            if (next === 'SNAPPED') snapIn(k, instant)
            else if (prev === 'SNAPPED') snapOut(k, instant)
          }
        }
        // Driven by the animation's own time (not raw scroll), so the magnet engages
        // exactly when the piece has visually reached alignment.
        const enterConnected = () => {
          if (connected || tl.progress() < 0.999) return
          connected = true
          // Replace the separate-then-join choreography with one rigid stack: every
          // piece sits exactly where it ended up, and just moves with the scroll.
          tl.clear()
          for (let k = 0; k < n; k++) {
            tl.addLabel(`s${k}`, k) // clear() drops labels; scrollToIndex / step scrolling need them
            tl.fromTo(sections[k], { yPercent: k * 100 }, { yPercent: (k - (n - 1)) * 100, duration: n - 1, ease: 'none' }, 0)
          }
          tl.progress(1, true)
          for (let k = 1; k < n; k++) {
            states[k] = 'SNAPPED'
            sections[k].dataset.puzzleState = 'SNAPPED'
          }
        }
        tl.eventCallback('onUpdate', () => {
          sync(false)
          // Outside the render pass: rebuilding a timeline from its own callback is asking for trouble.
          if (!connected && tl.progress() >= 0.999) requestAnimationFrame(enterConnected)
        })

        // After a resize the lock distance changes: re-seat locked pieces without animating.
        const onRefresh = () => {
          for (let k = 1; k < n; k++) {
            if (states[k] === 'SNAPPED' && !snapTweens[k]?.isActive()) gsap.set(floats[k], { y: -travel[k].near })
          }
        }
        ScrollTrigger.addEventListener('refresh', onRefresh)

        const trigger = ScrollTrigger.create({
          trigger: stage,
          start: 'top top',
          end: () => `+=${Math.max(1, n - 1) * H() * MOTION.scrollPerSection}`,
          pin: true,
          anticipatePin: 1,
          scrub: MOTION.scrub,
          animation: tl,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const pos = self.progress * (n - 1)
            commitActive(Math.round(pos))
            // The incoming piece only covers the nav in the last few % of the carry.
            commitTop(Math.min(n - 1, Math.floor(pos + 0.03)))
          },
        })
        triggerRef.current = trigger
        // Page restored mid-scroll: seat every piece in its state without animating.
        sync(true)

        /*
         * Resting. There is no scroll-snap: the page goes wherever the user
         * scrolls. Only once scrolling has fully stopped close to a section does
         * it glide the remaining few px (one short scrollTo, never during a scroll).
         * `?nosnap` disables it, to inspect mid-transition states.
         */
        const settleOff = import.meta.env.DEV && new URLSearchParams(location.search).has('nosnap')
        let settleTimer = 0
        let touching = false
        const onTouchStart = () => (touching = true)
        const onTouchEnd = (e: TouchEvent) => (touching = e.touches.length > 0)
        window.addEventListener('touchstart', onTouchStart, { passive: true })
        window.addEventListener('touchend', onTouchEnd, { passive: true })
        window.addEventListener('touchcancel', onTouchEnd, { passive: true })

        const settle = () => {
          const lenis = lenisRef.current
          // Never pull against a finger that is still on the screen.
          if (settleOff || !lenis || touching || n < 2) return
          // Still visibly moving: check again shortly. (Lenis' ease-out has a long
          // sub-pixel tail; below ~0.3 px/frame the scroll reads as stopped.)
          if (lenis.isScrolling && Math.abs(lenis.velocity) > STOPPED_VELOCITY) {
            settleTimer = window.setTimeout(settle, 120)
            return
          }
          const pos = trigger.progress * (n - 1)
          const nearest = Math.round(pos)
          const off = Math.abs(pos - nearest)
          if (off < 0.004 || off > MOTION.settle.range) return
          const { min, max } = MOTION.settle.duration
          lenis.scrollTo(trigger.labelToScroll(`s${nearest}`), {
            duration: min + (max - min) * (off / MOTION.settle.range),
            easing: easeOutCubic,
          })
        }
        // "Scrolling has stopped" = no scroll frame for a moment. Lenis reports native
        // touch momentum as well as wheel scrolling, so this works for both inputs
        // (ScrollTrigger's own scrollEnd was measured to miss touch gestures).
        const unsubscribeScroll = lenisRef.current?.on('scroll', (lenis: Lenis) => {
          // Sub-pixel tail frames don't postpone the settle.
          if (Math.abs(lenis.velocity) <= STOPPED_VELOCITY && settleTimer) return
          window.clearTimeout(settleTimer)
          settleTimer = window.setTimeout(() => {
            settleTimer = 0
            settle()
          }, 180)
        })

        /*
         * Step scrolling: one wheel notch / swipe / key press carries the page a whole
         * section, the pieces rise and snap, and further input is ignored until it
         * lands. (Reduced-motion visitors never get this: they keep native scrolling.)
         */
        const STEP_SECONDS = 2
        let stepping = false
        let unlockAt = 0
        let lastWheel = { t: 0, abs: 0 }
        const stepTo = (dir: 1 | -1) => {
          const lenis = lenisRef.current
          if (!lenis || stepping || lenis.isScrolling === 'smooth' || n < 2) return
          const pos = trigger.progress * (n - 1)
          const target = Math.min(n - 1, Math.max(0, dir > 0 ? Math.floor(pos + 0.02) + 1 : Math.ceil(pos - 0.02) - 1))
          if (target === Math.round(pos) && Math.abs(pos - target) < 0.02) return
          stepping = true
          lenis.scrollTo(trigger.labelToScroll(`s${target}`), {
            duration: STEP_SECONDS,
            easing: easeStep,
            onComplete: () => {
              stepping = false
              // Trackpad inertia keeps firing wheel events for a moment after the gesture.
              unlockAt = performance.now() + 400
              commitActive(target)
            },
          })
        }
        const onWheel = (e: WheelEvent) => {
          if (e.ctrlKey) return // pinch-zoom
          e.preventDefault()
          // Lenis treats any wheel event as a native scroll and would cancel the step in flight.
          e.stopPropagation()
          const now = performance.now()
          const abs = Math.abs(e.deltaY)
          const quiet = now - lastWheel.t > 100
          const surge = abs > lastWheel.abs * 1.6
          lastWheel = { t: now, abs }
          if (abs < 4 || stepping || now < unlockAt) return
          // A new gesture: after a pause, or a clear surge — not the decaying tail of the last one.
          if (!quiet && !surge) return
          stepTo(e.deltaY > 0 ? 1 : -1)
        }
        const onKey = (e: KeyboardEvent) => {
          if (e.altKey || e.ctrlKey || e.metaKey) return
          const t = e.target as HTMLElement | null
          if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
          const down = e.key === 'PageDown' || e.key === 'ArrowDown' || (e.key === ' ' && !e.shiftKey)
          const up = e.key === 'PageUp' || e.key === 'ArrowUp' || (e.key === ' ' && e.shiftKey)
          if (!down && !up) return
          // A focused button/link keeps Space/Enter for itself.
          if (e.key === ' ' && t && /^(BUTTON|A)$/.test(t.tagName)) return
          e.preventDefault()
          if (now() >= unlockAt) stepTo(down ? 1 : -1)
        }
        const now = () => performance.now()
        let swipe: { y: number } | null = null
        const onTouchStartStep = (e: TouchEvent) => {
          swipe = e.touches.length === 1 ? { y: e.touches[0].clientY } : null
        }
        const onTouchMoveStep = (e: TouchEvent) => {
          // Own the vertical gesture (leave multi-finger pinch alone).
          if (swipe && e.touches.length === 1 && e.cancelable) e.preventDefault()
        }
        const onTouchEndStep = (e: TouchEvent) => {
          if (!swipe || e.changedTouches.length !== 1) return
          const dy = swipe.y - e.changedTouches[0].clientY
          swipe = null
          if (Math.abs(dy) > 40) stepTo(dy > 0 ? 1 : -1)
        }
        window.addEventListener('wheel', onWheel, { passive: false, capture: true })
        window.addEventListener('keydown', onKey)
        window.addEventListener('touchstart', onTouchStartStep, { passive: true })
        window.addEventListener('touchmove', onTouchMoveStep, { passive: false })
        window.addEventListener('touchend', onTouchEndStep, { passive: true })

        if (import.meta.env.DEV) {
          ;(window as unknown as { __puzzle?: unknown }).__puzzle = { tl, trigger, states, lenis: () => lenisRef.current }
        }

        // Hero entrance (not scroll-driven).
        const hero = sections[0]
        gsap
          .timeline({ delay: 0.15 })
          .from(all(hero, '[data-reveal="line"]'), { yPercent: 110, duration: 1.1, stagger: 0.09, ease: 'power4.out' })
          .from(
            all(hero, '[data-reveal="fade"]'),
            { y: 20, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' },
            '-=0.7',
          )

        // Focus inside an off-screen section (keyboard users) → bring it into view.
        const onFocusIn = (e: FocusEvent) => {
          const section = (e.target as HTMLElement).closest<HTMLElement>('[data-puzzle-section]')
          const index = section ? sections.indexOf(section) : -1
          if (index >= 0 && index !== activeRef.current) scrollToIndex(index)
        }
        // Focus can scroll an overflow:hidden element; keep the stage at 0,0.
        const onStageScroll = () => {
          stage.scrollTop = 0
          stage.scrollLeft = 0
        }
        stage.addEventListener('focusin', onFocusIn)
        stage.addEventListener('scroll', onStageScroll)

        // One refresh once web fonts have changed the layout. Never during scroll.
        document.fonts?.ready.then(() => ScrollTrigger.refresh())

        return () => {
          ScrollTrigger.removeEventListener('refreshInit', measure)
          ScrollTrigger.removeEventListener('refresh', onRefresh)
          unsubscribeScroll?.()
          window.clearTimeout(settleTimer)
          window.removeEventListener('touchstart', onTouchStart)
          window.removeEventListener('touchend', onTouchEnd)
          window.removeEventListener('touchcancel', onTouchEnd)
          window.removeEventListener('wheel', onWheel, { capture: true })
          window.removeEventListener('keydown', onKey)
          window.removeEventListener('touchstart', onTouchStartStep)
          window.removeEventListener('touchmove', onTouchMoveStep)
          window.removeEventListener('touchend', onTouchEndStep)
          sections.forEach((_, k) => stopSnap(k))
          // Snap tweens run outside this context, so matchMedia can't revert them.
          gsap.set([...floats, ...shadowShapes, ...flashes].filter(Boolean), { clearProps: 'transform,opacity,visibility' })
          stage.removeEventListener('focusin', onFocusIn)
          stage.removeEventListener('scroll', onStageScroll)
          stage.classList.remove('is-animated')
          sections.forEach((s) => delete s.dataset.puzzleState)
          triggerRef.current = null
          modeRef.current = 'static'
          setMode('static')
        }
      },
      stage,
    )

    /* ----------------------------- Static mode ----------------------------- */
    // Reduced motion (or very short viewports): normal document flow. The
    // puzzle edges still interlock, because each tab sits in the next notch.
    mm.add(`not all and ${MOTION_QUERY}`, () => {
      const sections = gsap.utils.toArray<HTMLElement>('[data-puzzle-section]', stage)
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const index = sections.indexOf(entry.target as HTMLElement)
            commitActive(index)
            commitTop(index)
          }
        },
        { rootMargin: '-45% 0px -45% 0px' },
      )
      sections.forEach((s) => io.observe(s))
      return () => io.disconnect()
    })

    return () => mm.revert()
  }, [stageRef, lenisRef, count, transitions, commitActive, commitTop, scrollToIndex])

  return { active, topIndex, mode, scrollToIndex }
}
