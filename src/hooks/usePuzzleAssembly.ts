import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import gsap from 'gsap'
import { createGrid, mulberry32, piecePath, TAB_REACH } from '../utils/jigsaw'
import { scatterLayout, type Rect } from '../utils/scatterLayout'
import { snapAudio } from '../utils/snapAudio'
import { createWaterWave, getWaterMap, type WaterWave } from '../utils/waterWave'

export const puzzleConfig = {
  /** Grid of the cut; pieces that fall on transparent pixels are dropped. */
  cols: 9,
  rows: 12,
  scatterRangeX: 1.5,
  scatterRangeY: 1.3,
  allowOffscreenPieces: true,
  enableIdleFloat: true,
  /** Pointer influence on scattered pieces: radius px, max push px. */
  mouseRadius: 230,
  mousePush: 12,
}

const IMAGE_SRC = '/portrait.png'
/** Seconds after the last piece lands until the visual impact (the dip in the portrait's scale). The sound's peak lands here. */
const IMPACT_DELAY = 0.075

/* -------------------------------------------------------------------------- */
/*  One-time state machine, shared by the engine and the hint button          */
/* -------------------------------------------------------------------------- */

export type PuzzleState = 'scattered' | 'assembling' | 'snapping' | 'assembled'

// Module-level on purpose: the experience happens once per page load.
let phase: PuzzleState = 'scattered'
const listeners = new Set<() => void>()
const setPhase = (next: PuzzleState) => {
  if (phase === next) return
  phase = next
  listeners.forEach((l) => l())
}

export const puzzleStore = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => phase,
  /** First hover / tap / button press. Later calls do nothing. */
  start() {
    if (phase === 'scattered') setPhase('assembling')
  },
}

export function usePuzzleState() {
  return useSyncExternalStore(puzzleStore.subscribe, puzzleStore.get, puzzleStore.get)
}

/* -------------------------------------------------------------------------- */
/*  Engine                                                                    */
/* -------------------------------------------------------------------------- */

interface Piece {
  col: number
  row: number
  sprite: HTMLCanvasElement | null
  /** Sprite size in css px. */
  sw: number
  sh: number
  /** Final centre, relative to the target's top-left, css px. */
  fx: number
  fy: number
  // Scatter pose (canvas css px).
  sx: number
  sy: number
  rot0: number
  scale0: number
  depth: number
  /** Curve of the flight path, as a fraction of the travel distance. */
  curve: number
  /** 0 scattered → 1 assembled. Tweened by GSAP, read by the draw loop. */
  t: number
  // Idle float.
  ax: number
  ay: number
  f1: number
  f2: number
  ph1: number
  ph2: number
  rotAmp: number
  // Smoothed pointer influence.
  ox: number
  oy: number
}

const smooth = (v: number) => v * v * (3 - 2 * v)

