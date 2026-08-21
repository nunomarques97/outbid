import { Compass, ThumbsUp, Sparkles, Building2, Gavel, LineChart } from 'lucide-react'

const userSteps = [
  { icon: Compass, title: 'Discover', body: 'Browse rankings, comparisons, deals, and trends across categories that matter to you.' },
  { icon: ThumbsUp, title: 'Vote', body: 'Upvote the companies you trust. Organic rank is earned entirely from votes like yours.' },
  { icon: Sparkles, title: 'Decide faster', body: 'Sponsored spots are clearly labeled, so you always know what’s earned versus paid.' },
]

const businessSteps = [
  { icon: Building2, title: 'Create a profile', body: 'Claim your business, add a logo, tagline, and description in minutes.' },
  { icon: Gavel, title: 'Bid for placement', body: 'Set a bid for the category leaderboard or homepage. Highest bid wins the top spots.' },
  { icon: LineChart, title: 'Track your position', body: 'Watch your rank live, see competitor bids, and raise your bid the moment you’re outbid.' },
]

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <StepColumn eyebrow="For everyone" title="Content worth showing up for" steps={userSteps} accent="organic" />
        <StepColumn eyebrow="For businesses" title="Visibility you compete for, honestly" steps={businessSteps} accent="sponsored" />
      </div>
    </section>
  )
}

function StepColumn({
  eyebrow,
  title,
  steps,
  accent,
}: {
  eyebrow: string
  title: string
  steps: { icon: typeof Compass; title: string; body: string }[]
  accent: 'organic' | 'sponsored'
}) {
  const accentClass = accent === 'organic' ? 'text-organic bg-organic/10 border-organic/25' : 'text-sponsored bg-sponsored/10 border-sponsored/25'
  return (
    <div>
      <p className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${accentClass}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h2>
      <div className="mt-6 flex flex-col gap-5">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accentClass}`}>
              <step.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-fg">
                <span className="font-numeral mr-1.5 text-fg-subtle">{i + 1}</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
