/**
 * The one-shot snap/ripple sound (public/audio/puzzle-snap-ripple.mp3).
 *
 * The recording is ~6 s: silence until ~0.9 s, a swell that builds to its peak
 * at ~1.5 s, then a decaying water tail (inaudible after ~3 s). So the sound
 * is scheduled to START shortly before the final piece lands, such that its
 * peak coincides with the visual impact; the decay then drives the ripple.
 *
 * It is decoded off-line (no AudioContext, so no autoplay warning), played on
 * the audio clock via AudioBufferSourceNode, and plays at most once per page.
 * Playback is attempted without any click. If the browser's autoplay policy refuses, the
 * visuals run silently and one console diagnostic says why; nothing is retried or faked.
 */

const SRC = '/audio/puzzle-snap-ripple.mp3'
const TAG = '[snapAudio]'
const WINDOW = 0.01 // seconds per envelope sample

type Status = 'off' | 'on' | 'na'

let buffer: AudioBuffer | null = null
let loading: Promise<void> | null = null
let ctx: AudioContext | null = null
let played = false
/** Perf-clock time (ms) the visual impact is expected, once armed. */
let armedFor: number | null = null

// Analysis of the decoded buffer.
let trimStart = 0.9
let peakAt = 1.5
let tail = 1.5
let env: Float32Array | null = null
let peakIndex = 0

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** For the hint UI: 'na' = no sound available, 'off' = blocked until a click, 'on' = ready to play. */
function status(): Status {
  if (!buffer) return 'na'
  return ctx && ctx.state === 'running' ? 'on' : 'off'
}

function analyse(b: AudioBuffer) {
  const n = Math.ceil(b.duration / WINDOW)
  const raw = new Float32Array(n)
  const win = Math.round(b.sampleRate * WINDOW)
  for (let c = 0; c < b.numberOfChannels; c++) {
    const data = b.getChannelData(c)
    for (let i = 0; i < n; i++) {
      let m = 0
      const end = Math.min(data.length, (i + 1) * win)
      for (let j = i * win; j < end; j++) m = Math.max(m, Math.abs(data[j]))
      raw[i] = Math.max(raw[i], m)
    }
  }
  // Smooth over ~50 ms so the envelope follows the swell, not single samples.
  const sm = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    let k = 0
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
      s += raw[j]
      k++
    }
    sm[i] = s / k
  }
  let top = 0
  for (let i = 0; i < n; i++) if (sm[i] > sm[top]) top = i
  const peak = sm[top] || 1
  env = sm.map((v) => v / peak)
  peakIndex = top
  peakAt = (top + 0.5) * WINDOW
  const onset = env.findIndex((v) => v > 0.02)
  // Start a little before the first audible sample; never cut into the sound.
  trimStart = Math.max(0, (onset < 0 ? 0 : onset) * WINDOW - 0.05)
  let end = top
  while (end < n && env[end] > 0.025) end++
  tail = Math.min(1.8, Math.max(1.2, (end - top) * WINDOW))
}

function trySchedule() {
  if (played || !buffer || !ctx || ctx.state !== 'running' || armedFor === null) return
  const untilImpact = (armedFor - performance.now()) / 1000
  // A sound that would arrive late is worse than none.
  if (untilImpact < -0.05) {
    console.warn(`${TAG} audio unlocked too late to line up with the snap (${Math.round(-untilImpact * 1000)} ms after it); skipped.`)
    return
  }

  const lead = peakAt - trimStart
  const latency = (ctx.baseLatency || 0) + ((ctx as AudioContext & { outputLatency?: number }).outputLatency || 0)
  const startIn = untilImpact - lead - latency
  const when = ctx.currentTime + Math.max(0, startIn)
  // Less than `lead` left (quick assembly, or sound unlocked mid-flight): enter the sound later, keep the peak on the impact.
  const offset = trimStart + Math.max(0, -startIn)
  if (offset >= buffer.duration - 0.05) return

  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  src.onended = () => src.disconnect()
  src.start(when, offset)
  played = true
  armedFor = null
  snapAudio.debug.result = 'scheduled'
  console.info(`${TAG} playing: peak aligned to the snap (starts in ${Math.max(0, startIn).toFixed(2)} s, from ${offset.toFixed(2)} s into the file).`)

  // Where the peak will be heard, on the page's clock (for verification): audio-clock offset from now, plus output latency.
  const peakCtx = when + (peakAt - offset)
  snapAudio.debug.peakPerf = performance.now() + (peakCtx - ctx.currentTime) * 1000 + latency * 1000
  emit()
}

