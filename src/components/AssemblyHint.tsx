import { puzzleStore, usePuzzleState } from '../hooks/usePuzzleAssembly'

/** Small mono hint inside the portrait target; also the keyboard / touch trigger. Gone once assembly starts. */
export function AssemblyHint() {
  const state = usePuzzleState()
  const hidden = state !== 'scattered'
  return (
    <button
      type="button"
      data-puzzle-hint
      tabIndex={hidden ? -1 : 0}
      onClick={puzzleStore.start}
      className={`pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/15 bg-ice/80 px-4 py-2 font-mono text-[10px] tracking-[0.28em] whitespace-nowrap text-ink/70 uppercase backdrop-blur-sm transition-opacity duration-500 hover:text-ink focus-visible:opacity-100 ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <span className="[@media(hover:none)]:hidden">Hover to assemble</span>
      <span className="hidden [@media(hover:none)]:inline">Tap to assemble</span>
    </button>
  )
}
