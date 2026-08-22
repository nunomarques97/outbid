import { Swords } from 'lucide-react'

/**
 * Was rendering battlesQuery.data[0] — always the same battle, forever,
 * despite the "of the Day" name promising daily rotation that was never
 * built, and inviting votes ("see who the community trusts more") on a
 * table with no baseline and effectively no real participation yet. The
 * underlying voting mechanism is genuinely real (battle_votes, no seed
 * padding) and stays fully live everywhere else — individual battle pages
 * and every "Compare" link are untouched, since a head-to-head comparison
 * is useful to one customer regardless of vote count. This is specifically
 * about not over-promising on the homepage's most prominent community CTA
 * before there's a community behind it.
 */
export function BattleOfTheDay() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Swords className="h-5 w-5 text-organic" />
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Battle of the day</h2>
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
        <p className="font-semibold text-fg">Coming soon</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
          Battle of the Day is coming soon — we're building the community that makes every battle count.
        </p>
      </div>
    </section>
  )
}
