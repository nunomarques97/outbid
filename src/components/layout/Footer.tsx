import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Link to="/" className="flex items-center">
              <img src="/branding/repcastr-logo-white.svg" alt="Repcastr" className="h-7 w-auto" />
            </Link>
            <p className="mt-2 max-w-sm text-sm text-fg-muted">
              Rankings, comparisons, and deals worth trusting — with sponsored placements always
              labeled, never hidden.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link to="/categories" className="text-fg-muted hover:text-fg">Discover</Link>
            <Link to="/top-bidders" className="text-fg-muted hover:text-fg">Top Bidders</Link>
            <Link to="/deals" className="text-fg-muted hover:text-fg">Deals</Link>
            <Link to="/dashboard" className="text-fg-muted hover:text-fg">For Businesses</Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Repcastr. Companies and deals shown are example listings for this preview — your account, reviews, and saved items are real.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/privacy" className="hover:text-fg">Privacy</Link>
            <Link to="/terms" className="hover:text-fg">Terms</Link>
            <p className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sponsored" /> Sponsored
              <span className="mx-1">·</span>
              <span className="h-1.5 w-1.5 rounded-full bg-organic" /> Community ranked
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
