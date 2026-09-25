export interface SectionProps {
  /** Scroll to a section by id (runs the puzzle transitions in between). */
  goTo: (id: string) => void
}
