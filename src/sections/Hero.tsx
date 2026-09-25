import { RevealLines, SectionContent } from '../components/SectionContent'
import { ScrollIndicator } from '../components/ScrollIndicator'
import { hero } from '../data/content'
import type { SectionProps } from './types'

export function HeroBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_0%,#12205a_0%,#070b1a_55%,#04060f_100%)]" />
      <div data-depth="0.5" className="absolute inset-0">
        <div className="drift absolute -right-[12%] -top-[20%] h-[80vmax] w-[80vmax] rounded-full bg-[radial-gradient(closest-side,rgba(61,123,255,0.42),rgba(21,55,201,0.14)_55%,transparent_72%)]" />
        <div className="drift-slow absolute -bottom-[30%] -left-[18%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(closest-side,rgba(21,55,201,0.5),rgba(12,20,51,0.2)_60%,transparent_75%)]" />
      </div>
      {/* Fine engineering grid, faded toward the edges. */}
      <div
        data-depth="0.2"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(127,176,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(127,176,255,0.08)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(ellipse_70%_60%_at_60%_40%,black,transparent)]"
      />
      <div className="grain absolute inset-0" />
    </>
  )
}

export function Hero({ goTo }: SectionProps) {
  return (
    <SectionContent align="end">
      <div
        data-reveal="fade"
        className="absolute inset-x-5 top-[clamp(6rem,13vh,8.5rem)] hidden justify-between font-mono text-[11px] tracking-[0.22em] text-white/50 uppercase sm:inset-x-8 sm:flex lg:inset-x-12"
      >
        {hero.meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      <RevealLines
        as="h1"
        lines={hero.lines.map((line, i) =>
          i === hero.lines.length - 1 ? (
            <span className="bg-gradient-to-r from-white via-electric-2 to-electric bg-clip-text text-transparent">{line}</span>
          ) : (
            line
          ),
        )}
        className="font-display text-[clamp(2.6rem,min(12.4vw,16vh),13rem)] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase"
      />

      <div className="mt-[clamp(1.5rem,5vh,3.5rem)] grid items-end gap-8 md:grid-cols-12">
        <p
          data-reveal="fade"
          className="max-w-md text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed text-white/70 md:col-span-6 lg:col-span-4"
        >
          {hero.subtitle}
        </p>

        <div data-reveal="fade" className="flex items-center gap-6 md:col-span-6 md:justify-end lg:col-span-8">
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault()
              goTo('projects')
            }}
            className="group relative inline-flex items-center gap-4 overflow-hidden rounded-full bg-white py-2 pr-2 pl-6 font-display text-sm font-semibold tracking-wide text-navy uppercase transition-transform duration-500 ease-out-expo hover:scale-[1.03] active:scale-[0.98]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-left scale-x-0 bg-electric transition-transform duration-700 ease-out-expo group-hover:scale-x-100"
            />
            <span className="relative transition-colors duration-500 group-hover:text-white">{hero.cta}</span>
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-navy text-white">
              <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-6" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <svg viewBox="0 0 16 16" className="absolute h-4 w-4 -translate-x-6 transition-transform duration-500 ease-out-expo group-hover:translate-x-0" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
          </a>
          <ScrollIndicator onClick={() => goTo('about')} className="hidden md:flex" />
        </div>
      </div>
    </SectionContent>
  )
}
