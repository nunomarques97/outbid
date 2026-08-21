import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

/** "Ember & Oak Coffee" -> "ember-oak-coffee" — companies.slug must be unique; caller surfaces the DB's unique-violation error if it collides. */
export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** "2026-08-21T12:00:00Z" -> "3h ago" / "just now" / a plain date once it's old enough to matter more than how long ago. */
export function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** "Ember & Oak Coffee" -> "EO" — first letters of the first two meaningful words. */
export function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w))
  const initials = words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return initials || '?'
}
