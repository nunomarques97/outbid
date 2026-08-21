import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CompanyAvatarProps {
  initials: string
  color: string
  /** Real uploaded logo URL. Omit, or pass null/undefined, to always show the initials avatar. */
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

/**
 * The one place a company's logo/avatar is rendered — every surface in the
 * app (rankings, profiles, battles, deals, dashboard, notifications, the
 * company switcher) uses this instead of reimplementing the image-vs-
 * initials choice. Falls back to the initials tile whenever there's no
 * logoUrl, and again automatically if the image itself fails to load
 * (broken URL, deleted object, etc.) — the fallback is never just "assume
 * the URL works."
 */
export function CompanyAvatar({ initials, color, logoUrl, size = 'md', className }: CompanyAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  // Adjusting state during render (React's documented pattern for "reset
  // state when a prop changes") rather than an effect — without this, one
  // broken load would latch `imageFailed` forever, so switching to a
  // company with a perfectly good logo (or a freshly replaced one) would
  // still silently show initials for an instance that previously saw a
  // different, bad URL.
  const [prevLogoUrl, setPrevLogoUrl] = useState(logoUrl)
  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl)
    setImageFailed(false)
  }
  const showImage = Boolean(logoUrl) && !imageFailed

  if (showImage) {
    return (
      <img
        src={logoUrl!}
        alt=""
        onError={() => setImageFailed(true)}
        className={cn('shrink-0 rounded-xl object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-xl font-bold text-white', sizes[size], className)}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}
