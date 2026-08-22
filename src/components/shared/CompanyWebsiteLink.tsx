import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { buttonVariants, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CompanyWebsiteLinkProps {
  website: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  children?: ReactNode
}

/**
 * The one place a company's website is ever linked out to — extracted from
 * CompanyProfilePage (its original, still-only-other use) once DealCard
 * needed the exact same external-link behavior for a deal's destination:
 * https:// prefix, new tab, no referrer/opener leakage. stopPropagation
 * guards against this being placed inside a clickable card (as DealCard
 * does) without needing every caller to remember it.
 */
export function CompanyWebsiteLink({ website, variant = 'secondary', size = 'sm', className, children }: CompanyWebsiteLinkProps) {
  return (
    <a
      href={`https://${website}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children ?? 'Visit website'} <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  )
}
