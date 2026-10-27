import { AssemblyHint } from '../components/AssemblyHint'
import { PuzzlePortrait } from '../components/PuzzlePortrait'
import { RevealLines, SectionContent } from '../components/SectionContent'
import { hero } from '../data/content'
import type { SectionProps } from './types'

export function HeroBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-ice" />
      <PuzzlePortrait />
    </>
  )
}

export function Hero({ goTo }: SectionProps) {
  return (
    <SectionContent align="end">
      {/* Where the scattered jigsaw pieces assemble into the portrait (see PuzzlePortrait). */}
      <div
        data-reveal="fade"
        data-puzzle-target
        role="img"
        aria-label="Portrait of the designer, smiling with arms crossed"
        className="pointer-events-none absolute top-[clamp(5.5rem,13vh,8rem)] right-2 aspect-[1094/1437] h-[min(34vh,60vw)] sm:top-auto sm:right-[7vw] sm:bottom-0 sm:h-[min(80vh,47vw)] lg:right-[8vw]"
      >
        {/* Takes over from the canvas pieces once they have snapped together. */}
        <img data-puzzle-final src="/portrait.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0" />
        <AssemblyHint />
      </div>

      <RevealLines
        as="h1"
        lines={hero.lines.map((line, i) =>
          i === hero.lines.length - 1 ? (
            <span className="text-electric">{line}</span>
          ) : (
            line
          ),
        )}
        className="font-display text-[clamp(1.75rem,min(4.4vw,10vh),6.5rem)] leading-[1.02] font-semibold tracking-[-0.02em]"
      />

      <div data-puzzle-avoid className="mt-[clamp(1.25rem,4vh,2.5rem)] flex flex-col items-start gap-[clamp(1rem,3vh,1.75rem)]">
        <p
          data-reveal="fade"
          className="max-w-[34rem] text-[clamp(0.95rem,1.1vw,1.1rem)] leading-relaxed text-ink/70 lg:max-w-[40rem]"
        >
          {hero.subtitle}
        </p>

        <div data-reveal="fade" className="flex items-center gap-6">
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault()
              goTo('projects')
            }}
            className="group relative inline-flex items-center gap-4 overflow-hidden rounded-full bg-ink py-2 pr-2 pl-6 font-sans text-sm font-semibold tracking-wide text-ice uppercase transition-transform duration-500 ease-out-expo hover:scale-[1.03] active:scale-[0.98]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-left scale-x-0 bg-electric transition-transform duration-700 ease-out-expo group-hover:scale-x-100"
            />
            <span className="relative transition-colors duration-500 group-hover:text-ink">{hero.cta}</span>
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-ice text-ink">
              <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-6" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <svg viewBox="0 0 16 16" className="absolute h-4 w-4 -translate-x-6 transition-transform duration-500 ease-out-expo group-hover:translate-x-0" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </SectionContent>
  )
}
