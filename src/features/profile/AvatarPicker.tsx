import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { AVATAR_ALLOWED_TYPES, AVATAR_MAX_BYTES } from '@/lib/supabase/mutations'
import { cn } from '@/lib/utils'

interface AvatarPickerProps {
  userId: string
  displayName: string
  /** The real current avatar, if any — shown until the user picks a replacement. */
  currentAvatarUrl?: string | null
  onFileSelected: (file: File) => void
  disabled?: boolean
}

/**
 * Picking + validating + previewing an avatar file — same shape as
 * LogoPicker (company logos), deliberately not shared code: separate
 * bucket, separate constants, separate concept, per the Phase 29 brief's
 * "do not mix company logos and user avatars." What happens with the
 * picked File is entirely up to the caller via onFileSelected — this
 * never uploads anything itself, so cancelling a selection (closing the
 * dialog without saving) never touches storage.
 */
export function AvatarPicker({ userId, displayName, currentAvatarUrl, onFileSelected, disabled }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
      setError('Please choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('That image is too large — please choose one under 2MB.')
      return
    }

    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    onFileSelected(file)
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="group relative disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Choose an avatar image"
      >
        <UserAvatar
          userId={userId}
          displayName={displayName}
          avatarUrl={previewUrl ?? currentAvatarUrl}
          size="xl"
        />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity',
            !disabled && 'group-hover:opacity-100',
          )}
        >
          <Camera className="h-5 w-5 text-white" />
        </span>
      </button>
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {currentAvatarUrl || previewUrl ? 'Change avatar' : 'Upload avatar'}
        </button>
        <p className="mt-0.5 text-xs text-fg-subtle">PNG, JPEG, or WebP — up to 2MB. Optional.</p>
        {error && <p className="mt-0.5 text-xs text-danger">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
