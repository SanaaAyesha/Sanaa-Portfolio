import { Eyebrow, RevealLines, SectionContent } from '../components/SectionContent'
import { projects, type Project } from '../data/content'

export function ProjectsBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,#0d1430_0%,#050608_60%)]" />
      <div className="grain absolute inset-0" />
    </>
  )
}

/** Generated artwork used until a real image is provided. */
function ProjectArt({ project, index }: { project: Project; index: number }) {
  const [a, b, c] = project.art
  if (project.image) {
    return <img src={project.image} alt="" loading="lazy" className="h-full w-full object-cover" />
  }
  return (
    <div className="relative h-full w-full" style={{ background: c }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 60% at ${30 + index * 14}% 30%, ${a}, transparent 70%), radial-gradient(60% 70% at 80% 90%, ${b}, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:100%_14px]" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-40" aria-hidden="true">
        <path
          d={`M0 ${60 - index * 6} C 30 ${40 + index * 5}, 60 ${80 - index * 4}, 100 ${50 + index * 3}`}
          fill="none"
          stroke="white"
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="grain absolute inset-0" />
    </div>
  )
}

export function Projects() {
  return (
    <SectionContent>
      <div className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow index="04" className="text-electric-2">
            {projects.eyebrow}
          </Eyebrow>
          <RevealLines
            lines={projects.title}
            className="mt-4 font-display text-[clamp(2rem,min(5.4vw,8vh),5.4rem)] leading-[0.95] font-semibold tracking-[-0.04em]"
          />
        </div>
        <a
          href="#contact"
          data-reveal="fade"
          className="group hidden items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-white/70 uppercase transition-colors hover:text-white sm:flex"
        >
          All work
          <span aria-hidden="true" className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>

      <ul className="mt-[clamp(1.5rem,5vh,3.5rem)] grid gap-x-4 gap-y-0 sm:grid-cols-2 sm:gap-y-6 xl:grid-cols-4">
        {projects.items.map((p, i) => (
          <li key={p.title} data-reveal="fade">
            <a
              href="#contact"
              className="group flex items-center gap-4 border-t border-white/10 py-3 sm:block sm:border-0 sm:py-0"
              aria-label={`${p.title} — ${p.client}, ${p.tags}, ${p.year}`}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md sm:h-[min(22vh,15rem)] sm:w-full sm:rounded-lg xl:h-[min(40vh,26rem)]">
                <div data-depth="0.08" data-reveal="image" className="absolute -inset-y-[12%] inset-x-0">
                  <div className="h-full w-full transition-[scale] duration-[1.2s] ease-out-expo group-hover:scale-[1.07]">
                    <ProjectArt project={p} index={i} />
                  </div>
                </div>
                <span className="absolute top-3 left-3 hidden font-mono text-[10px] tracking-[0.2em] text-white/80 sm:block">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-3 bottom-3 hidden h-9 w-9 translate-y-3 place-items-center rounded-full bg-white text-navy opacity-0 transition-all duration-500 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 sm:grid"
                >
                  ↗
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 sm:mt-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">{p.title}</h3>
                  <p className="truncate text-[13px] text-white/50">
                    {p.client} · {p.tags}
                  </p>
                </div>
                <span className="font-mono text-[11px] tracking-[0.16em] text-white/40 tabular-nums">{p.year}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </SectionContent>
  )
}
