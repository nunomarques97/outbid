import { ExternalLink } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isValidCompanyWebsite } from '@/lib/companyWebsite'

interface CompanyExternalLinkButtonProps {
  website: string | null | undefined
  companyName: string
  className?: string
}

/**
 * A compact, icon-only "visit website" action for tight card rows (Top
 * Bidders, category rankings) where CompanyWebsiteLink's text+arrow button
 * would be too wide. Same safety properties as CompanyWebsiteLink: the URL
 * always comes from the company's own `website` field (never hardcoded),
 * opens in a new tab with noopener/noreferrer, and stops click propagation
 * so it's safe to render inside a card/row that has its own navigate
 * behavior without triggering both at once. Renders nothing when the
 * company has no usable website — never a disabled or broken-looking
 * button.
 */
export function CompanyExternalLinkButton({ website, companyName, className }: CompanyExternalLinkButtonProps) {
  if (!isValidCompanyWebsite(website)) return null
  return (
    <a
      href={`https://${website}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`Visit ${companyName}'s website`}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 shrink-0', className)}
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  )
}
