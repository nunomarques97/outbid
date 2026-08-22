import { CompanyAvatar } from '@/components/ui/avatar'
import { deriveAvatarColor } from '@/lib/avatarColor'
import { deriveInitials } from '@/lib/utils'

interface UserAvatarProps {
  /** Identity seed for the deterministic fallback color — always the user's id, never their (changeable) name. */
  userId: string
  displayName: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * The one place a user's avatar is rendered — reviews, search results, the
 * profile page, anywhere a customer's public identity appears — same
 * pattern as CompanyAvatar for companies, deliberately reusing that same
 * initials-vs-image rendering rather than a second implementation. Falls
 * back to a deterministic color (see deriveAvatarColor) when there's no
 * uploaded avatar yet, so the same user always looks the same everywhere
 * without needing every caller to fetch and pass a real photo.
 */
export function UserAvatar({ userId, displayName, avatarUrl, size = 'md', className }: UserAvatarProps) {
  return (
    <CompanyAvatar
      initials={deriveInitials(displayName)}
      color={deriveAvatarColor(userId)}
      logoUrl={avatarUrl}
      size={size}
      className={className}
    />
  )
}
