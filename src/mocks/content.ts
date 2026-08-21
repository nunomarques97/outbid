import type { Battle, Deal, Trend } from './types'

export const battles: Battle[] = [
  {
    id: 'battle-flowstack-taskwave',
    type: 'battle',
    companyAId: 'co-flowstack',
    companyBId: 'co-taskwave',
    votesA: 1284,
    votesB: 967,
    criteria: [
      { label: 'Learning curve', aValue: 'Under 10 minutes', bValue: 'About an hour', winner: 'a' },
      { label: 'GitHub sync', aValue: 'Two-way, real-time', bValue: 'One-way, hourly', winner: 'a' },
      { label: 'Price (5 seats)', aValue: '€39/mo', bValue: '€45/mo', winner: 'a' },
      { label: 'Automation rules', aValue: 'Basic', bValue: 'Advanced, cross-tool', winner: 'b' },
    ],
  },
  {
    id: 'battle-corestack-nimbus',
    type: 'battle',
    companyAId: 'co-corestack',
    companyBId: 'co-nimbus',
    votesA: 2036,
    votesB: 1811,
    criteria: [
      { label: 'Deploy method', aValue: 'Git push', bValue: 'Manual VPS setup', winner: 'a' },
      { label: 'Root access', aValue: 'No', bValue: 'Full root', winner: 'b' },
      { label: 'Free tier', aValue: 'Yes, generous', bValue: 'No', winner: 'a' },
      { label: 'Billing', aValue: 'Flat monthly', bValue: 'Hourly, pay-as-you-go', winner: 'tie' },
    ],
  },
  {
    id: 'battle-northbound-emberoak',
    type: 'battle',
    companyAId: 'co-northbound',
    companyBId: 'co-emberoak',
    votesA: 842,
    votesB: 901,
    criteria: [
      { label: 'Format', aValue: 'Cold-brew concentrate', bValue: 'Whole bean', winner: 'tie' },
      { label: 'Batch size', aValue: 'Large', bValue: '12kg drum', winner: 'b' },
      { label: 'Packaging', aValue: 'Glass, reusable', bValue: 'Compostable bag', winner: 'tie' },
      { label: 'Starting price', aValue: '€16/box', bValue: '€14/bag', winner: 'b' },
    ],
  },
  {
    id: 'battle-ironloop-pulseform',
    type: 'battle',
    companyAId: 'co-ironloop',
    companyBId: 'co-pulseform',
    votesA: 1560,
    votesB: 1622,
    criteria: [
      { label: 'Coaching', aValue: 'Human coach, weekly review', bValue: 'Algorithmic, daily', winner: 'a' },
      { label: 'Wearable sync', aValue: 'Manual logging', bValue: 'Automatic, HRV-based', winner: 'b' },
      { label: 'Best for', aValue: 'Powerlifting', bValue: 'General strength', winner: 'tie' },
      { label: 'Price', aValue: '€79/mo', bValue: '€19/mo', winner: 'b' },
    ],
  },
  {
    id: 'battle-pathforge-cadence',
    type: 'battle',
    companyAId: 'co-pathforge',
    companyBId: 'co-cadence',
    votesA: 1105,
    votesB: 634,
    criteria: [
      { label: 'Core focus', aValue: 'Roadmapping', bValue: 'Async standups', winner: 'tie' },
      { label: 'Stakeholder view', aValue: 'Built-in, polished', bValue: 'Basic export', winner: 'a' },
      { label: 'Setup time', aValue: '~30 minutes', bValue: '~5 minutes', winner: 'b' },
      { label: 'Team size fit', aValue: '10-200 people', bValue: '3-30 people', winner: 'tie' },
    ],
  },
]

