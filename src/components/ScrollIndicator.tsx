interface ScrollIndicatorProps {
  onClick?: () => void
  className?: string
}

/** "SCROLL" + a thin rail with a travelling dot. Also works as a button. */
export function ScrollIndicator({ onClick, className = '' }: ScrollIndicatorProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to the next section"
      className={`group flex flex-col items-center gap-3 font-mono text-[10px] tracking-[0.32em] text-white/60 uppercase transition-colors hover:text-white ${className}`}
    >
      <span className="pl-[0.32em]">Scroll</span>
      <span aria-hidden="true" className="relative block h-12 w-px overflow-hidden bg-white/15">
        <span className="scroll-dot absolute inset-x-0 top-0 block h-1/3 bg-gradient-to-b from-transparent via-electric-2 to-white" />
      </span>
    </button>
  )
}
