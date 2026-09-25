# Interlock: puzzle-piece scroll transitions

A React + Vite + TypeScript + GSAP ScrollTrigger + Tailwind v4 site. Full-screen sections slide up from below and **lock into the previous section like puzzle pieces**.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Dev only: open `http://localhost:5173/?nosnap` to turn off scroll-snap, so you can stop halfway through a transition and inspect it.

```
src/
├── components/
│   ├── Navbar.tsx          fixed nav, mobile menu, active state
│   ├── PuzzleSection.tsx   one puzzle piece (clip-path, shadow, rim, seam)
│   ├── PuzzleEdge.tsx      glowing seam that draws and flashes on lock
│   ├── ScrollIndicator.tsx
│   └── SectionContent.tsx  layout wrapper, Eyebrow, RevealLines
├── sections/               Hero, About, Services, Projects, Contact
├── hooks/
│   ├── usePuzzleScroll.ts  the GSAP timeline + ScrollTrigger (MOTION settings)
│   └── useConnectorMetrics.ts
├── utils/puzzleGeometry.ts connector profiles, responsive sizes, path builder
├── data/content.ts         all placeholder copy and project data
├── App.tsx                 section list + connector positions
└── index.css               palette tokens, piece layering
```

---

## 1. How the puzzle geometry works

`utils/puzzleGeometry.ts`

- Each connector is described once, in **unit space**: a list of cubic Bézier segments from `(0,0)` to `(1,0)`, where `v` is the distance away from the edge. Two profiles are included: `classic` (a neck that opens into a rounded head) and `soft` (a bell shape with no undercut, used on phones).
- `buildPieceGeometry()` walks the four edges clockwise. For every edge that has a connector, it maps the profile onto that edge: outward for a `tab`, inward for a `notch`. The result is one closed path, used as `clip-path: path(...)`.
- A tab and a notch with the same position are generated from the **same profile**, so they always fit exactly. Tabs are drawn 1.5px larger (`BLEED`) and sit *underneath* the notch, which hides anti-aliasing hairlines.
- A piece is taller than its section box wherever it has a tab (the `--pad-*` variables). The knob physically hangs past the section's bottom edge.
- Paths are rebuilt only when a piece is **resized** (ResizeObserver), never during scroll. Scrolling only animates `transform` and `opacity`.
- `linkSections()` gives section *i* a bottom `tab` and section *i+1* the matching top `notch`.

## 2. How GSAP ScrollTrigger controls it

`hooks/usePuzzleScroll.ts`

The stage (`<main>`) is pinned, and all sections are stacked absolutely inside it. The z-index rises with the section index, so the incoming piece is always on top. One timeline with `scrub` covers the whole page. Each transition is exactly 1 unit long and has three phases:

| Phase | Progress | What happens |
|---|---|---|
| approach | 0 → 0.62 | The outgoing piece lifts by 40% of the viewport, which exposes its knob over the dark "table". The incoming piece rises from below, slightly enlarged and casting a shadow, and stops just short. The seam starts drawing outward from the connector. |
| snap | 0.62 → 0.74 | The piece drops into the notch (`power3.in`). The shadow vanishes, the scale settles with a small overshoot (`back.out`) and the seam flashes. |
| carry | 0.8 → 1 | Both pieces move up together, still locked, until the new section fills the screen. The previous knob stays visible in the new section's notch. |

- All positions use `yPercent` of the stage height, so resizing never breaks the timeline. Every tween is a `fromTo`, so scrubbing backwards retraces the exact same motion.
- `snap: 'labelsDirectional'` with `inertia: false` means one gesture always lands on exactly one section, in the direction the user scrolled.
- Everything runs inside `gsap.matchMedia()`, which reverts all tweens, pins and listeners when the component unmounts or the media query changes.
- If the user prefers reduced motion (or the viewport is under 480px tall), there is no pin and no scrub. Sections scroll normally, and each knob still sits in the next section's notch.

## 3. Where to change the colours

- **Palette tokens:** `src/index.css` → `@theme { --color-navy, --color-royal, --color-electric, --color-ember, … }`
- **Section base colour + seam colour:** `src/App.tsx` → `SECTIONS[].background` and `seamColor`
- **Section gradients and glows:** the `*Backdrop` component at the top of each file in `src/sections/`
- **The "table" behind the pieces:** `.stage` in `src/index.css`
- **Rim light on the connector edges:** `.ps-rim-line` / `.ps-rim-glow` in `src/index.css`

## 4. Where to change the puzzle shape

- **Knob shape:** `PROFILES` in `src/utils/puzzleGeometry.ts`. Edit the unit-space Bézier points, or add a new profile.
- **Size per breakpoint:** `getConnectorMetrics()` in the same file (width, depth, profile, centred or not).
- **Position per boundary:** `BOUNDARIES` in `src/App.tsx`. `position` runs from 0 to 1, `scale` is a size multiplier, and `invert: true` puts the tab on the lower piece instead.
- **Left/right connectors:** pass `edges={{ left: { kind: 'tab', position: 0.5 } }}` to a `PuzzleSection`. The geometry supports all four sides. The scroll animation uses top and bottom.

## 5. Where to add or remove sections

`src/App.tsx` → the `SECTIONS` array. Add an entry with an `id`, `label`, `theme` (`'dark'` or `'light'`, which sets the nav colour), `background`, an optional `Backdrop` and a `Component`, then add one more entry to `BOUNDARIES`. The edges, timeline, snap points and nav are all generated from this list.

Inside a section:

- `data-reveal="line"` inside `RevealLines`: masked line reveal as the piece locks in
- `data-reveal="fade"`: fade and rise, with a blur on desktop
- `data-depth="0.3"`: parallax strength

## 6. Replacing the placeholder content and images

- All copy is in `src/data/content.ts`.
- Project images: add `image: '/work/my-project.jpg'` to a project (put the file in `public/work/`). Without an image, generated gradient artwork is shown.
- Brand name and logo: `Logo` and the text in `src/components/Navbar.tsx`, plus `index.html`.

## 7. Adjusting the snap intensity and speed

All in `MOTION` at the top of `src/hooks/usePuzzleScroll.ts`:

| Setting | Effect |
|---|---|
| `scrollPerSection` | Scroll distance per transition (in viewport heights). Higher is slower. |
| `scrub` | Smoothing in seconds (0 = tied 1:1 to the scrollbar) |
| `lift` | How high the lock happens (0.4 = at 60% down the screen) |
| `hoverGap` | Gap left just before the snap. Bigger means a longer final drop. |
| `hoverScale` | How "lifted" the incoming piece looks |
| `phases` | Where approach, snap and carry start and end |
| `snapEase` | The drop. `power4.in` is more magnetic, `power2.in` is softer. |
| `settleEase` | The click. `back.out(4)` is stronger, `back.out(1.2)` is subtler. |
| `scrollSnap` | How the page settles onto a section after scrolling stops |
| `navSecondsPerSection` | Speed of nav-click scrolling |
