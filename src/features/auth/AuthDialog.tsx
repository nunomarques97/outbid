import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/shared/GoogleIcon'
import { useAuth } from './useAuth'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { isConfigured } = useAuth()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Sign in to Outbid</DialogTitle>
        <DialogDescription>Vote, save companies, and manage advertiser accounts.</DialogDescription>

        {!isConfigured ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-fg-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p>
              Outbid isn't connected to Supabase yet. Accounts will work once{' '}
              <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> are set —
              see <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">.env.example</code>.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="signin" className="mt-5">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Sign up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <AuthForm mode="signin" onSuccess={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <AuthForm mode="signup" onSuccess={() => onOpenChange(false)} />
            </TabsContent>
          </Tabs>
        )}

        {isConfigured && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-fg-subtle">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <GoogleSignInButton />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={submitting}
      className="w-full"
      onClick={async () => {
        setSubmitting(true)
        try {
          // On success this navigates the whole browser away to Google —
          // there's no "then" state to show, the tab is simply gone.
          await signInWithGoogle()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Couldn’t start Google sign-in.')
          setSubmitting(false)
        }
      }}
    >
      <GoogleIcon className="h-4 w-4" />
      {submitting ? 'Redirecting to Google…' : 'Continue with Google'}
    </Button>
  )
}

function AuthForm({ mode, onSuccess }: { mode: 'signin' | 'signup'; onSuccess: () => void }) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName || undefined)
        toast.success('Account created — check your email to confirm, if required.')
      } else {
        await signIn(email, password)
        toast.success('Signed in.')
      }
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {mode === 'signup' && (
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          autoComplete="name"
        />
      )}
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
      />
      <Input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
      />
      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  )
}
