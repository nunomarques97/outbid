import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile, uploadAvatar, setUserInterests } from '@/lib/supabase/mutations'

/** Every profile-editing mutation invalidates the same query families, so create/edit can't drift out of sync. */
function useInvalidateProfileQueries() {
  const queryClient = useQueryClient()
  return (userId: string, username?: string) => {
    queryClient.invalidateQueries({ queryKey: ['myDisplayName', userId] })
    if (username) queryClient.invalidateQueries({ queryKey: ['publicProfile', username] })
    queryClient.invalidateQueries({ queryKey: ['userInterests', userId] })
    // A display name change also affects how this user's name is discovered.
    queryClient.invalidateQueries({ queryKey: ['searchProfiles'] })
  }
}

interface UpdateProfileArgs {
  userId: string
  username?: string
  input: Partial<{ displayName: string; bio: string | null; isPublic: boolean }>
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfileQueries()
  return useMutation({
    mutationFn: ({ userId, input }: UpdateProfileArgs) => updateProfile(userId, input),
    onSuccess: (_result, variables) => invalidate(variables.userId, variables.username),
  })
}

interface UploadAvatarArgs {
  userId: string
  username?: string
  file: File
  previousPath?: string | null
}

export function useUploadAvatar() {
  const invalidate = useInvalidateProfileQueries()
  return useMutation({
    mutationFn: ({ userId, file, previousPath }: UploadAvatarArgs) => uploadAvatar(userId, file, previousPath),
    onSuccess: (_result, variables) => invalidate(variables.userId, variables.username),
  })
}

interface SetInterestsArgs {
  userId: string
  username?: string
  categoryIds: string[]
}

export function useSetUserInterests() {
  const invalidate = useInvalidateProfileQueries()
  return useMutation({
    mutationFn: ({ userId, categoryIds }: SetInterestsArgs) => setUserInterests(userId, categoryIds),
    onSuccess: (_result, variables) => invalidate(variables.userId, variables.username),
  })
}
