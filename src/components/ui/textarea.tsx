import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-brand',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
