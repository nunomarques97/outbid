import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, Lock } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { usePublicProfile, useUserInterests, useCategories } from '@/lib/supabase/hooks'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { LoadingState } from '@/components/shared/QueryStates'
import { EditProfileDialog } from '@/features/profile/EditProfileDialog'
import { ProfileReviewsSection } from '@/features/profile/ProfileReviewsSection'

function formatJoinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const profileQuery = usePublicProfile(username)
  const [editOpen, setEditOpen] = useState(false)

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <LoadingState label="Loading profile…" />
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-fg">Couldn't load this profile</h1>
        <p className="mt-2 text-fg-muted">Something went wrong. Please try again.</p>
      </div>
    )
  }

  const profile = profileQuery.data
  const isOwn = Boolean(user && profile && user.id === profile.id)

  // A missing row means either "no profile at this username" or "private,
  // and you're not the owner" — RLS makes those indistinguishable, and
  // Repcastr deliberately doesn't try to tell them apart (see
  // getPublicProfileByUsername). One neutral state covers both.
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Lock className="mx-auto h-8 w-8 text-fg-subtle" />
        <h1 className="mt-4 text-2xl font-bold text-fg">This profile isn't available</h1>
        <p className="mt-2 text-fg-muted">It may not exist, or the owner has kept it private.</p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Back to Repcastr
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar userId={profile.id} displayName={profile.displayName} avatarUrl={profile.avatarUrl} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-fg">{profile.displayName}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Joined {formatJoinedDate(profile.createdAt)} · {profile.reviewCount}{' '}
              review{profile.reviewCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {isOwn && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </Button>
        )}
      </div>

      {isOwn && !profile.isPublic && (
        <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface/60 px-3 py-2 text-xs text-fg-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" /> Your profile is private — only you can see this page.
        </p>
      )}

      <ProfileInterests userId={profile.id} />

      {(profile.bio || isOwn) && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-fg-muted">About</h2>
          {profile.bio ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{profile.bio}</p>
          ) : (
            <p className="text-sm text-fg-subtle">No bio yet.</p>
          )}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/60 p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-fg-muted">Karma</h2>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
            Coming soon
          </span>
        </div>
        <p className="mt-1.5 text-sm text-fg-muted">
          A reputation signal based on community activity is planned for a future update.
        </p>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Reviews</h2>
        <ProfileReviewsSection
          userId={profile.id}
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          isOwn={isOwn}
        />
      </div>

      {isOwn && <EditProfileDialog profile={profile} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  )
}

function ProfileInterests({ userId }: { userId: string }) {
  const interestsQuery = useUserInterests(userId)
  const categoriesQuery = useCategories()

  const categoryIds = interestsQuery.data ?? []
  if (categoryIds.length === 0) return null

  const categories = (categoriesQuery.data ?? []).filter((c) => categoryIds.includes(c.id))
  if (categories.length === 0) return null

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-fg-muted">Interests</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c.id} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
            {c.name}
          </span>
        ))}
      </div>
    </div>
  )
}
