import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Menu, X, Briefcase } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountButton } from '@/features/auth/AccountButton'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/categories', label: 'Discover' },
  { to: '/deals', label: 'Deals' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-0.5 text-xl font-extrabold tracking-tight">
          <span className="text-fg">Out</span>
          <span className="text-sponsored">bid</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden max-w-sm flex-1 md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies, categories…"
              className="pl-9"
              aria-label="Search"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            to="/dashboard"
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'hidden sm:inline-flex')}
          >
            <Briefcase className="h-4 w-4" />
            For Businesses
          </Link>
          <NotificationBell />
          <AccountButton />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-fg md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={cn('border-t border-border md:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="flex flex-col gap-1 px-4 py-3">
          <form onSubmit={handleSearch} className="mb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search"
            />
          </form>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-raised hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-raised hover:text-fg"
          >
            For Businesses
          </Link>
        </div>
      </div>
    </header>
  )
}
