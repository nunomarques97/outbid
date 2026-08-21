import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Company } from '@/mocks/types'
import { CompanyAvatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface CompanySwitcherProps {
  companies: Company[]
  selectedId: string
  onSelect: (companyId: string) => void
}

/**
 * Deliberately renders nothing when there's only one company (or zero) —
 * "keep it simple" for the common case, per the task's own instruction.
 * Selection is plain props/callback, owned by the caller (DashboardPage) —
 * this component holds no company data of its own.
 */
export function CompanySwitcher({ companies, selectedId, onSelect }: CompanySwitcherProps) {
  const [open, setOpen] = useState(false)
  if (companies.length <= 1) return null

  const selected = companies.find((c) => c.id === selectedId) ?? companies[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised py-1.5 pl-1.5 pr-3 text-sm font-medium text-fg transition-colors hover:border-brand/30"
      >
        <CompanyAvatar initials={selected.initials} color={selected.logoColor} logoUrl={selected.logoUrl} size="sm" />
        <span className="max-w-[10rem] truncate">{selected.name}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-fg-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-64 rounded-lg border border-border bg-surface p-1.5 shadow-2xl">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-fg-subtle">Your companies</p>
          {companies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => {
                onSelect(company.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-raised',
                company.id === selectedId ? 'text-fg' : 'text-fg-muted',
              )}
            >
              <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate">{company.name}</span>
              {company.id === selectedId && <Check className="h-4 w-4 shrink-0 text-sponsored" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
