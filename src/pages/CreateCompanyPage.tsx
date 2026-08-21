import { useAuth } from '@/features/auth/useAuth'
import { CreateCompanyForm } from '@/features/companies/CreateCompanyForm'
import { LoadingState } from '@/components/shared/QueryStates'

export function CreateCompanyPage() {
  const { user, loading } = useAuth()

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg">Create your company</h1>
      <p className="mt-2 text-fg-muted">
        Set up a public profile for your business. Once it's live, you'll be able to bid for sponsored placement
        from your dashboard.
      </p>

      {loading ? (
        <LoadingState label="Loading…" />
      ) : !user ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center text-fg-muted">
          Sign in from the header first, then come back here to create your company.
        </div>
      ) : (
        <div className="mt-8">
          <CreateCompanyForm />
        </div>
      )}
    </div>
  )
}
