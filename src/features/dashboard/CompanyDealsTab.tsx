import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Deal } from '@/mocks/types'
import { useDeals } from '@/lib/supabase/hooks'
import { useDeleteDeal } from '@/features/deals/useDealManagement'
import { DealFormDialog } from '@/features/deals/DealFormDialog'
import { Button } from '@/components/ui/button'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCompactNumber } from '@/lib/utils'

function isExpired(iso: string) {
  return new Date(iso).getTime() <= Date.now()
}

/**
 * The advertiser side of the deal system — previously nonexistent, every
 * deal in the database was seed content. Reuses the exact same useDeals()
 * query every customer-facing surface already shares (deals is a small
 * table; filtering to this company client-side avoids a second query
 * shape just for the dashboard). No "disable" flag: setting a deal's
 * expiry to today or earlier is how it comes down without deleting it —
 * DealCard everywhere else already treats that as Expired.
 */
export function CompanyDealsTab({ companyId }: { companyId: string }) {
  const dealsQuery = useDeals()
  const deleteMutation = useDeleteDeal()
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  if (dealsQuery.isLoading) return <LoadingState label="Loading deals…" />
  if (dealsQuery.isError) return <ErrorState message="Couldn't load deals." />

  const myDeals = (dealsQuery.data ?? []).filter((d) => d.companyId === companyId)

  function openCreate() {
    setEditingDeal(null)
    setFormOpen(true)
  }

  function openEdit(deal: Deal) {
    setEditingDeal(deal)
    setFormOpen(true)
  }

  function handleDelete(dealId: string) {
    deleteMutation.mutate(dealId, {
      onSuccess: () => {
        toast.success('Deal deleted.')
        setConfirmingDeleteId(null)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete this deal.'),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Deals customers can watch and follow through to your site.</p>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New deal
        </Button>
      </div>

      {myDeals.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-fg-muted">
          No deals yet. Create one to give customers a reason to visit your site.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myDeals.map((deal) => {
            const expired = isExpired(deal.expiresAt)
            return (
              <div key={deal.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-fg">{deal.title}</p>
                      <span className="shrink-0 rounded-full bg-organic/15 px-2 py-0.5 text-xs font-bold text-organic">
                        {deal.discountLabel}
                      </span>
                      {expired && (
                        <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-fg-subtle">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{deal.description}</p>
                    <p className="mt-1.5 text-xs text-fg-subtle">
                      {formatCompactNumber(deal.claimCount)} watching · Expires{' '}
                      {new Date(deal.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {confirmingDeleteId === deal.id ? (
                      <>
                        <span className="text-xs text-fg-muted">Delete?</span>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(deal.id)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => setConfirmingDeleteId(null)}
                          className="rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-raised disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(deal)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(deal.id)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DealFormDialog
        key={editingDeal?.id ?? 'new'}
        companyId={companyId}
        existingDeal={editingDeal}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}
