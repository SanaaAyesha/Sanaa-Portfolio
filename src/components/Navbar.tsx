import { useEffect, useId, useState, type MouseEvent } from 'react'
import type { SectionTheme } from './PuzzleSection'

export interface NavItem {
  id: string
  label: string
}

interface NavbarProps {
  items: readonly NavItem[]
  active: number
  theme: SectionTheme
  total: number
  onNavigate: (index: number) => void
}

/** A single jigsaw piece: knob on top and right, matching notch on the left. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true" focusable="false">
      <path
        d="M4 9H9.8a3.6 3.6 0 1 1 6.4 0H24V14.8a3.6 3.6 0 1 1 0 6.4V27H4V21.2a3.6 3.6 0 1 0 0-6.4Z"
        fill="var(--color-electric)"
      />
    </svg>
  )
}

/**
 * Fixed top navigation. `items[0]` is the hero and is reached through the logo.
 * Colours follow the active section's theme so the nav stays legible on light pieces.
 */
export function Navbar({ items, active, theme, total, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const links = items.slice(1)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (index: number) => (e: MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    onNavigate(index)
  }

  const light = theme === 'light' && !open
  const tone = light ? 'text-navy' : 'text-ink'
  // Solid-ish pills keep the nav legible over the connector sitting at the top of
  // each piece. No backdrop blur: it would re-blur moving content every frame.
  const pill = `rounded-full transition-colors duration-500 ${
    light ? 'bg-ice/85 ring-1 ring-ink/10' : 'bg-ice/55 ring-1 ring-ink/10'
  }`

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-colors duration-500 ${tone}`}
      data-nav-theme={light ? 'light' : 'dark'}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-18 max-w-[1680px] items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        <a
          href={`#${items[0].id}`}
          onClick={go(0)}
          className={`group relative z-10 -ml-3 flex items-center gap-2.5 py-2 pr-4 pl-3 font-sans text-[16px] font-semibold tracking-[0.01em] ${open ? '' : pill}`}
          aria-label="Sanaa Ayesha, back to top"
        >
          <span>Sanaa Ayesha</span>
          <Logo className="h-7 w-7 transition-transform duration-500 ease-out-expo group-hover:rotate-12" />
        </a>

        <ul className={`hidden items-center gap-0.5 p-1 lg:flex ${pill}`}>
          {links.map((item, i) => {
            const index = i + 1
            const isActive = index === active
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={go(index)}
                  aria-current={isActive ? 'true' : undefined}
                  className="group relative flex items-center gap-2 rounded-full px-3 py-2 font-mono xl:px-4 text-[11px] tracking-[0.2em] uppercase"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full bg-ember transition-all duration-500 ease-out-expo ${
                      isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}
                  />
                  <span className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                    {item.label}
                  </span>
                </a>
              </li>
            )
          })}
          <li
            aria-hidden="true"
            className="mr-3 ml-2 hidden border-l border-current/20 pl-4 font-mono xl:block text-[11px] tracking-[0.2em] tabular-nums opacity-60"
          >
            {String(active + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </li>
        </ul>

        <button
          type="button"
          className={`relative z-10 -mr-2 flex h-10 items-center gap-3 px-4 font-mono text-[11px] tracking-[0.2em] uppercase lg:hidden ${open ? '' : pill}`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{open ? 'Close' : 'Menu'}</span>
          <span aria-hidden="true" className="relative block h-2.5 w-5">
            <span
              className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-500 ease-out-expo ${
                open ? 'translate-y-[5px] rotate-45' : ''
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-500 ease-out-expo ${
                open ? '-translate-y-[4px] -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </nav>

      <div
        id={menuId}
        hidden={!open}
        className="fixed inset-0 -z-0 bg-electric/95 px-5 pt-28 backdrop-blur-xl lg:hidden"
      >
        <ul className="flex flex-col gap-2">
          {links.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={go(i + 1)}
                aria-current={i + 1 === active ? 'true' : undefined}
                className="flex items-baseline gap-4 border-b border-ink/10 py-4 font-sans text-4xl font-medium tracking-tight"
              >
                <span className="font-mono text-xs tracking-[0.2em] text-ink">0{i + 2}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
