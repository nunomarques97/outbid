import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function SponsoredInfoTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className="inline-flex text-bg/70 hover:text-bg"
          aria-label="What does sponsored mean?"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Companies bid for this position. Higher bid = higher rank. This never affects the
        organic, community-voted ranking below.
      </TooltipContent>
    </Tooltip>
  )
}
