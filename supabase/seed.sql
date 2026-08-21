-- Outbid Phase 3 seed data
--
-- A faithful, high-fidelity transcription of src/mocks/*.ts into the real
-- schema, so a fresh database looks exactly like the working prototype
-- instead of empty. Every row here is marked is_seed = true and (per the
-- handle_new_company trigger) gets zero company_members rows, since there is
-- no auth.uid() while this file runs — that absence, plus the explicit flag,
-- is what structurally distinguishes demo data from anything a real signed
-- up user creates later.
--
-- No fixed UUID literals are used anywhere: every row lets id default to
-- gen_random_uuid(), and every foreign key below is resolved with a
-- subquery against a human-readable, unique column (slug / type / website /
-- title) instead of hand-tracked UUIDs — less to get wrong, easier to
-- review and extend.
--
-- Run via `supabase db reset` (applies all migrations, then this file) once
-- Docker/a linked project is available, or paste into the SQL editor of a
-- fresh Supabase project after the migrations have been applied.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, icon, description) values
  ('project-management-tools', 'Project Management Tools', 'ListChecks', 'Software teams use to plan sprints, track tasks, and ship on time.'),
  ('coffee-roasters', 'Coffee Roasters', 'Coffee', 'Independent roasters shipping fresh beans direct to your door.'),
  ('web-hosting', 'Web Hosting', 'Server', 'Where builders host sites, apps, and side projects.'),
  ('fitness-apps', 'Fitness Apps', 'Dumbbell', 'Apps for training, tracking, and staying honest with yourself.');

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
insert into public.companies
  (slug, name, initials, logo_color, tagline, description, website, founded_year, organic_votes_baseline, is_seed, tags)
values
  ('flowstack', 'Flowstack', 'FS', '#6C5CE7',
   'Sprint planning that doesn''t feel like homework',
   'Flowstack is a lightweight sprint planner built for small product teams who outgrew spreadsheets but never wanted Jira. Boards sync with GitHub and Linear out of the box.',
   'flowstack.io', 2021, 3420, true, array['Sprints', 'Kanban', 'Dev-friendly']),
  ('taskwave', 'Taskwave', 'TW', '#00B4D8',
   'One inbox for every task, everywhere',
   'Taskwave pulls tasks from Slack, email, and docs into a single triage inbox, then routes them to the right board automatically using simple rules you write once.',
   'taskwave.app', 2020, 2870, true, array['Automation', 'Inbox', 'Integrations']),
  ('pathforge', 'Pathforge', 'PF', '#FB8500',
   'Roadmaps your whole company will actually read',
   'Pathforge turns messy backlogs into roadmaps stakeholders can understand at a glance, with confidence levels and dependency mapping built in.',
   'pathforge.co', 2019, 4180, true, array['Roadmaps', 'Stakeholders', 'Planning']),
  ('cadence-hq', 'Cadence HQ', 'CH', '#F72585',
   'Async standups for distributed teams',
   'Cadence HQ replaces the daily standup meeting with a two-minute async check-in, then quietly rolls it up into a digest your manager actually reads.',
   'cadencehq.com', 2022, 1540, true, array['Async', 'Remote', 'Standups']),
  ('sprintly', 'Sprintly', 'SP', '#06D6A0',
   'Velocity tracking without the spreadsheet math',
   'Sprintly auto-calculates team velocity and burndown from your existing board activity, so retros start with real numbers instead of guesses.',
   'sprintly.dev', 2018, 2260, true, array['Velocity', 'Retros', 'Metrics']),

  ('ember-oak-coffee', 'Ember & Oak Coffee Roasters', 'EO', '#B5651D',
   'Small-batch roasts from a single 12kg drum',
   'Ember & Oak roasts in tiny 12kg batches out of a converted garage in Porto, sourcing single-origin lots directly from three family farms.',
   'emberandoak.coffee', 2017, 1980, true, array['Single-origin', 'Small-batch', 'Direct trade']),
  ('northbound-coffee', 'Northbound Coffee Co.', 'NB', '#118AB2',
   'Cold-brew concentrate, shipped weekly',
   'Northbound built its whole subscription around one obsession: a 12-hour cold-brew concentrate that ships in glass, not plastic, every Monday.',
   'northboundcoffee.com', 2019, 3110, true, array['Cold brew', 'Subscription', 'Glass packaging']),
  ('basalt-roasting', 'Basalt Roasting Co.', 'BR', '#495057',
   'Volcanic-soil beans, roasted dark and slow',
   'Basalt specializes in beans grown in volcanic soil across four regions, roasted on a slow profile that favors body over brightness.',
   'basaltroasting.com', 2016, 1420, true, array['Dark roast', 'Volcanic soil', 'Espresso']),
  ('wanderlight-coffee', 'Wanderlight Coffee', 'WL', '#FFB4A2',
   'A new origin every season, curated by one buyer',
   'Wanderlight''s founder personally travels to source each season''s lineup, publishing tasting notes and farm photos with every release.',
   'wanderlightcoffee.com', 2021, 980, true, array['Seasonal', 'Curated', 'Storytelling']),
  ('ridgeline-roasters', 'Ridgeline Roasters', 'RR', '#2A9D8F',
   'Carbon-neutral roasting, since day one',
   'Ridgeline runs its roaster on offset-matched renewable energy and prints every bag with the exact farm GPS coordinates.',
   'ridgelineroasters.com', 2020, 1650, true, array['Carbon-neutral', 'Traceable', 'Light roast']),

  ('corestack-hosting', 'Corestack Hosting', 'CS', '#3A86FF',
   'Deploy from git in under 30 seconds',
   'Corestack is a git-push deploy platform for static sites and small apps, with a generous free tier and no surprise egress bills.',
   'corestack.dev', 2020, 5230, true, array['Git deploy', 'Static sites', 'Free tier']),
  ('nimbus-cloud', 'Nimbus Cloud', 'NC', '#8338EC',
   'VPS hosting with hourly billing, no lock-in',
   'Nimbus offers plain VPS instances billed by the hour, spun up in 12 regions, with a straightforward dashboard instead of a 40-tab console.',
   'nimbuscloud.io', 2015, 4670, true, array['VPS', 'Hourly billing', 'Multi-region']),
  ('anchorpoint-hosting', 'Anchorpoint Hosting', 'AP', '#EF476F',
   'Managed WordPress that actually stays fast',
   'Anchorpoint specializes in managed WordPress with server-level caching tuned per site, and a real human answering support tickets.',
   'anchorpointhosting.com', 2013, 2990, true, array['Managed WordPress', 'Caching', 'Support']),
  ('latticework-servers', 'Latticework Servers', 'LW', '#FFBE0B',
   'Bare-metal servers for people who miss root access',
   'Latticework rents dedicated bare-metal boxes with full root access, no hypervisor overhead, and pricing that doesn''t scale with your traffic.',
   'latticeworkservers.com', 2012, 1890, true, array['Bare-metal', 'Root access', 'Dedicated']),

  ('pulseform', 'Pulseform', 'PF', '#FF006E',
   'Strength training that adjusts to how you slept',
   'Pulseform pulls sleep and HRV data from your wearable and adjusts that day''s lifting program automatically -- lighter on bad-recovery days, heavier on good ones.',
   'pulseform.app', 2022, 2140, true, array['Strength', 'Recovery-aware', 'Wearables']),
  ('ironloop', 'Ironloop', 'IL', '#D62828',
   'Powerlifting programs from real coaches, not algorithms',
   'Ironloop pairs you with a certified powerlifting coach who reviews your form videos weekly and adjusts your program by hand.',
   'ironloop.fit', 2018, 3350, true, array['Powerlifting', 'Coaching', 'Form review']),
  ('trailbound', 'Trailbound', 'TB', '#38B000',
   'Trail running routes built from local knowledge',
   'Trailbound crowdsources routes from local trail runners in each city, with real elevation, water-source, and hazard notes -- not just a GPS line.',
   'trailbound.app', 2020, 1760, true, array['Trail running', 'Routes', 'Community']),
  ('momentum-fit', 'Momentum Fit', 'MF', '#FFD166',
   'Habit streaks that don''t punish you for missing a day',
   'Momentum tracks workout streaks with a "grace day" system designed around behavioral research, instead of resetting your streak to zero.',
   'momentumfit.app', 2021, 2680, true, array['Habits', 'Streaks', 'Behavioral design']),
  ('fernweh-yoga', 'Fernweh Yoga', 'FY', '#9D4EDD',
   'Yoga sessions that adapt to your energy level, not a schedule',
   'Fernweh asks how you feel before every session and reshapes the sequence in real time -- gentler on low-energy days, deeper on high-energy ones.',
   'fernwehyoga.com', 2023, 890, true, array['Yoga', 'Adaptive', 'Mindfulness']);

-- ---------------------------------------------------------------------------
-- company_categories
-- ---------------------------------------------------------------------------
insert into public.company_categories (company_id, category_id)
select c.id, cat.id
from public.companies c
join public.categories cat on
  (c.slug in ('flowstack', 'taskwave', 'pathforge', 'cadence-hq', 'sprintly') and cat.slug = 'project-management-tools')
  or (c.slug in ('ember-oak-coffee', 'northbound-coffee', 'basalt-roasting', 'wanderlight-coffee', 'ridgeline-roasters') and cat.slug = 'coffee-roasters')
  or (c.slug in ('corestack-hosting', 'nimbus-cloud', 'anchorpoint-hosting', 'latticework-servers') and cat.slug = 'web-hosting')
  or (c.slug in ('pulseform', 'ironloop', 'trailbound', 'momentum-fit', 'fernweh-yoga') and cat.slug = 'fitness-apps');

-- ---------------------------------------------------------------------------
-- placements
-- ---------------------------------------------------------------------------
insert into public.placements (type, category_id, name, max_sponsored_slots)
select 'category_leaderboard', id, name || ' Leaderboard', 3
from public.categories;

insert into public.placements (type, category_id, name, max_sponsored_slots) values
  ('homepage_featured', null, 'Homepage Featured', 4),
  ('deal_spotlight', null, 'Deal Spotlight', 2);

-- ---------------------------------------------------------------------------
-- bids
-- Flowstack is deliberately seeded outbid on its category leaderboard and
-- leading on homepage_featured, matching the demo scenario the dashboard
-- has told this story with since Phase 1.
-- ---------------------------------------------------------------------------
insert into public.bids (company_id, placement_id, amount, status)
select c.id, p.id, v.amount, 'active'
from (values
  -- Project Management Tools leaderboard
  ('pathforge', 'project-management-tools', 780.00),
  ('flowstack', 'project-management-tools', 650.00),
  ('taskwave', 'project-management-tools', 420.00),
  -- Coffee Roasters leaderboard
  ('northbound-coffee', 'coffee-roasters', 560.00),
  ('ember-oak-coffee', 'coffee-roasters', 410.00),
  ('ridgeline-roasters', 'coffee-roasters', 290.00),
  -- Web Hosting leaderboard
  ('corestack-hosting', 'web-hosting', 910.00),
  ('nimbus-cloud', 'web-hosting', 680.00),
  ('anchorpoint-hosting', 'web-hosting', 430.00),
  -- Fitness Apps leaderboard
  ('ironloop', 'fitness-apps', 640.00),
  ('pulseform', 'fitness-apps', 520.00),
  ('momentum-fit', 'fitness-apps', 310.00)
) as v(company_slug, category_slug, amount)
join public.companies c on c.slug = v.company_slug
join public.categories cat on cat.slug = v.category_slug
join public.placements p on p.type = 'category_leaderboard' and p.category_id = cat.id;

insert into public.bids (company_id, placement_id, amount, status)
select c.id, (select id from public.placements where type = 'homepage_featured'), v.amount, 'active'
from (values
  ('flowstack', 1250.00),
  ('corestack-hosting', 1200.00),
  ('northbound-coffee', 860.00),
  ('ironloop', 750.00)
) as v(company_slug, amount)
join public.companies c on c.slug = v.company_slug;

insert into public.bids (company_id, placement_id, amount, status)
select c.id, (select id from public.placements where type = 'deal_spotlight'), v.amount, 'active'
from (values
  ('nimbus-cloud', 430.00),
  ('fernweh-yoga', 260.00)
) as v(company_slug, amount)
join public.companies c on c.slug = v.company_slug;

-- ---------------------------------------------------------------------------
-- battles (criteria kept as jsonb -- see content_schema migration for why)
-- ---------------------------------------------------------------------------
insert into public.battles (company_a_id, company_b_id, criteria, is_seed)
select
  (select id from public.companies where slug = 'flowstack'),
  (select id from public.companies where slug = 'taskwave'),
  '[
    {"label": "Learning curve", "aValue": "Under 10 minutes", "bValue": "About an hour", "winner": "a"},
    {"label": "GitHub sync", "aValue": "Two-way, real-time", "bValue": "One-way, hourly", "winner": "a"},
    {"label": "Price (5 seats)", "aValue": "€39/mo", "bValue": "€45/mo", "winner": "a"},
    {"label": "Automation rules", "aValue": "Basic", "bValue": "Advanced, cross-tool", "winner": "b"}
  ]'::jsonb,
  true
union all
select
  (select id from public.companies where slug = 'corestack-hosting'),
  (select id from public.companies where slug = 'nimbus-cloud'),
  '[
    {"label": "Deploy method", "aValue": "Git push", "bValue": "Manual VPS setup", "winner": "a"},
    {"label": "Root access", "aValue": "No", "bValue": "Full root", "winner": "b"},
    {"label": "Free tier", "aValue": "Yes, generous", "bValue": "No", "winner": "a"},
    {"label": "Billing", "aValue": "Flat monthly", "bValue": "Hourly, pay-as-you-go", "winner": "tie"}
  ]'::jsonb,
  true
union all
select
  (select id from public.companies where slug = 'northbound-coffee'),
  (select id from public.companies where slug = 'ember-oak-coffee'),
  '[
    {"label": "Format", "aValue": "Cold-brew concentrate", "bValue": "Whole bean", "winner": "tie"},
    {"label": "Batch size", "aValue": "Large", "bValue": "12kg drum", "winner": "b"},
    {"label": "Packaging", "aValue": "Glass, reusable", "bValue": "Compostable bag", "winner": "tie"},
    {"label": "Starting price", "aValue": "€16/box", "bValue": "€14/bag", "winner": "b"}
  ]'::jsonb,
  true
union all
select
  (select id from public.companies where slug = 'ironloop'),
  (select id from public.companies where slug = 'pulseform'),
  '[
    {"label": "Coaching", "aValue": "Human coach, weekly review", "bValue": "Algorithmic, daily", "winner": "a"},
    {"label": "Wearable sync", "aValue": "Manual logging", "bValue": "Automatic, HRV-based", "winner": "b"},
    {"label": "Best for", "aValue": "Powerlifting", "bValue": "General strength", "winner": "tie"},
    {"label": "Price", "aValue": "€79/mo", "bValue": "€19/mo", "winner": "b"}
  ]'::jsonb,
  true
union all
select
  (select id from public.companies where slug = 'pathforge'),
  (select id from public.companies where slug = 'cadence-hq'),
  '[
    {"label": "Core focus", "aValue": "Roadmapping", "bValue": "Async standups", "winner": "tie"},
    {"label": "Stakeholder view", "aValue": "Built-in, polished", "bValue": "Basic export", "winner": "a"},
    {"label": "Setup time", "aValue": "~30 minutes", "bValue": "~5 minutes", "winner": "b"},
    {"label": "Team size fit", "aValue": "10-200 people", "bValue": "3-30 people", "winner": "tie"}
  ]'::jsonb,
  true;

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------
insert into public.deals (company_id, title, discount_label, description, expires_at, claim_count_baseline, is_seed)
select c.id, v.title, v.discount_label, v.description, v.expires_at::timestamptz, v.claim_count, true
from (values
  ('corestack-hosting', '3 months free on any Corestack plan', '3 months free',
   'New accounts get their first three months free on the Pro or Team plan, no card required upfront.',
   '2026-09-15T23:59:00Z', 412),
  ('northbound-coffee', '20% off your first Northbound box', '20% off',
   'First-time subscribers save 20% on any cold-brew concentrate box, code applied at checkout.',
   '2026-09-01T23:59:00Z', 268),
  ('ironloop', 'First month of coaching free', 'First month free',
   'Get matched with a certified powerlifting coach and skip your first month''s fee entirely.',
   '2026-08-31T23:59:00Z', 156),
  ('momentum-fit', '30% off the annual plan', '30% off annual',
   'Lock in a full year of Momentum Fit at 30% off -- includes the grace-day streak system.',
   '2026-09-30T23:59:00Z', 731),
  ('ember-oak-coffee', 'Free shipping on orders over €25', 'Free shipping',
   'Standing offer: any order over €25 ships free across the EU, no code needed.',
   '2026-12-31T23:59:00Z', 1043),
  ('nimbus-cloud', '2 months free on annual VPS plans', '2 months free',
   'Prepay a year on any VPS tier and Nimbus adds two extra months automatically.',
   '2026-09-10T23:59:00Z', 189),
  ('fernweh-yoga', '30-day trial instead of the usual 14', 'Extended trial',
   'Sign up through Outbid and get a full 30 days of adaptive yoga sessions before you''re charged.',
   '2026-09-20T23:59:00Z', 97),
  ('anchorpoint-hosting', 'Free migration + first month free', 'Free migration',
   'Anchorpoint''s team migrates your WordPress site by hand at no cost, plus your first month is free.',
   '2026-09-05T23:59:00Z', 214)
) as v(company_slug, title, discount_label, description, expires_at, claim_count)
join public.companies c on c.slug = v.company_slug;

-- ---------------------------------------------------------------------------
-- trends
-- ---------------------------------------------------------------------------
insert into public.trends (title, summary, trend_score, published_at, is_seed) values
  ('Async standups are quietly replacing the daily call',
   'More remote teams are swapping the 15-minute video standup for a two-minute written check-in -- and reporting fewer, not more, missed updates.',
   87, '2026-08-19T08:00:00Z', true),
  ('Cold-brew concentrate subscriptions are outgrowing whole bean',
   'Search interest and reorder rates for concentrate formats have overtaken traditional whole-bean subscriptions for the first time this year.',
   74, '2026-08-17T08:00:00Z', true),
  ('Bare-metal hosting is making a comeback as cloud bills spike',
   'Teams burned by unpredictable egress fees are moving steady workloads back to dedicated boxes with flat, predictable pricing.',
   69, '2026-08-14T08:00:00Z', true),
  ('Recovery-aware training is the fastest-growing fitness category',
   'Apps that adjust workouts based on sleep and HRV data are seeing the steepest month-over-month growth of any fitness app segment tracked here.',
   91, '2026-08-20T08:00:00Z', true),
  ('Small teams are ditching heavyweight PM tools for lighter ones',
   'Vote activity on lightweight, dev-friendly planners has climbed steadily as teams cite setup time as their top frustration with legacy tools.',
   65, '2026-08-12T08:00:00Z', true),
  ('Carbon-neutral roasting is becoming the baseline, not a bonus',
   'Roasters advertising offset-matched energy use are seeing higher first-time conversion, according to vote and save activity across the category.',
   58, '2026-08-10T08:00:00Z', true);

insert into public.trend_companies (trend_id, company_id)
select t.id, c.id from public.trends t join public.companies c
  on t.title = 'Async standups are quietly replacing the daily call' and c.slug = 'cadence-hq'
union all
select t.id, c.id from public.trends t join public.companies c
  on t.title = 'Cold-brew concentrate subscriptions are outgrowing whole bean' and c.slug = 'northbound-coffee'
union all
select t.id, c.id from public.trends t join public.companies c
  on t.title = 'Bare-metal hosting is making a comeback as cloud bills spike' and c.slug in ('latticework-servers', 'nimbus-cloud')
union all
select t.id, c.id from public.trends t join public.companies c
  on t.title = 'Recovery-aware training is the fastest-growing fitness category' and c.slug = 'pulseform'
union all
select t.id, c.id from public.trends t join public.companies c
  on t.title = 'Small teams are ditching heavyweight PM tools for lighter ones' and c.slug in ('flowstack', 'sprintly')
union all
select t.id, c.id from public.trends t join public.companies c
  on t.title = 'Carbon-neutral roasting is becoming the baseline, not a bonus' and c.slug = 'ridgeline-roasters';
