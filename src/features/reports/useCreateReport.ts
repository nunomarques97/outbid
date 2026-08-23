import { useMutation } from '@tanstack/react-query'
import { createReport, type ReportTargetType, type ReportReason } from '@/lib/supabase/mutations'

interface CreateReportArgs {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  description: string | null
}

/** No cache to invalidate — reports aren't read back anywhere in the UI yet (see create_report()'s own doc comment for why: this is intake, not a moderation dashboard). */
export function useCreateReport() {
  return useMutation({
    mutationFn: ({ targetType, targetId, reason, description }: CreateReportArgs) =>
      createReport(targetType, targetId, reason, description),
  })
}