export const deals: Deal[] = [
  {
    id: 'deal-corestack',
    type: 'deal',
    companyId: 'co-corestack',
    title: '3 months free on any Corestack plan',
    discountLabel: '3 months free',
    expiresAt: '2026-09-15T23:59:00Z',
    description: 'New accounts get their first three months free on the Pro or Team plan, no card required upfront.',
    claimCount: 412,
  },
  {
    id: 'deal-northbound',
    type: 'deal',
    companyId: 'co-northbound',
    title: '20% off your first Northbound box',
    discountLabel: '20% off',
    expiresAt: '2026-09-01T23:59:00Z',
    description: 'First-time subscribers save 20% on any cold-brew concentrate box, code applied at checkout.',
    claimCount: 268,
  },
  {
    id: 'deal-ironloop',
    type: 'deal',
    companyId: 'co-ironloop',
    title: 'First month of coaching free',
    discountLabel: 'First month free',
    expiresAt: '2026-08-31T23:59:00Z',
    description: 'Get matched with a certified powerlifting coach and skip your first month’s fee entirely.',
    claimCount: 156,
  },
  {
    id: 'deal-momentum',
    type: 'deal',
    companyId: 'co-momentum',
    title: '30% off the annual plan',
    discountLabel: '30% off annual',
    expiresAt: '2026-09-30T23:59:00Z',
    description: 'Lock in a full year of Momentum Fit at 30% off — includes the grace-day streak system.',
    claimCount: 731,
  },
  {
    id: 'deal-emberoak',
    type: 'deal',
    companyId: 'co-emberoak',
    title: 'Free shipping on orders over €25',
    discountLabel: 'Free shipping',
    expiresAt: '2026-12-31T23:59:00Z',
    description: 'Standing offer: any order over €25 ships free across the EU, no code needed.',
    claimCount: 1043,
  },
  {
    id: 'deal-nimbus',
    type: 'deal',
    companyId: 'co-nimbus',
    title: '2 months free on annual VPS plans',
    discountLabel: '2 months free',
    expiresAt: '2026-09-10T23:59:00Z',
    description: 'Prepay a year on any VPS tier and Nimbus adds two extra months automatically.',
    claimCount: 189,
  },
  {
    id: 'deal-fernweh',
    type: 'deal',
    companyId: 'co-fernweh',
    title: '30-day trial instead of the usual 14',
    discountLabel: 'Extended trial',
    expiresAt: '2026-09-20T23:59:00Z',
    description: 'Sign up through Outbid and get a full 30 days of adaptive yoga sessions before you’re charged.',
    claimCount: 97,
  },
  {
    id: 'deal-anchorpoint',
    type: 'deal',
    companyId: 'co-anchorpoint',
    title: 'Free migration + first month free',
    discountLabel: 'Free migration',
    expiresAt: '2026-09-05T23:59:00Z',
    description: 'Anchorpoint’s team migrates your WordPress site by hand at no cost, plus your first month is free.',
    claimCount: 214,
  },
]

export const trends: Trend[] = [
  {
    id: 'trend-async-standups',
    type: 'trend',
    title: 'Async standups are quietly replacing the daily call',
    summary:
      'More remote teams are swapping the 15-minute video standup for a two-minute written check-in — and reporting fewer, not more, missed updates.',
    relatedCompanyIds: ['co-cadence'],
    trendScore: 87,
    publishedAt: '2026-08-19T08:00:00Z',
  },
  {
    id: 'trend-cold-brew',
    type: 'trend',
    title: 'Cold-brew concentrate subscriptions are outgrowing whole bean',
    summary:
      'Search interest and reorder rates for concentrate formats have overtaken traditional whole-bean subscriptions for the first time this year.',
    relatedCompanyIds: ['co-northbound'],
    trendScore: 74,
    publishedAt: '2026-08-17T08:00:00Z',
  },
  {
    id: 'trend-bare-metal',
    type: 'trend',
    title: 'Bare-metal hosting is making a comeback as cloud bills spike',
    summary:
      'Teams burned by unpredictable egress fees are moving steady workloads back to dedicated boxes with flat, predictable pricing.',
    relatedCompanyIds: ['co-latticework', 'co-nimbus'],
    trendScore: 69,
    publishedAt: '2026-08-14T08:00:00Z',
  },
  {
    id: 'trend-recovery-aware',
    type: 'trend',
    title: 'Recovery-aware training is the fastest-growing fitness category',
    summary:
      'Apps that adjust workouts based on sleep and HRV data are seeing the steepest month-over-month growth of any fitness app segment tracked here.',
    relatedCompanyIds: ['co-pulseform'],
    trendScore: 91,
    publishedAt: '2026-08-20T08:00:00Z',
  },
  {
    id: 'trend-lighter-pm',
    type: 'trend',
    title: 'Small teams are ditching heavyweight PM tools for lighter ones',
    summary:
      'Vote activity on lightweight, dev-friendly planners has climbed steadily as teams cite setup time as their top frustration with legacy tools.',
    relatedCompanyIds: ['co-flowstack', 'co-sprintly'],
    trendScore: 65,
    publishedAt: '2026-08-12T08:00:00Z',
  },
  {
    id: 'trend-carbon-neutral',
    type: 'trend',
    title: 'Carbon-neutral roasting is becoming the baseline, not a bonus',
    summary:
      'Roasters advertising offset-matched energy use are seeing higher first-time conversion, according to vote and save activity across the category.',
    relatedCompanyIds: ['co-ridgeline'],
    trendScore: 58,
    publishedAt: '2026-08-10T08:00:00Z',
  },
]

export function getBattleById(id: string) {
  return battles.find((b) => b.id === id)
}
