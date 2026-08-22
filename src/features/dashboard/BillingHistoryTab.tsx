import { useBidPayments, useCategories, usePlacements } from '@/lib/supabase/hooks'
import { getPlacementDisplayName } from '@/lib/supabase/queries'
import type { BidPayment } from '@/lib/supabase/queries'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency, cn } from '@/lib/utils'

const STATUS_LABEL: Record<BidPayment['status'], string> = {
  succeeded: 'Paid',
  pending: 'Pending',
  cancelled: 'Cancelled',
}

const STATUS_CLASS: Record<BidPayment['status'], string> = {
  succeeded: 'text-sponsored',
  pending: 'text-fg-muted',
  cancelled: 'text-fg-subtle',
}

/**
 * Read-only history of one-time Stripe bid payments — replaces the earlier
 * "Billing is coming soon" placeholder now that real payments exist. Not a
 * subscription/invoice surface: there is no plan, no recurring charge, no
 * next billing date — just the record of what was actually charged and
 * what bid each charge established, straight from bid_payments (which the
 * browser can only ever read, never write — see its RLS policy).
 */
export function BillingHistoryTab({ companyId }: { companyId: string }) {
  const paymentsQuery = useBidPayments(companyId)
  const categoriesQuery = useCategories()
  const placementsQuery = usePlacements()

  const loading = paymentsQuery.isLoading || categoriesQuery.isLoading || placementsQuery.isLoading
  const errored = paymentsQuery.isError || categoriesQuery.isError || placementsQuery.isError

  if (loading) return <LoadingState label="Loading payment history…" />
  if (errored) return <ErrorState message="Couldn't load your payment history." />

  const payments = paymentsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const placements = placementsQuery.data ?? []

  const succeeded = payments.filter((p) => p.status === 'succeeded')
  const totalPaid = succeeded.reduce((sum, p) => sum + p.amount, 0)

  function placementName(placementId: string): string {
    const placement = placements.find((p) => p.id === placementId)
    return placement ? getPlacementDisplayName(placement, categories) : 'Placement'
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
        <p className="font-semibold text-fg">No bid payments yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
          Your payments are one-time charges made when you establish or raise a sponsored bid. Nothing to show until
          your first bid.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-fg">Bid payments</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Your payments are one-time charges made when you establish or raise a sponsored bid. There are no
          subscriptions, plans, or recurring charges — you only pay again if you choose to raise a bid.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-fg-subtle">Total paid</p>
          <p className="font-numeral mt-1 text-2xl text-sponsored">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-fg-subtle">Successful payments</p>
          <p className="font-numeral mt-1 text-2xl text-fg">{succeeded.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-surface-raised text-left text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Placement</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-right font-medium">Target bid</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-fg-muted">
                  {new Date(payment.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-2.5 text-fg">{placementName(payment.placementId)}</td>
                <td className="font-numeral px-4 py-2.5 text-right text-fg">{formatCurrency(payment.amount)}</td>
                <td className="font-numeral px-4 py-2.5 text-right text-fg-muted">
                  {formatCurrency(payment.targetBidAmount)}
                </td>
                <td className={cn('px-4 py-2.5 font-medium', STATUS_CLASS[payment.status])}>
                  {STATUS_LABEL[payment.status]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
