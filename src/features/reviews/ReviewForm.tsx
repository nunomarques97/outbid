import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Review } from '@/lib/supabase/queries'
import { validateReview, REVIEW_TITLE_MAX, REVIEW_BODY_MAX } from '@/lib/reviewValidation'
import { StarRating } from '@/components/shared/StarRating'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCreateReview, useUpdateReview } from './useReviews'

interface ReviewFormProps {
  companyId: string
  userId: string
  /** Present → editing that review (pre-filled, submits an update). Absent → writing a new one. */
  existingReview?: Review | null
  onCancel: () => void
  onSaved: () => void
}

export function ReviewForm({ companyId, userId, existingReview, onCancel, onSaved }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [title, setTitle] = useState(existingReview?.title ?? '')
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateReview()
  const updateMutation = useUpdateReview()
  const submitting = createMutation.isPending || updateMutation.isPending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationError = validateReview({ rating, title, body })
    setError(validationError)
    if (validationError) return

    try {
      if (existingReview) {
        await updateMutation.mutateAsync({ reviewId: existingReview.id, rating, title, body })
        toast.success('Review updated.')
      } else {
        await createMutation.mutateAsync({ companyId, userId, rating, title, body })
        toast.success('Review posted — thanks for sharing your experience.')
      }
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your review.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-organic/30 bg-surface p-5">
      <p className="text-sm font-semibold text-fg">{existingReview ? 'Edit your review' : 'Write a review'}</p>

      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Your rating</p>
        <StarRating value={rating} onChange={setRating} interactive size="lg" />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label className="text-sm font-medium text-fg" htmlFor="review-title">
            Title
          </label>
          <span className="text-xs text-fg-subtle">
            {title.length}/{REVIEW_TITLE_MAX}
          </span>
        </div>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={REVIEW_TITLE_MAX}
          placeholder="Sum up your experience"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label className="text-sm font-medium text-fg" htmlFor="review-body">
            Review
          </label>
          <span className="text-xs text-fg-subtle">
            {body.length}/{REVIEW_BODY_MAX}
          </span>
        </div>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={REVIEW_BODY_MAX}
          rows={5}
          placeholder="What was your experience like? What stood out?"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : existingReview ? 'Save changes' : 'Post review'}
        </Button>
      </div>
    </form>
  )
}
