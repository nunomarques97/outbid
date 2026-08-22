export function RankingExplainer() {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-surface/60 p-4 sm:grid-cols-2">
      <div className="flex gap-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sponsored" />
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">Sponsored</span> — paid visibility. Companies bid
          openly for these spots; the highest bid holds the top position.
        </p>
      </div>
      <div className="flex gap-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-organic" />
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">Community ranked</span> — earned visibility. Order
          is driven entirely by votes from people browsing Repcastr.
        </p>
      </div>
    </div>
  )
}
