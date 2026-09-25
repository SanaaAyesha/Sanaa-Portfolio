import { Eyebrow, RevealLines, SectionContent } from '../components/SectionContent'
import { about } from '../data/content'

export function AboutBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#1a44e6_0%,#1537c9_45%,#0d2596_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_20%,rgba(127,176,255,0.35),transparent_70%)]" />
      <div
        data-depth="0.6"
        aria-hidden="true"
        className="absolute -right-[4vw] bottom-[-6vh] font-display text-[42vmin] leading-none font-extrabold tracking-tighter text-transparent select-none [-webkit-text-stroke:1.5px_rgba(255,255,255,0.14)]"
      >
        02
      </div>
      <div className="grain absolute inset-0" />
    </>
  )
}

export function About() {
  return (
    <SectionContent>
      <Eyebrow index="02" className="text-white/80">
        {about.eyebrow}
      </Eyebrow>

      <RevealLines
        lines={about.lines}
        className="mt-[clamp(1.25rem,4vh,2.5rem)] max-w-[18ch] font-display text-[clamp(1.85rem,min(6vw,7.6vh),6rem)] leading-[1.02] font-semibold tracking-[-0.035em] sm:max-w-none"
      />

      <div className="mt-[clamp(2rem,6vh,4.5rem)] grid gap-8 border-t border-white/20 pt-6 md:grid-cols-12 md:gap-6">
        <p data-reveal="fade" className="max-w-md text-[15px] leading-relaxed text-white/75 md:col-span-5">
          {about.body}
        </p>
        <dl className="grid grid-cols-3 gap-4 md:col-span-6 md:col-start-7">
          {about.stats.map((s) => (
            <div key={s.label} data-reveal="fade" className="flex flex-col-reverse">
              <dt className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/60 uppercase sm:text-[11px]">
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
