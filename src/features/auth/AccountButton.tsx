import { useState } from 'react'
import { LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from './useAuth'
import { AuthDialog } from './AuthDialog'

export function AccountButton() {
  const { user, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => setAuthOpen(true)}>
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-fg-muted hover:text-fg"
        aria-label="Account menu"
      >
        <UserIcon className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-lg border border-border bg-surface p-2 shadow-2xl">
          <p className="truncate px-2 py-1.5 text-xs text-fg-subtle">{user.email}</p>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              setMenuOpen(false)
              toast.success('Signed out.')
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-raised"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
