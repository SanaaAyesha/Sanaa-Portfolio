/**
 * All placeholder copy lives here. Replace freely — the layout adapts.
 * For project images, set `image` to a URL (e.g. '/work/aurora.jpg' in /public).
 * Without an image, a generated gradient artwork is shown instead.
 */

export const hero = {
  lines: ['Building', 'Digital', 'Experiences'],
  subtitle: 'We design and build immersive digital products, web experiences and interactive platforms.',
  cta: 'Explore Work',
  meta: ['Design & Technology Studio', 'Est. 2016 — Remote, worldwide'],
}

export const about = {
  eyebrow: 'About us',
  lines: ['We combine design,', 'technology and motion', 'to create digital', 'experiences that feel alive.'],
  body: 'A small senior team of designers, engineers and motion artists. We work in tight loops — prototype early, refine obsessively, ship with care.',
  stats: [
    { value: '120+', label: 'Products shipped' },
    { value: '14', label: 'Industry awards' },
    { value: '9', label: 'Years in practice' },
  ],
}

export const services = {
  eyebrow: 'What we do',
  title: ['Four disciplines,', 'one team.'],
  items: [
    { n: '01', name: 'Product Design', text: 'Research, UX architecture and interface systems built to scale.' },
    { n: '02', name: 'Web Development', text: 'Fast, accessible front-ends and headless platforms.' },
    { n: '03', name: '3D Experiences', text: 'Real-time WebGL scenes, product configurators and worlds.' },
    { n: '04', name: 'Interactive Experiences', text: 'Installations, campaigns and motion-led storytelling.' },
  ],
}

export interface Project {
  title: string
  client: string
  tags: string
  year: string
  /** Optional image URL. */
  image?: string
  /** Colours for the generated artwork used when no image is set. */
  art: [string, string, string]
}

export const projects = {
  eyebrow: 'Selected work',
  title: ['Recent', 'projects'],
  items: [
    { title: 'Aurora OS', client: 'Northwind', tags: 'Product · Platform', year: '2026', art: ['#1537c9', '#3d7bff', '#050608'] },
    { title: 'Tidal', client: 'Halcyon Audio', tags: 'Web · 3D', year: '2025', art: ['#0c1433', '#3ef0b0', '#050608'] },
    { title: 'Meridian', client: 'Atlas Bank', tags: 'Product Design', year: '2025', art: ['#ff6a2b', '#1537c9', '#070b1a'] },
    { title: 'Parallel', client: 'Studio Kiln', tags: 'Interactive', year: '2024', art: ['#7fb0ff', '#eef1f6', '#0c1433'] },
  ] satisfies Project[],
}

export const contact = {
  eyebrow: 'Contact',
  lines: ["Let's build", 'something', 'extraordinary.'],
  email: 'hello@example.com',
  body: 'Tell us about your product, your timeline and what success looks like. We reply within two working days.',
  socials: [
    { label: 'Instagram', href: '#' },
    { label: 'LinkedIn', href: '#' },
    { label: 'Dribbble', href: '#' },
    { label: 'GitHub', href: '#' },
  ],
}
