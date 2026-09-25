import { useEffect, useState } from 'react'

/** Layout viewport width (excludes the scrollbar). Joints are resolved against this everywhere. */
export const readViewportWidth = () =>
  typeof window === 'undefined' ? 1440 : document.documentElement.clientWidth || window.innerWidth

const read = readViewportWidth

/** Viewport width, updated at most once per frame on resize. Never on scroll. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(read)

  useEffect(() => {
    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setWidth(read()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return width
}
