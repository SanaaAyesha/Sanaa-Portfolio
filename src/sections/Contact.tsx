import { Eyebrow, RevealLines, SectionContent } from '../components/SectionContent'
import { contact } from '../data/content'
import type { SectionProps } from './types'

export function ContactBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(150deg,#3d7bff_0%,#1f55f0_45%,#1537c9_100%)]" />
      <div data-depth="0.4" className="absolute inset-0">
        <div className="drift absolute -top-[30%] -right-[20%] h-[80vmax] w-[80vmax] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.22),transparent_70%)]" />
      </div>
      <div className="grain absolute inset-0" />
    </>
  )
}

export function Contact({ goTo }: SectionProps) {
  return (
    <SectionContent align="between">
      <div />
      <div>
        <Eyebrow index="05" className="text-white/80">
          {contact.eyebrow}
        </Eyebrow>
        <RevealLines
          lines={contact.lines}
          className="mt-[clamp(1rem,3vh,2rem)] font-display text-[clamp(1.85rem,min(9.2vw,13.5vh),10.5rem)] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase"
        />

        <div className="mt-[clamp(1.5rem,5vh,3.5rem)] grid items-end gap-6 md:grid-cols-12">
          <a
            href={`mailto:${contact.email}`}
            data-reveal="fade"
            className="group relative inline-flex w-fit items-center gap-3 font-display text-[clamp(1.4rem,3.2vw,3rem)] font-semibold tracking-tight md:col-span-7"
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ember transition-transform duration-500 group-hover:scale-150" />
            {contact.email}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-white transition-transform duration-700 ease-out-expo group-hover:origin-left group-hover:scale-x-100"
            />
          </a>
          <p data-reveal="fade" className="max-w-sm text-sm leading-relaxed text-white/75 md:col-span-5 md:justify-self-end">
            {contact.body}
          </p>
        </div>
      </div>

      <footer
        data-reveal="fade"
        className="mt-8 flex flex-col gap-4 border-t border-white/25 pt-5 font-mono text-[11px] tracking-[0.18em] uppercase sm:flex-row sm:items-center sm:justify-between"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {contact.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} className="opacity-80 transition-opacity hover:opacity-100">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-6 opacity-80 sm:justify-end">
          <span>© {new Date().getFullYear()} Interlock Studio</span>
          <button type="button" onClick={() => goTo('hero')} className="whitespace-nowrap transition-opacity hover:opacity-100">
            Back to top ↑
          </button>
        </div>
      </footer>
    </SectionContent>
  )
}
