/**
 * supabase-js's FunctionsHttpError puts the real Edge Function response on
 * `.context` (a Response) rather than in `.message`, which is just a
 * generic "Edge Function returned a non-2xx status code" string. This
 * extracts the function's own `{ error: "..." }` body when present —
 * e.g. delete-account's "You manage a company..." — falling back to the
 * error's own message when the body isn't shaped that way.
 */
export async function extractEdgeFunctionErrorMessage(error: unknown, fallback = 'Something went wrong.'): Promise<string> {
  const errorMessage = error instanceof Error ? error.message : fallback

  if (typeof error !== 'object' || error === null || !('context' in error)) return errorMessage
  const context = (error as { context?: unknown }).context
  if (!(context instanceof Response)) return errorMessage

  try {
    const body = await context.clone().json()
    return typeof body?.error === 'string' ? body.error : errorMessage
  } catch {
    return errorMessage
  }
}
