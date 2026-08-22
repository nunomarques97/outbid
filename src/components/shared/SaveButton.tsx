import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSaveState } from '@/features/saved/useSavedCompanies'

interface SaveButtonProps {
  companyId: string
  size?: 'sm' | 'md'
}

export function SaveButton({ companyId, size = 'md' }: SaveButtonProps) {
  const { saved, toggle, pending } = useSaveState(companyId)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save company'}
      className={cn(
        'flex items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        saved
          ? 'border-brand/40 bg-brand/15 text-brand'
          : 'border-border bg-surface-raised text-fg-muted hover:border-brand/30 hover:text-brand',
        size === 'sm' ? 'h-11 w-11' : 'h-14 w-14',
      )}
    >
      <Bookmark className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
