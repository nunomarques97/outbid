import type { ReactNode } from 'react'

export interface LegalSection {
  id: string
  title: string
}

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  intro: ReactNode
  sections: LegalSection[]
  children: ReactNode
}

/**
 * Shared shell for /privacy and /terms — a short table of contents (real
 * navigation, not decoration: both documents are long enough that jumping
 * straight to a section is genuinely useful), then the sections themselves.
 */
export function LegalLayout({ title, lastUpdated, intro, sections, children }: LegalLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-fg-subtle">Last updated: {lastUpdated}</p>
      <div className="mt-6 max-w-2xl text-fg-muted">{intro}</div>

      <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-subtle">On this page</p>
        <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-brand hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="prose-legal mt-10 flex flex-col gap-10">{children}</div>
    </div>
  )
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
      <div className="prose-legal-body mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-fg-muted">
        {children}
      </div>
    </section>
  )
}
