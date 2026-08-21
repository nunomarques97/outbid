import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  /** 0-5, fractional allowed in read-only mode (e.g. an average of 4.3 renders a partially-filled 5th star). */
  value: number
  onChange?: (rating: number) => void
  interactive?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-7 w-7' }

/**
 * The one place a star rating is ever rendered, in both its read-only
 * (company average, one review's rating) and interactive (review form
 * input) forms — so no component reimplements "what does N/5 stars look
 * like." Deliberately organic-cyan rather than sponsored-gold: gold means
 * "paid placement" everywhere else in this app, and a reputation signal
 * must never visually read as something a company bought.
 */
export function StarRating({ value, onChange, interactive = false, size = 'md', className }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (interactive) {
    const active = hovered ?? value
    return (
      <div className={cn('flex items-center gap-1', className)} onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(n)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange?.(n)}
            aria-label={`Rate ${n} out of 5 stars`}
            aria-pressed={n <= value}
            className="text-fg-subtle transition-transform hover:scale-110"
          >
            <Star className={cn(SIZE_CLASSES[size], n <= active ? 'fill-organic text-organic' : 'fill-none')} />
          </button>
        ))}
      </div>
    )
  }

  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn(SIZE_CLASSES[size], 'fill-none text-border')} />
        ))}
      </div>
      <div className="absolute inset-0 flex gap-0.5 overflow-hidden" style={{ width: `${pct}%` }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn(SIZE_CLASSES[size], 'shrink-0 fill-organic text-organic')} />
        ))}
      </div>
    </div>
  )
}
