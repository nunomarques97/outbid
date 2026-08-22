// Same palette CreateCompanyForm offers for a company's fallback color —
// reused here so user and company avatars share one visual language.
const AVATAR_COLORS = ['#6C5CE7', '#00B4D8', '#FB8500', '#F72585', '#06D6A0', '#3A86FF', '#FF006E', '#38B000']

/**
 * A stable color for a user's default (no-uploaded-photo) avatar, derived
 * purely from an identity seed (their user id — never their name, which
 * they can change) — same seed always produces the same color, on every
 * page, every session, no randomness and no server round-trip.
 */
export function deriveAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}
