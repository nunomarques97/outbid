import type { ComponentProps } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-5 w-full touch-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-raised">
        <SliderPrimitive.Range className="absolute h-full bg-sponsored" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Bid amount"
        className="block h-5 w-5 rounded-full border-2 border-sponsored bg-bg shadow transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sponsored"
      />
    </SliderPrimitive.Root>
  )
}
