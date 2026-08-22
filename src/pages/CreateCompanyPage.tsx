import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany } from '@/lib/supabase/hooks'
import { CreateCompanyForm } from '@/features/companies/CreateCompanyForm'
import { LoadingState } from '@/components/shared/QueryStates'
import { buttonVariants } from '@/components/ui/button'

/**
 * Repcastr v1 is one-company-per-user, enforced server-side (see
 * 20260822080000_one_company_per_user.sql) — a user who already has a
 * company would have their INSERT rejected by RLS if they submitted this
 * form anyway. Checking here and swapping in a clear message instead is
 * the UI half of that: nobody who already manages a company should ever
 * see (or fill out) a form that can only fail.
 */
export function CreateCompanyPage() {
  const { user, loading } = useAuth()
  const companyQuery = useMyCompany()

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg">Create your company</h1>
      <p className="mt-2 text-fg-muted">
        Set up a public profile for your business. Once it's live, you'll be able to bid for sponsored placement
        from your dashboard.
      </p>

      {loading || companyQuery.isPending ? (
        <LoadingState label="Loading…" />
      ) : !user ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center text-fg-muted">
          Sign in from the header first, then come back here to create your company.
        </div>
      ) : companyQuery.data ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-fg">You already manage {companyQuery.data.name}.</p>
          <p className="mt-1 text-sm text-fg-muted">Repcastr supports one company per account.</p>
          <Link to="/dashboard" className={buttonVariants({ className: 'mt-4' })}>
            Go to your dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <CreateCompanyForm />
        </div>
      )}
    </div>
  )
}