export const snapAudio = {
  debug: { peakPerf: null as number | null, result: 'pending' as 'pending' | 'scheduled' | 'blocked' | 'unavailable' },

  /** Fetch + decode early. Never blocks anything; failures just mean silence. */
  preload() {
    if (loading) return loading
    loading = (async () => {
      try {
        const res = await fetch(SRC)
        if (!res.ok) return
        const data = await res.arrayBuffer()
        const offline = new OfflineAudioContext(2, 1, 48000)
        const decoded = await offline.decodeAudioData(data)
        analyse(decoded)
        buffer = decoded
        emit()
        snapAudio.unlock() // autoplay attempt, as early as possible
      } catch {
        /* silent fallback */
      }
    })()
    return loading
  },

  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  status,

  /** Must run inside a user gesture (click / tap / key) to be allowed. Safe to call repeatedly. */
  unlock() {
    if (played) return
    try {
      if (!ctx) {
        ctx = new AudioContext({ latencyHint: 'interactive' })
        ctx.onstatechange = () => {
          emit()
          trySchedule()
        }
      }
      if (ctx.state === 'suspended') void ctx.resume().then(() => (emit(), trySchedule()), () => {})
    } catch {
      /* no Web Audio */
    }
    emit()
  },

  /** Registers the gesture listeners that allow audio. Returns a disposer. */
  listenForGesture() {
    const go = () => snapAudio.unlock()
    window.addEventListener('pointerdown', go, { passive: true })
    window.addEventListener('pointerup', go, { passive: true })
    window.addEventListener('keydown', go, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('pointerup', go)
      window.removeEventListener('keydown', go)
    }
  },

  /** The visual impact is expected at this performance.now() time; line the sound's peak up with it. */
  arm(impactAtMs: number) {
    if (played) return
    armedFor = impactAtMs
    // Try to start audio now, with or without a gesture: browsers that allow autoplay
    // (site setting, media engagement, earlier interaction) start it; others stay locked.
    snapAudio.unlock()
    trySchedule()
  },
  /** Called at the snap: if the sound did not start, say exactly why, once. */
  reportAtSnap() {
    if (played || snapAudio.debug.result !== 'pending') return
    if (!buffer) {
      snapAudio.debug.result = 'unavailable'
      console.warn(`${TAG} the audio file was not decoded in time (missing, still loading, or undecodable); the snap runs silently.`)
      return
    }
    snapAudio.debug.result = 'blocked'
    const state = ctx ? ctx.state : 'not created'
    console.warn(
      `${TAG} audible autoplay was blocked: AudioContext is "${state}". ` +
        'The browser autoplay policy only allows sound after a click, tap or key press on the page (a hover does not count). ' +
        'The animation continues silently. For local development, allow sound/autoplay for this site (Chrome: site settings → Sound → Allow, or chrome://flags/#autoplay-policy → "No user gesture is required").',
    )
  },
  disarm() {
    armedFor = null
  },

  /** 0–1 level of the sound `t` seconds after its peak (the decay the ripple follows). */
  level(t: number) {
    if (!env) return Math.max(0, 1 - t / 1.5)
    const f = peakIndex + t / WINDOW
    const i = Math.floor(f)
    if (i >= env.length - 1) return 0
    const a = env[i]
    return a + (env[i + 1] - a) * (f - i)
  },
  /** Seconds from the peak until the sound has effectively ended. */
  get tail() {
    return env ? tail : 1.5
  },
}

if (import.meta.env.DEV) (window as unknown as { __snapAudio?: typeof snapAudio }).__snapAudio = snapAudio
