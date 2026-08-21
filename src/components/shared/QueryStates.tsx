import { Loader2, AlertTriangle, Inbox } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-fg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-brand" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong loading this.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-6 py-16 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" />
      <p className="text-sm text-fg-muted">{message}</p>
    </div>
  )
}

export function EmptyState({ message = 'Nothing here yet.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-fg-muted">
      <Inbox className="h-6 w-6" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
