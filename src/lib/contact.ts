/**
 * The one place these values are defined — every UI surface that shows a
 * contact address reads from here rather than repeating a literal string.
 * Both are real domain mailboxes (Cloudflare Email Routing -> the
 * operator's own inbox), set up in Phase 37 specifically so the
 * operator's personal address never needs to appear in public-facing UI
 * again — see Phase 36 for the prior, temporary state.
 */
export const SUPPORT_EMAIL = 'support@repcastr.com'
export const PRIVACY_EMAIL = 'privacy@repcastr.com'
