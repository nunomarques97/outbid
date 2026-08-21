import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { CompanyAvatar } from '@/components/ui/avatar'
import { LOGO_ALLOWED_TYPES, LOGO_MAX_BYTES } from '@/lib/supabase/mutations'
import { cn } from '@/lib/utils'

interface LogoPickerProps {
  initials: string
  color: string
  /** The real current logo, if any — shown until the user picks a replacement. */
  currentLogoUrl?: string | null
  onFileSelected: (file: File) => void
  size?: 'lg' | 'xl'
  disabled?: boolean
}

/**
 * Picking + validating + previewing a logo file — used identically by the
 * create-company form (upload deferred until the company exists) and the
 * dashboard's "change logo" control (uploads immediately). What happens
 * with the picked File is entirely up to the caller via onFileSelected.
 */
export function LogoPicker({ initials, color, currentLogoUrl, onFileSelected, size = 'lg', disabled }: LogoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Revoke the blob URL when it's replaced or the component unmounts, so we
  // don't leak object URLs across repeated picks.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file) return

    if (!LOGO_ALLOWED_TYPES.includes(file.type as (typeof LOGO_ALLOWED_TYPES)[number])) {
      setError('Please choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
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
        aria-label="Choose a logo image"
      >
        <CompanyAvatar initials={initials} color={color} logoUrl={previewUrl ?? currentLogoUrl} size={size} />
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
          {currentLogoUrl || previewUrl ? 'Change logo' : 'Upload logo'}
        </button>
        <p className="mt-0.5 text-xs text-fg-subtle">PNG, JPEG, or WebP — up to 2MB. Optional.</p>
        {error && <p className="mt-0.5 text-xs text-danger">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
