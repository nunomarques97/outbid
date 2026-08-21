import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-brand',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
