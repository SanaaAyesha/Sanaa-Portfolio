import { useRef } from 'react'
import { usePuzzleAssembly } from '../hooks/usePuzzleAssembly'

/**
 * Canvas layer behind the hero copy. It cuts /portrait.png into jigsaw pieces,
 * scatters them across the hero and assembles them over [data-puzzle-target].
 */
export function PuzzlePortrait() {
  const ref = useRef<HTMLCanvasElement>(null)
  usePuzzleAssembly(ref)
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
}
