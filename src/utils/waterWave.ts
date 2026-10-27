/**
 * One travelling water wave, applied as a real displacement of the page's
 * content (text, buttons, nav, portrait) through SVG `feDisplacementMap`.
 *
 * A single static displacement map holds one radial wave: a smooth push
 * outward followed by an equal pull back, with an organically uneven front.
 * It is never regenerated: the wave travels by moving and scaling that one
 * map inside each filter (cheap attribute updates), so the front reaches each
 * element when it actually arrives. The filters exist only while the wave
 * runs; afterwards the elements are returned to a plain, filter-free state.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/** Where the wave crest sits inside the map, as a fraction of its half-size. */
const RING = 0.6
const RING_WIDTH = 0.1
const MAP_SIZE = 768

let mapUrl: string | null = null

/** Build (once) the PNG displacement map: R = x offset, G = y offset, 0.5 = none. */
export function getWaterMap(): string {
  if (mapUrl) return mapUrl
  const n = MAP_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = n
  const g = canvas.getContext('2d')!
  const data = g.createImageData(n, n)
  const half = n / 2
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5 - half) / half
      const dy = (y + 0.5 - half) / half
      const r = Math.hypot(dx, dy) || 1e-6
      const th = Math.atan2(dy, dx)
      // The front is not a perfect circle.
      const warp = 1 + 0.05 * Math.sin(3 * th + 0.8) + 0.035 * Math.sin(5 * th + 2.1) + 0.02 * Math.sin(2 * th)
      const u = (r / warp - RING) / RING_WIDTH
      // Derivative of a Gaussian: one push, one pull, nothing either side.
      const mag = Math.max(-1, Math.min(1, u * Math.exp(-u * u) * 2.33))
      const i = (y * n + x) * 4
      data.data[i] = 127.5 + 127.5 * mag * (dx / r)
      data.data[i + 1] = 127.5 + 127.5 * mag * (dy / r)
      data.data[i + 2] = 128
      data.data[i + 3] = 255
    }
  }
  g.putImageData(data, 0, 0)
  mapUrl = canvas.toDataURL('image/png')
  return mapUrl
}

interface Target {
  el: HTMLElement
  prevFilter: string
  image: SVGElement
  disp: SVGElement
  /** Wave origin in the element's own coordinates. */
  ox: number
  oy: number
}

export interface WaterWaveOptions {
  /** Wave origin, viewport px. */
  origin: { x: number; y: number }
  /** Radius at which the crest starts, px. */
  startRadius: number
  /** Radius the crest must reach so the whole section has been crossed, px. */
  endRadius: number
  /** Peak displacement, css px. */
  amplitude: number
}

export interface WaterWave {
  /** progress 0 → 1; `energy` (0–1) overrides the built-in swell-and-fade, e.g. to follow a sound. */
  set(progress: number, energy?: number): void
  dispose(): void
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function createWaterWave(elements: (HTMLElement | null)[], o: WaterWaveOptions): WaterWave | null {
  const els = elements.filter((e): e is HTMLElement => !!e)
  if (!els.length) return null

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none'
  const defs = document.createElementNS(SVG_NS, 'defs')
  svg.appendChild(defs)

  const url = getWaterMap()
  const pad = 24
  const targets: Target[] = els.map((el, i) => {
    const r = el.getBoundingClientRect()
    const id = `puzzle-wave-${i}`
    const filter = document.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', id)
    filter.setAttribute('filterUnits', 'userSpaceOnUse')
    filter.setAttribute('x', String(-pad))
    filter.setAttribute('y', String(-pad))
    filter.setAttribute('width', String(r.width + pad * 2))
    filter.setAttribute('height', String(r.height + pad * 2))
    filter.setAttribute('color-interpolation-filters', 'sRGB')

    const flood = document.createElementNS(SVG_NS, 'feFlood')
    flood.setAttribute('flood-color', 'rgb(50%,50%,50%)')
    flood.setAttribute('result', 'neutral')
    const image = document.createElementNS(SVG_NS, 'feImage')
    image.setAttribute('href', url)
    image.setAttributeNS(XLINK_NS, 'xlink:href', url)
    image.setAttribute('preserveAspectRatio', 'none')
    image.setAttribute('result', 'ring')
    const merge = document.createElementNS(SVG_NS, 'feMerge')
    merge.setAttribute('result', 'raw')
    for (const input of ['neutral', 'ring']) {
      const node = document.createElementNS(SVG_NS, 'feMergeNode')
      node.setAttribute('in', input)
      merge.appendChild(node)
    }
    // The map is scaled up several times; smooth it so the sampling steps can't tear glyph edges.
    const soften = document.createElementNS(SVG_NS, 'feGaussianBlur')
    soften.setAttribute('in', 'raw')
    soften.setAttribute('stdDeviation', '3')
    soften.setAttribute('result', 'map')
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap')
    disp.setAttribute('in', 'SourceGraphic')
    disp.setAttribute('in2', 'map')
    disp.setAttribute('scale', '0')
    disp.setAttribute('xChannelSelector', 'R')
    disp.setAttribute('yChannelSelector', 'G')
    filter.append(flood, image, merge, soften, disp)
    defs.appendChild(filter)

    const target: Target = {
      el,
      prevFilter: el.style.filter,
      image,
      disp,
      ox: o.origin.x - r.left,
      oy: o.origin.y - r.top,
    }
    el.style.filter = `url(#${id})`
    return target
  })
  document.body.appendChild(svg)

  let done = false
  return {
    set(p, energy) {
      if (done) return
      const radius = o.startRadius + (o.endRadius - o.startRadius) * p
      const size = (2 * radius) / RING
      // Quick swell, then the energy spreads thin as it travels.
      const env = energy === undefined ? smoothstep(0, 0.06, p) * Math.pow(1 - p, 0.9) : smoothstep(0, 0.03, p) * energy
      const scale = (2 * o.amplitude * env).toFixed(3)
      for (const t of targets) {
        t.image.setAttribute('x', (t.ox - size / 2).toFixed(1))
        t.image.setAttribute('y', (t.oy - size / 2).toFixed(1))
        t.image.setAttribute('width', size.toFixed(1))
        t.image.setAttribute('height', size.toFixed(1))
        t.disp.setAttribute('scale', scale)
      }
    },
    dispose() {
      if (done) return
      done = true
      for (const t of targets) t.el.style.filter = t.prevFilter
      svg.remove()
    },
  }
}
