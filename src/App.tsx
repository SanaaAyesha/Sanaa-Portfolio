import { useCallback, useMemo, useRef, type ComponentType } from 'react'
import { Navbar } from './components/Navbar'
import { PuzzleSection, type SectionTheme } from './components/PuzzleSection'
import { usePuzzleScroll } from './hooks/usePuzzleScroll'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { About, AboutBackdrop } from './sections/About'
import { Contact, ContactBackdrop } from './sections/Contact'
import { Hero, HeroBackdrop } from './sections/Hero'
import { Projects, ProjectsBackdrop } from './sections/Projects'
import { Services, ServicesBackdrop } from './sections/Services'
import type { SectionProps } from './sections/types'
import { TRANSITIONS } from './data/transitions'

interface SectionDef {
  id: string
  label: string
  theme: SectionTheme
  /** Base colour — also visible on the tab that pokes into the next section. */
  background: string
  Backdrop?: ComponentType
  Component: ComponentType<SectionProps>
  /** Seam flash colour when this section snaps into the previous one. */
  seamColor?: string
}

/**
 * Sections, top to bottom. Add, remove or reorder entries here — the puzzle
 * edges and scroll transitions are generated from this list.
 */
const SECTIONS: SectionDef[] = [
  { id: 'hero', label: 'Home', theme: 'dark', background: '#070b1a', Backdrop: HeroBackdrop, Component: Hero },
  {
    id: 'about',
    label: 'About',
    theme: 'dark',
    background: '#1537c9',
    Backdrop: AboutBackdrop,
    Component: About,
    seamColor: '#7fb0ff',
  },
  {
    id: 'services',
    label: 'Services',
    theme: 'light',
    background: '#eef1f6',
    Backdrop: ServicesBackdrop,
    Component: Services,
    seamColor: '#3d7bff',
  },
  {
    id: 'projects',
    label: 'Projects',
    theme: 'dark',
    background: '#050608',
    Backdrop: ProjectsBackdrop,
    Component: Projects,
    seamColor: '#3d7bff',
  },
  {
    id: 'contact',
    label: 'Contact',
    theme: 'dark',
    background: '#2a63ff',
    Backdrop: ContactBackdrop,
    Component: Contact,
    seamColor: '#ff6a2b',
  },
]

// Puzzle joints between the sections above live in data/transitions.ts:
// TRANSITIONS[i] joins SECTIONS[i] to SECTIONS[i + 1].
if (import.meta.env.DEV) {
  TRANSITIONS.forEach((t, i) => {
    if (t.from !== SECTIONS[i]?.id || t.to !== SECTIONS[i + 1]?.id) {
      console.warn(`[App] TRANSITIONS[${i}] (${t.from} → ${t.to}) does not match the section order.`)
    }
  })
}

export default function App() {
  const stageRef = useRef<HTMLElement>(null)
  // Order matters: the smooth scroller must exist before the puzzle timeline is built.
  const lenisRef = useSmoothScroll()
  const { active, topIndex, scrollToIndex } = usePuzzleScroll(stageRef, { transitions: TRANSITIONS, lenisRef })

  const goTo = useCallback(
    (id: string) => {
      const index = SECTIONS.findIndex((s) => s.id === id)
      if (index >= 0) scrollToIndex(index)
    },
    [scrollToIndex],
  )

  // The pieces never depend on scroll state: memoised so nav updates
  // (active / topIndex) don't re-render every section mid-scroll.
  const pieces = useMemo(
    () =>
      SECTIONS.map(({ id, label, theme, background, Backdrop, Component, seamColor }, i) => (
        <PuzzleSection
          key={id}
          id={id}
          index={i}
          label={label}
          theme={theme}
          background={background}
          puzzle={TRANSITIONS[i - 1]?.puzzle}
          nextPuzzle={TRANSITIONS[i]?.puzzle}
          seamColor={seamColor}
          backdrop={Backdrop ? <Backdrop /> : undefined}
        >
          <Component goTo={goTo} />
        </PuzzleSection>
      )),
    [goTo],
  )

  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[200] -translate-y-20 rounded-full bg-white px-4 py-2 text-sm font-medium text-navy focus:translate-y-0"
      >
        Skip to content
      </a>

      <Navbar
        items={SECTIONS}
        active={active}
        total={SECTIONS.length}
        theme={SECTIONS[topIndex]?.theme ?? 'dark'}
        onNavigate={scrollToIndex}
      />

      <main id="main" ref={stageRef} className="stage">
        {pieces}
      </main>
    </>
  )
}
