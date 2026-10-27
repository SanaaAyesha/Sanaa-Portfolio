import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

/** Animated experience (smooth scroll + puzzle motion) only when motion is welcome. */
export const MOTION_QUERY = '(prefers-reduced-motion: no-preference) and (min-height: 480px)'

/**
 * The site's one and only scroll system.
 *
 * Lenis smooths wheel input but still drives the real window scroll, so the
 * browser stays in charge (keyboard, scrollbar, find-in-page all work). GSAP's
 * ticker drives Lenis, and every Lenis frame updates ScrollTrigger, so the
 * puzzle timeline and the scroll position are sampled on the same frame.
 *
 * Touch is left native: phones keep their own momentum scrolling.
 */
export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_QUERY, () => {
      const lenis = new Lenis({
        duration: 1.1,
        // Expo-out: responds on the first frame, then glides to rest.
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        // Wheel input is handled as whole-section steps by usePuzzleScroll.
        smoothWheel: false,
        syncTouch: false,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
        autoRaf: false,
      })
      lenisRef.current = lenis

      lenis.on('scroll', ScrollTrigger.update)
      const tick = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(tick)
      // Never "catch up" after a long frame: that reads as a jump.
      gsap.ticker.lagSmoothing(0)

      return () => {
        gsap.ticker.remove(tick)
        gsap.ticker.lagSmoothing(500, 33)
        lenis.destroy()
        lenisRef.current = null
      }
    })
    return () => mm.revert()
  }, [])

  return lenisRef
}
