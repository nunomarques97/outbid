import { useState } from 'react'
import { toast } from 'sonner'
import type { PublicProfile } from '@/lib/supabase/queries'
import { useCategories, useUserInterests } from '@/lib/supabase/hooks'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CategoryChipPicker } from '@/components/shared/CategoryChipPicker'
import { AvatarPicker } from './AvatarPicker'
import { useUpdateProfile, useUploadAvatar, useSetUserInterests } from './useProfileMutations'

interface EditProfileDialogProps {
  profile: PublicProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}

const BIO_MAX = 500

/**
 * Editable fields this phase, per the Phase 29 brief: display name,
 * avatar, bio, interests, and visibility. Username is deliberately not
 * here — it's auto-generated and not editable yet. Picking a new avatar
 * file never uploads it (AvatarPicker only creates a local preview);
 * nothing is written to Supabase until "Save changes" — closing the
 * dialog any other way discards every pending change, avatar included.
 */
export function EditProfileDialog({ profile, open, onOpenChange }: EditProfileDialogProps) {
  const categoriesQuery = useCategories()
  const interestsQuery = useUserInterests(profile.id)

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [isPublic, setIsPublic] = useState(profile.isPublic)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  // Adjusting state during render (same pattern as EditCompanyDialog /
  // EditDisplayNameDialog) — reseeds every field whenever the dialog opens
  // or the interests query resolves, so a cancelled edit never lingers.
  const [seeded, setSeeded] = useState<{ open: boolean; data: string[] | undefined }>({
    open,
    data: interestsQuery.data,
  })
  if (seeded.open !== open || seeded.data !== interestsQuery.data) {
    setSeeded({ open, data: interestsQuery.data })
    if (open) {
      setDisplayName(profile.displayName)
      setBio(profile.bio ?? '')
      setIsPublic(profile.isPublic)
      if (interestsQuery.data !== undefined) setSelectedCategoryIds(interestsQuery.data)
    }
  }

  const updateProfileMutation = useUpdateProfile()
  const uploadAvatarMutation = useUploadAvatar()
  const setInterestsMutation = useSetUserInterests()
  const saving = updateProfileMutation.isPending || uploadAvatarMutation.isPending || setInterestsMutation.isPending

  const currentInterests = interestsQuery.data ?? []
  const interestsChanged =
    selectedCategoryIds.length !== currentInterests.length ||
    [...selectedCategoryIds].sort().some((id, i) => id !== [...currentInterests].sort()[i])
  const hasChanges =
    Boolean(pendingFile) ||
    displayName.trim() !== profile.displayName ||
    (bio.trim() || null) !== profile.bio ||
    isPublic !== profile.isPublic ||
    interestsChanged

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  function discardPending() {
    setPendingFile(null)
    setPickerKey((k) => k + 1)
  }

  function handleOpenChange(next: boolean) {
    if (!next) discardPending()
    onOpenChange(next)
  }

  async function handleSave() {
    const trimmedName = displayName.trim()
    if (trimmedName.length < 2) {
      toast.error('Display name must be at least 2 characters.')
      return
    }
    try {
      if (pendingFile) {
        await uploadAvatarMutation.mutateAsync({
          userId: profile.id,
          username: profile.username,
          file: pendingFile,
          previousPath: profile.avatarPath,
        })
      }
      await updateProfileMutation.mutateAsync({
        userId: profile.id,
        username: profile.username,
        input: { displayName: trimmedName, bio: bio.trim() || null, isPublic },
      })
      if (interestsChanged) {
        await setInterestsMutation.mutateAsync({
          userId: profile.id,
          username: profile.username,
          categoryIds: selectedCategoryIds,
        })
      }
      toast.success('Profile updated.')
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Update how your public profile appears to others.</DialogDescription>

        <div className="mt-5">
          <AvatarPicker
            key={pickerKey}
            userId={profile.id}
            displayName={displayName || profile.displayName}
            currentAvatarUrl={profile.avatarUrl}
            disabled={saving}
            onFileSelected={setPendingFile}
          />
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Display name</span>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={saving} minLength={2} />
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">About</span>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={3}
            disabled={saving}
            placeholder="Tell other customers a bit about yourself (optional)."
          />
          <span className="self-end text-xs text-fg-subtle">
            {bio.length}/{BIO_MAX}
          </span>
        </label>

        <div className="mt-1">
          <span className="text-sm font-medium text-fg">Interests</span>
          <p className="mt-0.5 text-xs text-fg-subtle">Categories you care about — shown on your profile.</p>
          <div className="mt-2">
            <CategoryChipPicker
              categories={(categoriesQuery.data ?? []).filter((c) => !c.isArchived)}
              selectedIds={selectedCategoryIds}
              onToggle={toggleCategory}
              disabled={saving}
            />
          </div>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Profile visibility</span>
          <Select value={isPublic ? 'public' : 'private'} onChange={(e) => setIsPublic(e.target.value === 'public')} disabled={saving}>
            <option value="public">Public — visible to everyone</option>
            <option value="private">Private — only visible to you</option>
          </Select>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
