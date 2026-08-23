import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import type { Review } from '@/lib/supabase/queries'
import { StarRating } from '@/components/shared/StarRating'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ReportButton } from '@/features/reports/ReportButton'
import { formatRelativeTime, cn } from '@/lib/utils'

interface ReviewCardProps {
  review: Review
  isOwn?: boolean
  onEdit?: () => void
  onDelete?: () => void
  deleting?: boolean
  /**
   * The author's username, when known — makes the author avatar/name a
   * link to their public profile. Omit (or pass undefined) when it isn't
   * known yet or the author's profile isn't public; the name still
   * renders, just as plain text, never a broken/guessed link.
   */
  authorUsername?: string
  /**
   * A real, already-resolved (signed) avatar URL, when the author has one
   * and it's visible to the current viewer. Omit/null to fall back to the
   * deterministic default — never fetched here per-card; callers resolve
   * this in a batch (see useReviewAuthors) alongside authorUsername.
   */
  authorAvatarUrl?: string | null
}

/**
 * More than a trigger's own timestamp-touch worth of gap between created_at
 * and updated_at — cheap, good-enough signal that a review was genuinely
 * edited after the fact, without a separate boolean column to keep in sync.
 */
function wasEdited(review: Review): boolean {
  return new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 60_000
}

/**
 * Renders authorDisplayName — the name snapshotted server-side at review
 * creation (see reviews_set_author_name) — never review.userId. No raw
 * account identifiers ever reach this component's output.
 */
export function ReviewCard({ review, isOwn, onEdit, onDelete, deleting, authorUsername, authorAvatarUrl }: ReviewCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const authorLabel = (
    <span className="inline-flex items-center gap-1.5">
      <UserAvatar
        userId={review.userId}
        displayName={review.authorDisplayName}
        avatarUrl={authorAvatarUrl}
        size="sm"
        className="h-4 w-4 text-[9px]"
      />
      {review.authorDisplayName}
    </span>
  )

  return (
    <div className={cn('rounded-xl border p-4', isOwn ? 'border-organic/30 bg-organic/5' : 'border-border bg-surface')}>
      <div className="flex items-center gap-2">
        <StarRating value={review.rating} size="sm" />
        {isOwn && (
          <span className="rounded-full bg-organic/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-organic">
            Your review
          </span>
        )}
      </div>
      <p className="mt-1.5 font-semibold text-fg">{review.title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{review.body}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-fg-subtle">
          {authorUsername ? (
            <Link to={`/users/${authorUsername}`} className="hover:text-fg hover:underline">
              {authorLabel}
            </Link>
          ) : (
            authorLabel
          )}
          <span>
            · {formatRelativeTime(review.createdAt)}
            {wasEdited(review) && ' · edited'}
          </span>
        </p>

        {!isOwn && <ReportButton targetType="review" targetId={review.id} />}

        {isOwn && (onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {!confirmingDelete && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            {!confirmingDelete && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
            {confirmingDelete && (
              <>
                <span className="text-xs text-fg-muted">Delete this review?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={onDelete}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-raised disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
