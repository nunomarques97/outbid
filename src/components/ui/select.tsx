import * as React from 'react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-brand',
        className,
      )}
      {...props}
    />
  ),
)
Select.displayName = 'Select'
