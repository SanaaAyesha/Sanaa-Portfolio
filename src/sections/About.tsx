import { Eyebrow, RevealLines, SectionContent } from '../components/SectionContent'
import { about } from '../data/content'

export function AboutBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-electric" />
      <div
        data-depth="0.6"
        aria-hidden="true"
        className="absolute -right-[4vw] bottom-[-6vh] font-display text-[42vmin] leading-none font-semibold tracking-tighter text-transparent select-none [-webkit-text-stroke:1.5px_rgba(27,39,51,0.14)]"
      >
        02
      </div>
    </>
  )
}

export function About() {
  return (
    <SectionContent>
      <Eyebrow index="02" className="text-ink/80">
        {about.eyebrow}
      </Eyebrow>

      <RevealLines
        lines={about.lines}
        className="mt-[clamp(1.25rem,4vh,2.5rem)] max-w-[18ch] font-display text-[clamp(1.85rem,min(6vw,7.6vh),6rem)] leading-[1.08] font-semibold tracking-[-0.02em] sm:max-w-none"
      />

      <div className="mt-[clamp(2rem,6vh,4.5rem)] grid gap-8 border-t border-ink/20 pt-6 md:grid-cols-12 md:gap-6">
        <p data-reveal="fade" className="max-w-md text-[15px] leading-relaxed text-ink/75 md:col-span-5">
          {about.body}
        </p>
        <dl className="grid grid-cols-3 gap-4 md:col-span-6 md:col-start-7">
          {about.stats.map((s) => (
            <div key={s.label} data-reveal="fade" className="flex flex-col-reverse">
              <dt className="mt-1 font-mono text-[10px] tracking-[0.18em] text-ink/60 uppercase sm:text-[11px]">
                {s.label}
              </dt>
              <dd className="font-display text-[clamp(1.8rem,4vw,3.6rem)] leading-none font-semibold tracking-tight">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionContent>
  )
}
