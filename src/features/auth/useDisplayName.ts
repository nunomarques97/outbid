import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getMyDisplayName, getMyUsername } from '@/lib/supabase/queries'
import { updateDisplayName } from '@/lib/supabase/mutations'

export function useMyDisplayName() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: ['myDisplayName', user?.id],
    queryFn: () => getMyDisplayName(user!.id),
    enabled: isConfigured && Boolean(user),
  })
}

/** Powers the account dropdown's "Profile" link — /users/:username needs the username, not just the user id. */
export function useMyUsername() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: ['myUsername', user?.id],
    queryFn: () => getMyUsername(user!.id),
    enabled: isConfigured && Boolean(user),
  })
}

export function useUpdateDisplayName() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (displayName: string) => updateDisplayName(user!.id, displayName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDisplayName', user?.id] }),
  })
}