export function usePuzzleAssembly(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const section = canvas.closest<HTMLElement>('[data-puzzle-section]')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const img = new Image()
    img.decoding = 'async'
    let imgReady = false
    let alphaMap: { data: Uint8ClampedArray; w: number; h: number } | null = null

    let pieces: Piece[] = []
    let dpr = 1
    let cssW = 0
    let cssH = 0
    let targetEl: HTMLElement | null = null
    let finalImg: HTMLElement | null = null
    let built: { tw: number; th: number; dpr: number } | null = null

    /** Everything GSAP drives besides the pieces themselves. */
    const fx = { float: 1, scale: 1, ripple: 0 }
    let started = false
    let flying = false
    let arrived = 0
    let raf = 0
    let visible = true
    let disposed = false
    let pointer: { x: number; y: number } | null = null
    let snapTl: gsap.core.Timeline | null = null

    const rects = {
      canvas: { left: 0, top: 0 },
      target: { x: 0, y: 0, w: 0, h: 0 },
    }

    const findTarget = () => (targetEl ??= section?.querySelector<HTMLElement>('[data-puzzle-target]') ?? null)

    /* ---------------------------- geometry ---------------------------- */

    function measure() {
      const el = findTarget()
      if (!el) return false
      const c = canvas!.getBoundingClientRect()
      const t = el.getBoundingClientRect()
      rects.canvas.left = c.left
      rects.canvas.top = c.top
      rects.target.x = t.left - c.left
      rects.target.y = t.top - c.top
      rects.target.w = t.width
      rects.target.h = t.height
      return t.width > 0 && t.height > 0
    }

    function buildAlphaMap() {
      const w = 96
      const h = Math.round((w * img.naturalHeight) / img.naturalWidth)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0, w, h)
      alphaMap = { data: g.getImageData(0, 0, w, h).data, w, h }
    }

    /** Does the cell (plus room for its tabs) touch any visible pixel? */
    function hasPixels(col: number, row: number) {
      if (!alphaMap) return true
      const { cols, rows } = puzzleConfig
      const { data, w, h } = alphaMap
      const pad = 0.25
      const x0 = Math.max(0, Math.floor(((col - pad) / cols) * w))
      const x1 = Math.min(w, Math.ceil(((col + 1 + pad) / cols) * w))
      const y0 = Math.max(0, Math.floor(((row - pad) / rows) * h))
      const y1 = Math.min(h, Math.ceil(((row + 1 + pad) / rows) * h))
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) if (data[(y * w + x) * 4 + 3] > 24) return true
      }
      return false
    }

    /**
     * Cut sprites for the current target size. Existing piece objects are
     * updated in place, so GSAP tweens already running on them keep working.
     */
    function buildSprites() {
      const { w: tw, h: th } = rects.target
      if (!imgReady || tw < 8 || th < 8) return
      const { cols, rows } = puzzleConfig
      const grid = createGrid(cols, rows)
      const cwCss = tw / cols
      const chCss = th / rows
      const cwDev = cwCss * dpr
      const chDev = chCss * dpr
      const k = Math.min(cwDev, chDev)
      const m = Math.ceil(TAB_REACH * k) + 3

      const previous = new Map(pieces.map((p) => [p.row * cols + p.col, p]))
      const rnd = mulberry32(23)
      const next: Piece[] = []

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const r = rnd() // keep the random stream stable whether or not a piece exists
          const r2 = rnd()
          const r3 = rnd()
          const r4 = rnd()
          const r5 = rnd()
          const r6 = rnd()
          const r7 = rnd()
          if (!hasPixels(col, row)) continue

          const sw = Math.ceil(cwDev + 2 * m)
          const sh = Math.ceil(chDev + 2 * m)
          const sprite = document.createElement('canvas')
          sprite.width = sw
          sprite.height = sh
          const g = sprite.getContext('2d')!
          g.translate(m - col * cwDev, m - row * chDev)
          const path = piecePath(grid, col, row, cwDev, chDev)
          g.save()
          g.clip(path)
          g.drawImage(img, 0, 0, tw * dpr, th * dpr)
          // Hairline edge, like a pressed jigsaw. Half of it is clipped away.
          g.lineWidth = Math.max(1, dpr)
          g.strokeStyle = 'rgba(255,255,255,0.5)'
          g.stroke(path)
          g.restore()

          const old = previous.get(row * cols + col)
          if (old) {
            old.sprite = sprite
            old.sw = sw / dpr
            old.sh = sh / dpr
            old.fx = (col + 0.5) * cwCss
            old.fy = (row + 0.5) * chCss
            next.push(old)
            continue
          }
          const still = r6 < 0.25
          next.push({
            col,
            row,
            sprite,
            sw: sw / dpr,
            sh: sh / dpr,
            fx: (col + 0.5) * cwCss,
            fy: (row + 0.5) * chCss,
            sx: 0,
            sy: 0,
            rot0: 0,
            scale0: 1,
            depth: r,
            curve: (r2 - 0.5) * 0.7,
            t: 0,
            ax: still ? 1 + r3 * 2 : 5 + r3 * 12,
            ay: still ? 1 + r4 * 2 : 4 + r4 * 11,
            f1: 0.07 + r5 * 0.16,
            f2: 0.05 + r7 * 0.14,
            ph1: r3 * 6.28,
            ph2: r4 * 6.28,
            rotAmp: still ? 0.01 : 0.02 + r5 * 0.05,
            ox: 0,
            oy: 0,
          })
        }
      }
      const fresh = previous.size === 0
      pieces = next
      built = { tw, th, dpr }
      if (fresh) layoutScatter()
      if (started) begin()
    }

    function layoutScatter() {
      if (!pieces.length || cssW === 0) return
      const { w: tw, h: th } = rects.target
      const cw = tw / puzzleConfig.cols
      const ch = th / puzzleConfig.rows

      const avoid: Rect[] = []
      section?.querySelectorAll<HTMLElement>('h1, [data-puzzle-avoid]').forEach((el) => {
        const b = el.getBoundingClientRect()
        avoid.push({ x: b.left - rects.canvas.left, y: b.top - rects.canvas.top, w: b.width, h: b.height })
      })

      const scatter = scatterLayout({
        count: pieces.length,
        cell: Math.max(cw, ch),
        target: { ...rects.target },
        bounds: { w: cssW, h: cssH },
        avoid,
        rangeX: puzzleConfig.scatterRangeX,
        rangeY: puzzleConfig.scatterRangeY,
        allowOffscreen: puzzleConfig.allowOffscreenPieces,
      })
      pieces.forEach((p, i) => {
        const s = scatter[i]
        p.sx = s.x
        p.sy = s.y
        p.rot0 = s.rot
        p.scale0 = s.scale
        p.depth = s.depth
      })
      // Far pieces first, near ones on top.
      pieces.sort((a, b) => a.depth - b.depth)
    }

    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const b = canvas!.getBoundingClientRect()
      cssW = b.width
      cssH = b.height
      canvas!.width = Math.max(1, Math.round(cssW * dpr))
      canvas!.height = Math.max(1, Math.round(cssH * dpr))
    }

    let rebuildTimer = 0
    function refresh() {
      if (disposed || phase === 'assembled') return
      resizeCanvas()
      if (!measure()) return
      const changed =
        !built || Math.abs(built.tw - rects.target.w) > 1 || Math.abs(built.th - rects.target.h) > 1 || built.dpr !== dpr
      if (changed) buildSprites()
      else if (phase === 'scattered') layoutScatter()
      schedule()
    }
    const scheduleRefresh = () => {
      window.clearTimeout(rebuildTimer)
      rebuildTimer = window.setTimeout(refresh, 120)
    }

    /* --------------------------- animation ---------------------------- */

    /** SCATTERED → ASSEMBLING. Runs once, as soon as the pieces exist. */
    function begin() {
      if (flying || !pieces.length) return
      flying = true
      arrived = 0
      const diag = Math.hypot(cssW, cssH) || 1

      // Idle drift and pointer pull stop the moment assembly begins.
      gsap.to(fx, { float: 0, duration: reduced ? 0.01 : 0.3, ease: 'power1.out', overwrite: 'auto' })

      let lastLanding = 0
      for (const p of pieces) {
        const dx = rects.target.x + p.fx - p.sx
        const dy = rects.target.y + p.fy - p.sy
        const far = Math.min(Math.hypot(dx, dy) / diag, 1.2)
        const rnd = Math.random()
        const duration = reduced ? 0.35 : Math.min(1.65, 0.8 + far * 0.95 + rnd * 0.15)
        const delay = reduced ? 0 : rnd * 0.28 + far * 0.12
        lastLanding = Math.max(lastLanding, delay + duration)
        gsap.to(p, {
          t: 1,
          duration,
          delay,
          // Long deceleration into the seat: tabs line up before the click.
          ease: reduced ? 'none' : 'power3.inOut',
          overwrite: true,
          onComplete: () => {
            if (++arrived === pieces.length) snap()
          },
        })
      }
      // The last piece lands at `lastLanding`; the sound is scheduled so its peak meets the impact just after.
      snapAudio.arm(performance.now() + (lastLanding + IMPACT_DELAY) * 1000)
    }

    /** ASSEMBLING → SNAPPING → ASSEMBLED. One timeline owns the whole finale. */
    function snap() {
      if (disposed || phase === 'snapping' || phase === 'assembled') return
      setPhase('snapping')
      snapAudio.reportAtSnap()

      // Hand the picture over to the DOM image: pixel-identical, no seams, and
      // it stays correctly seated if the hero moves during later scrolls.
      if (finalImg) {
        finalImg.style.opacity = '1'
        finalImg.style.transformOrigin = '50% 50%'
      }
      pieces.forEach((p) => (p.sprite = null))
      // The canvas has done its job: wipe the last frame (pieces + placeholder) so no outline lingers.
      cancelAnimationFrame(raf)
      raf = 0
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      const applyScale = () => {
        if (finalImg) finalImg.style.transform = `scale(${fx.scale})`
      }
      const tl = gsap.timeline({
        onComplete: () => {
          if (finalImg) finalImg.style.transform = ''
          finish()
        },
      })
      snapTl = tl

      if (!reduced) {
        // ALIGN → CLICK → IMPACT → SETTLE
        tl.to(fx, { scale: 0.992, duration: 0.075, ease: 'power2.in', onUpdate: applyScale }, 0)
          .to(fx, { scale: 1.004, duration: 0.12, ease: 'power2.out', onUpdate: applyScale })
          .to(fx, { scale: 1, duration: 0.2, ease: 'power2.inOut', onUpdate: applyScale })
      }
      // One water wave, from the moment of impact, through the whole hero.
      const wave = reduced ? null : startWave()
      if (wave) {
        activeWave = wave
        // The wave lasts as long as the sound's tail and follows its decay.
        const span = snapAudio.tail
        const onWave = () => {
          const energy = Math.pow(snapAudio.level(fx.ripple * span), 0.6)
          wave.set(fx.ripple, energy)
          drawTint(fx.ripple, energy)
        }
        tl.to(fx, { ripple: 1, duration: span, ease: 'none', onUpdate: onWave }, IMPACT_DELAY)
      } else {
        // Reduced motion: a brief soft settle instead of the travelling distortion.
        const body = section?.querySelector<HTMLElement>('.ps-body')
        if (body) tl.fromTo(body, { opacity: 0.94 }, { opacity: 1, duration: 0.4, clearProps: 'opacity' }, 0)
      }
    }

    let activeWave: WaterWave | null = null
    /** Wave geometry, shared by the distortion and the tint so the two stay locked together. */
    let waveGeom: { x: number; y: number; start: number; end: number } | null = null

    /** A single soft Powder Blue shade riding the crest: the water's colour, not a ring. */
    function drawTint(p: number, energy: number) {
      if (!waveGeom || !measure()) return
      const radius = waveGeom.start + (waveGeom.end - waveGeom.start) * p
      const env = Math.min(1, p / 0.03) * energy
      const half = radius * 0.38 + 50
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const a = (reduced ? 0.12 : 0.32) * env
      if (a < 0.003) return
      const g = ctx!.createRadialGradient(waveGeom.x, waveGeom.y, Math.max(0, radius - half), waveGeom.x, waveGeom.y, radius + half)
      g.addColorStop(0, 'rgba(143,177,209,0)')
      g.addColorStop(0.5, `rgba(143,177,209,${a})`)
      g.addColorStop(1, 'rgba(143,177,209,0)')
      ctx!.fillStyle = g
      ctx!.fillRect(0, 0, cssW, cssH)
    }

    /** The hero's content and the fixed nav share one wave, centred on the portrait. */
    function startWave() {
      const portrait = findTarget()?.getBoundingClientRect()
      const hero = section?.getBoundingClientRect()
      if (!portrait || !hero) return null
      const origin = { x: portrait.left + portrait.width / 2, y: portrait.top + portrait.height / 2 }
      const farthest = Math.max(
        Math.hypot(origin.x - hero.left, origin.y - hero.top),
        Math.hypot(hero.right - origin.x, origin.y - hero.top),
        Math.hypot(origin.x - hero.left, hero.bottom - origin.y),
        Math.hypot(hero.right - origin.x, hero.bottom - origin.y),
      )
      const startRadius = Math.max(120, Math.min(portrait.width, portrait.height) * 0.3)
      waveGeom = { x: origin.x - rects.canvas.left, y: origin.y - rects.canvas.top, start: startRadius, end: farthest * 1.15 }
      return createWaterWave([section?.querySelector<HTMLElement>('.ps-body') ?? null, document.querySelector<HTMLElement>('header[data-nav-theme]')], {
        origin,
        startRadius,
        // The crest is a broad lobe: let it leave the section entirely.
        endRadius: farthest * 1.15,
        amplitude: window.innerWidth < 768 ? 2.5 : 5,
      })
    }

    function finish() {
      activeWave?.dispose()
      activeWave = null
      waveGeom = null
      snapTl = null
      pieces = []
      cancelAnimationFrame(raf)
      raf = 0
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      // Nothing animates from here on: drop the page-level listeners.
      detachPointer()
      setPhase('assembled')
    }

    /* ----------------------------- drawing ---------------------------- */

    function draw(now: number) {
      raf = 0
      if (disposed || !visible || phase === 'assembled' || phase === 'snapping') return
      if (measure() && imgReady && pieces.length) {
        ctx!.setTransform(1, 0, 0, 1, 0, 0)
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

        drawPieces(now / 1000)
        ctx!.globalAlpha = 1
      }
      schedule()
    }

    function drawPieces(time: number) {
      const { x: tx, y: ty, w: tw, h: th } = rects.target
      let sum = 0
      for (const p of pieces) sum += p.t
      const mean = sum / pieces.length

      // Faint placeholder silhouette until the pieces arrive.
      const ghost = 0.07 * (1 - smooth(mean))
      if (ghost > 0.002) {
        ctx!.globalAlpha = ghost
        ctx!.drawImage(img, tx, ty, tw, th)
      }

      const pointerLocal = pointer ? { x: pointer.x - rects.canvas.left, y: pointer.y - rects.canvas.top } : null
      const gain = fx.float

      for (const p of pieces) {
        if (!p.sprite) continue
        const e = p.t
        const free = 1 - e
        const fxw = tx + p.fx
        const fyw = ty + p.fy
        // Flight path: a quadratic curve bowed sideways by `curve` × distance.
        const dx = fxw - p.sx
        const dy = fyw - p.sy
        const mx = (p.sx + fxw) / 2 - dy * p.curve
        const my = (p.sy + fyw) / 2 + dx * p.curve
        const u = 1 - e
        let x = u * u * p.sx + 2 * u * e * mx + e * e * fxw
        let y = u * u * p.sy + 2 * u * e * my + e * e * fyw

        let rot = p.rot0 * Math.pow(free, 1.6)
        if (free > 0.001 && !reduced && gain > 0.001) {
          const k = free * gain
          if (puzzleConfig.enableIdleFloat) {
            x += (Math.sin(time * p.f1 * 6.283 + p.ph1) * p.ax + Math.sin(time * p.f2 * 6.283 + p.ph2) * p.ax * 0.4) * k
            y += (Math.cos(time * p.f2 * 6.283 + p.ph2) * p.ay + Math.sin(time * p.f1 * 6.283 + p.ph1 * 0.7) * p.ay * 0.4) * k
            rot += Math.sin(time * p.f1 * 4 + p.ph2) * p.rotAmp * k
          }
          // Gentle magnetism towards the pointer, only while scattered.
          let tox = 0
          let toy = 0
          if (pointerLocal) {
            const mdx = pointerLocal.x - x
            const mdy = pointerLocal.y - y
            const d = Math.hypot(mdx, mdy)
            if (d < puzzleConfig.mouseRadius && d > 1) {
              const f = (1 - d / puzzleConfig.mouseRadius) * puzzleConfig.mousePush
              tox = (mdx / d) * f * (p.depth > 0.5 ? 1 : -0.6)
              toy = (mdy / d) * f * (p.depth > 0.5 ? 1 : -0.6)
            }
          }
          p.ox += (tox - p.ox) * 0.07
          p.oy += (toy - p.oy) * 0.07
          x += p.ox * k
          y += p.oy * k
        }

        const s = p.scale0 + (1 - p.scale0) * e
        const base = 0.45 + 0.55 * p.depth
        const alpha = base + (1 - base) * smooth(e)
        if (x < -p.sw || y < -p.sh || x > cssW + p.sw || y > cssH + p.sh) continue
        const cos = Math.cos(rot) * s
        const sin = Math.sin(rot) * s
        ctx!.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, x * dpr, y * dpr)
        ctx!.globalAlpha = alpha
        ctx!.drawImage(p.sprite, -p.sw / 2, -p.sh / 2, p.sw, p.sh)
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function schedule() {
      if (!raf && !disposed && visible && phase !== 'assembled') raf = requestAnimationFrame(draw)
    }

    /* ----------------------------- input ------------------------------ */

    const inRegion = (x: number, y: number) => {
      const el = findTarget()
      if (!el) return false
      const r = el.getBoundingClientRect()
      const pad = Math.max(40, r.width * 0.08)
      if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) return false
      // The hero may be covered by the next piece mid-transition.
      const owner = document.elementFromPoint(x, y)?.closest('[data-puzzle-section]')
      return !owner || owner === section
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || phase !== 'scattered') return
      pointer = { x: e.clientX, y: e.clientY }
      if (inRegion(e.clientX, e.clientY)) puzzleStore.start()
      schedule()
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || phase !== 'scattered') return
      if (inRegion(e.clientX, e.clientY)) puzzleStore.start()
    }
    function detachPointer() {
      pointer = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }

    const unsubscribe = puzzleStore.subscribe(() => {
      if (phase === 'assembling' && !started) {
        started = true
        begin() // no-op until the sprites exist; buildSprites retries
        schedule()
      }
    })

    /* ------------------------------ setup ----------------------------- */

    finalImg = findTarget()?.querySelector<HTMLElement>('[data-puzzle-final]') ?? null

    // Already played earlier in this page session (remount / HMR): show it, done.
    if (phase !== 'scattered') {
      if (finalImg) finalImg.style.opacity = '1'
      setPhase('assembled')
      return () => {
        disposed = true
        unsubscribe()
      }
    }

    img.onload = () => {
      if (disposed) return
      imgReady = true
      buildAlphaMap()
      refresh()
      // Build the wave's displacement map and decode the sound now, so the snap itself never hitches.
      void snapAudio.preload()
      if (!reduced) window.setTimeout(getWaterMap, 400)
    }
    img.src = IMAGE_SRC

    const ro = new ResizeObserver(scheduleRefresh)
    ro.observe(canvas)
    const el = findTarget()
    if (el) ro.observe(el)
    window.addEventListener('resize', scheduleRefresh)

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) schedule()
    })
    io.observe(canvas)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    const stopGestureListeners = snapAudio.listenForGesture()

    return () => {
      stopGestureListeners()
      snapAudio.disarm()
      disposed = true
      cancelAnimationFrame(raf)
      window.clearTimeout(rebuildTimer)
      snapTl?.kill()
      activeWave?.dispose()
      gsap.killTweensOf(fx)
      pieces.forEach((p) => gsap.killTweensOf(p))
      unsubscribe()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('resize', scheduleRefresh)
      detachPointer()
    }
  }, [canvasRef])
}
