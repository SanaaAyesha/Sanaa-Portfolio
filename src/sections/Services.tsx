import { Eyebrow, RevealLines, SectionContent } from '../components/SectionContent'
import { services } from '../data/content'

export function ServicesBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f4f6fa_0%,#e7ebf2_100%)]" />
      <div
        data-depth="0.25"
        className="absolute inset-0 [background-image:linear-gradient(90deg,rgba(7,11,26,0.05)_1px,transparent_1px)] [background-size:calc(100%/12)_100%]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_0%_100%,rgba(61,123,255,0.14),transparent_70%)]" />
    </>
  )
}

export function Services() {
  return (
    <SectionContent className="text-navy">
      <div className="grid gap-[clamp(1.5rem,5vh,3rem)] lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-5">
          <Eyebrow index="03" className="text-royal">
            {services.eyebrow}
          </Eyebrow>
          <RevealLines
            lines={services.title}
            className="mt-5 font-display text-[clamp(2rem,min(5.2vw,8vh),5.2rem)] leading-[0.98] font-semibold tracking-[-0.04em]"
          />
        </div>

        <ol className="lg:col-span-7">
          {services.items.map((item) => (
            <li key={item.n} data-reveal="fade" className="border-t border-navy/15 last:border-b">
              <a
                href="#contact"
                className="group grid grid-cols-[3rem_1fr_auto] items-center gap-3 py-[clamp(0.85rem,2.4vh,1.6rem)] sm:grid-cols-[4.5rem_1fr_auto]"
              >
                <span className="font-mono text-xs tracking-[0.2em] text-royal tabular-nums">{item.n} —</span>
                <span className="min-w-0">
                  <span className="block font-display text-[clamp(1.35rem,min(3vw,4.6vh),2.9rem)] leading-tight font-semibold tracking-[-0.025em] transition-transform duration-500 ease-out-expo group-hover:translate-x-2">
                    {item.name}
                  </span>
                  <span className="mt-1 hidden text-sm text-navy/60 transition-transform duration-500 ease-out-expo group-hover:translate-x-2 md:block">
                    {item.text}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-full border border-navy/15 transition-all duration-500 ease-out-expo group-hover:border-royal group-hover:bg-royal group-hover:text-white sm:h-12 sm:w-12"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 -rotate-45 transition-transform duration-500 ease-out-expo group-hover:rotate-0">
                    <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </SectionContent>
  )
}
