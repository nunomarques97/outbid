#!/usr/bin/env node
/**
 * Phase 40 — Initial Real-Company Discovery Dataset generator.
 *
 * Generates supabase/seed-data/phase40_real_companies.sql from the curated
 * COMPANIES array below. Run with `node scripts/generate-phase40-seed.mjs`
 * whenever the dataset needs to change, then apply the generated SQL to
 * OUTBID-STAGING via `npx supabase db query --linked -f
 * supabase/seed-data/phase40_real_companies.sql` (never production).
 *
 * This is a STAGING-ONLY discovery dataset: every company is real and
 * public-facing, but is intentionally left unowned and unverified in
 * Repcastr — it behaves exactly like a real business that hasn't claimed
 * its profile yet. No company here is implied to be verified, endorsed,
 * or partnered with Repcastr. Facts (website, founding year, description)
 * are drawn from public knowledge of well-known, unambiguous companies —
 * anything not confidently known was left out rather than guessed.
 *
 * Idempotent: the generated SQL upserts by slug (ON CONFLICT DO NOTHING for
 * the company row, and only assigns categories the first time), so re-running
 * it against a database that already has these rows is a safe no-op, not a
 * duplicate-creator. It never touches company_members, company_claims, or
 * company_verifications — those stay exactly as the schema's own triggers
 * leave them (unowned, unverified) for a freshly inserted company.
 */

import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {{ name: string, website: string, founded: number, categories: string[], tagline: string, description: string }} SeedCompany
 * categories are category `slug`s from the existing `categories` table (1 or 2 max).
 */

/** @type {SeedCompany[]} */
const COMPANIES = [
  // Automotive
  { name: 'Toyota', website: 'toyota.com', founded: 1937, categories: ['automotive'], tagline: 'Japanese multinational automotive manufacturer', description: 'One of the world\'s largest automakers, producing passenger cars, trucks, and hybrid vehicles globally.' },
  { name: 'Ford Motor Company', website: 'ford.com', founded: 1903, categories: ['automotive'], tagline: 'American multinational automaker', description: 'A pioneer of the moving assembly line, Ford manufactures cars, trucks, and SUVs worldwide.' },
  { name: 'Tesla', website: 'tesla.com', founded: 2003, categories: ['automotive', 'technology'], tagline: 'Electric vehicle and clean energy company', description: 'Designs and manufactures electric vehicles, battery energy storage, and solar products.' },
  { name: 'BMW', website: 'bmw.com', founded: 1916, categories: ['automotive'], tagline: 'German luxury vehicle and motorcycle manufacturer', description: 'Produces premium automobiles and motorcycles, headquartered in Munich, Germany.' },

  // Beauty & Personal Care
  { name: "L'Oréal", website: 'loreal.com', founded: 1909, categories: ['shopping'], tagline: 'French multinational cosmetics company', description: 'One of the world\'s largest cosmetics companies, producing skincare, haircare, makeup, and fragrance.' },
  { name: 'Sephora', website: 'sephora.com', founded: 1969, categories: ['shopping'], tagline: 'Multinational beauty retailer', description: 'A retail chain selling cosmetics, skincare, and fragrance from hundreds of brands.' },
  { name: 'The Body Shop', website: 'thebodyshop.com', founded: 1976, categories: ['shopping'], tagline: 'British cosmetics and skincare retailer', description: 'Known for naturally-inspired, ethically-sourced beauty and personal care products.' },
  { name: 'Estée Lauder', website: 'esteelauder.com', founded: 1946, categories: ['shopping'], tagline: 'American skincare, makeup, and fragrance company', description: 'A global manufacturer and marketer of prestige skincare, makeup, and fragrance products.' },

  // Business & Professional Services
  { name: 'Deloitte', website: 'deloitte.com', founded: 1845, categories: ['business-professional-services'], tagline: 'Multinational professional services network', description: 'Provides audit, consulting, tax, and advisory services to organizations worldwide.' },
  { name: 'McKinsey & Company', website: 'mckinsey.com', founded: 1926, categories: ['business-professional-services'], tagline: 'Global management consulting firm', description: 'Advises businesses, governments, and institutions on strategy and operations.' },
  { name: 'Accenture', website: 'accenture.com', founded: 1989, categories: ['business-professional-services', 'technology'], tagline: 'Global professional services company', description: 'Provides consulting, technology, and outsourcing services across industries worldwide.' },
  { name: 'ADP', website: 'adp.com', founded: 1949, categories: ['business-professional-services'], tagline: 'Human capital management and payroll services company', description: 'Provides payroll processing, HR, and workforce management services to businesses.' },

  // Coffee
  { name: 'Starbucks', website: 'starbucks.com', founded: 1971, categories: ['food-dining'], tagline: 'American multinational coffeehouse chain', description: 'Operates coffeehouses worldwide, roasting and selling coffee beans and beverages.' },
  { name: "Dunkin'", website: 'dunkindonuts.com', founded: 1950, categories: ['food-dining'], tagline: 'American coffee and baked goods chain', description: 'A quick-service chain known for coffee, donuts, and breakfast sandwiches.' },
  { name: "Peet's Coffee", website: 'peets.com', founded: 1966, categories: ['food-dining'], tagline: 'American specialty coffee roaster and retailer', description: 'Founded in Berkeley, California, known for dark-roasted specialty coffee.' },
  { name: 'Costa Coffee', website: 'costacoffee.com', founded: 1971, categories: ['food-dining'], tagline: 'British multinational coffeehouse chain', description: 'A coffeehouse chain founded in London, with locations across many countries.' },
  { name: 'Blue Bottle Coffee', website: 'bluebottlecoffee.com', founded: 2002, categories: ['food-dining'], tagline: 'American specialty coffee roaster', description: 'A specialty coffee company known for single-origin beans and cafes worldwide.' },

  // Education
  { name: 'Coursera', website: 'coursera.org', founded: 2012, categories: ['education', 'technology'], tagline: 'Online learning platform', description: 'Partners with universities and companies to offer online courses, certificates, and degrees.' },
  { name: 'Khan Academy', website: 'khanacademy.org', founded: 2008, categories: ['education', 'business-professional-services'], tagline: 'Nonprofit educational organization', description: 'Provides free online courses, lessons, and practice exercises across many subjects.' },
  { name: 'Duolingo', website: 'duolingo.com', founded: 2011, categories: ['education', 'technology'], tagline: 'Language-learning app and platform', description: 'Offers free, gamified language courses through a mobile app and website.' },
  { name: 'Udemy', website: 'udemy.com', founded: 2010, categories: ['education'], tagline: 'Online learning marketplace', description: 'An online marketplace where instructors create courses on a wide range of skills.' },
  { name: 'MasterClass', website: 'masterclass.com', founded: 2015, categories: ['education'], tagline: 'Online education subscription platform', description: 'Offers video lessons taught by well-known instructors across creative and professional fields.' },

  // Entertainment
  { name: 'Netflix', website: 'netflix.com', founded: 1997, categories: ['entertainment'], tagline: 'Streaming entertainment service', description: 'A subscription streaming service offering films, series, and documentaries worldwide.' },
  { name: 'The Walt Disney Company', website: 'disney.com', founded: 1923, categories: ['entertainment', 'home-living'], tagline: 'American mass media and entertainment conglomerate', description: 'Produces films, television, and operates theme parks and streaming services.' },
  { name: 'Spotify', website: 'spotify.com', founded: 2006, categories: ['entertainment'], tagline: 'Audio streaming and media service', description: 'A digital music, podcast, and audio streaming platform available worldwide.' },
  { name: 'Warner Bros.', website: 'warnerbros.com', founded: 1923, categories: ['entertainment'], tagline: 'American film and entertainment studio', description: 'A major film and television studio producing movies, series, and animation.' },
  { name: 'Universal Pictures', website: 'universalpictures.com', founded: 1912, categories: ['entertainment'], tagline: 'American film production and distribution studio', description: 'One of the oldest film studios in the world, producing and distributing motion pictures.' },

  // Fashion
  { name: 'Nike', website: 'nike.com', founded: 1964, categories: ['shopping', 'entertainment'], tagline: 'American athletic footwear and apparel company', description: 'Designs, manufactures, and markets athletic footwear, apparel, and equipment worldwide.' },
  { name: 'Zara', website: 'zara.com', founded: 1975, categories: ['shopping'], tagline: 'Spanish fast-fashion clothing retailer', description: 'A clothing and accessories retailer, part of the Inditex group, with stores worldwide.' },
  { name: 'H&M', website: 'hm.com', founded: 1947, categories: ['shopping'], tagline: 'Swedish multinational clothing retailer', description: 'Sells clothing and accessories for men, women, teenagers, and children globally.' },
  { name: "Levi's", website: 'levi.com', founded: 1853, categories: ['shopping'], tagline: 'American clothing company known for denim', description: 'Known for inventing blue jeans, now selling denim and casual apparel worldwide.' },
  { name: 'Adidas', website: 'adidas.com', founded: 1949, categories: ['shopping', 'entertainment'], tagline: 'German multinational sportswear manufacturer', description: 'Designs and manufactures athletic shoes, apparel, and accessories worldwide.' },

  // Finance
  { name: 'Visa', website: 'visa.com', founded: 1958, categories: ['finance'], tagline: 'Multinational payments technology company', description: 'Operates one of the world\'s largest electronic payment networks.' },
  { name: 'PayPal', website: 'paypal.com', founded: 1998, categories: ['finance', 'technology'], tagline: 'Online payments platform', description: 'Enables individuals and businesses to send and receive money online.' },
  { name: 'American Express', website: 'americanexpress.com', founded: 1850, categories: ['finance'], tagline: 'American multinational financial services company', description: 'Provides charge and credit card products alongside travel and financial services.' },
  { name: 'Goldman Sachs', website: 'goldmansachs.com', founded: 1869, categories: ['finance'], tagline: 'American multinational investment bank', description: 'Provides investment banking, securities, and investment management services.' },
  { name: 'Mastercard', website: 'mastercard.com', founded: 1966, categories: ['finance'], tagline: 'Multinational payments technology company', description: 'Operates a global payments network connecting banks, merchants, and cardholders.' },

  // Food & Dining
  { name: "McDonald's", website: 'mcdonalds.com', founded: 1940, categories: ['food-dining'], tagline: 'American fast food restaurant chain', description: 'One of the world\'s largest fast food chains, serving burgers, fries, and more.' },
  { name: "Domino's Pizza", website: 'dominos.com', founded: 1960, categories: ['food-dining'], tagline: 'American multinational pizza restaurant chain', description: 'A pizza delivery and carryout chain operating in many countries.' },
  { name: 'Chipotle Mexican Grill', website: 'chipotle.com', founded: 1993, categories: ['food-dining'], tagline: 'American fast casual restaurant chain', description: 'Serves burritos, bowls, and tacos made with a focus on responsibly-sourced ingredients.' },
  { name: 'Subway', website: 'subway.com', founded: 1965, categories: ['food-dining'], tagline: 'American multinational sandwich chain', description: 'One of the world\'s largest fast food chains, specializing in submarine sandwiches.' },
  { name: 'KFC', website: 'kfc.com', founded: 1930, categories: ['food-dining'], tagline: 'American fast food chain specializing in fried chicken', description: 'A fried chicken fast food chain with restaurants in over 140 countries.' },

  // Health
  { name: 'CVS Health', website: 'cvshealth.com', founded: 1963, categories: ['health-fitness'], tagline: 'American healthcare and pharmacy company', description: 'Operates pharmacies, health clinics, and health insurance services across the US.' },
  { name: 'Johnson & Johnson', website: 'jnj.com', founded: 1886, categories: ['health-fitness'], tagline: 'American multinational healthcare company', description: 'Develops pharmaceuticals, medical devices, and consumer health products.' },
  { name: 'Pfizer', website: 'pfizer.com', founded: 1849, categories: ['health-fitness'], tagline: 'American multinational pharmaceutical company', description: 'Researches, develops, and manufactures medicines and vaccines.' },
  { name: 'Mayo Clinic', website: 'mayoclinic.org', founded: 1889, categories: ['health-fitness', 'business-professional-services'], tagline: 'Nonprofit academic medical center', description: 'A nonprofit medical practice and research group focused on complex patient care.' },

  // Health & Fitness
  { name: 'Peloton', website: 'onepeloton.com', founded: 2012, categories: ['health-fitness', 'technology'], tagline: 'Interactive fitness equipment and media company', description: 'Sells connected exercise equipment paired with live and on-demand fitness classes.' },
  { name: 'Planet Fitness', website: 'planetfitness.com', founded: 1992, categories: ['health-fitness'], tagline: 'American gym franchise', description: 'Operates a large chain of fitness centers across the United States and beyond.' },
  { name: 'Fitbit', website: 'fitbit.com', founded: 2007, categories: ['health-fitness', 'technology'], tagline: 'Wearable fitness technology company', description: 'Makes wearable devices and software that track fitness and health metrics.' },
  { name: 'Strava', website: 'strava.com', founded: 2009, categories: ['health-fitness'], tagline: 'Fitness tracking app for athletes', description: 'A social fitness platform for tracking running, cycling, and other activities.' },
  { name: 'Gymshark', website: 'gymshark.com', founded: 2012, categories: ['health-fitness', 'shopping'], tagline: 'British fitness apparel brand', description: 'Designs and sells gym wear and athletic apparel, sold primarily online.' },

  // Home & Living
  { name: 'IKEA', website: 'ikea.com', founded: 1943, categories: ['home-living'], tagline: 'Swedish multinational furniture retailer', description: 'Designs and sells ready-to-assemble furniture, kitchenware, and home accessories.' },
  { name: 'Williams Sonoma', website: 'williams-sonoma.com', founded: 1956, categories: ['home-living'], tagline: 'American home goods retailer', description: 'Sells cookware, kitchenware, and home furnishings across several retail brands.' },
  { name: 'Wayfair', website: 'wayfair.com', founded: 2002, categories: ['home-living', 'shopping'], tagline: 'American e-commerce home goods company', description: 'An online retailer of furniture and home goods, operating primarily through its website.' },
  { name: 'Dyson', website: 'dyson.com', founded: 1991, categories: ['home-living', 'technology'], tagline: 'British technology company', description: 'Designs and manufactures vacuum cleaners, fans, and other household appliances.' },

  // Kids & Family
  { name: 'LEGO', website: 'lego.com', founded: 1932, categories: ['home-living'], tagline: 'Danish toy production company', description: 'Manufactures the LEGO brand of plastic construction toys and related media.' },
  { name: 'Mattel', website: 'mattel.com', founded: 1945, categories: ['home-living'], tagline: 'American multinational toy manufacturer', description: 'Designs and manufactures toys including Barbie, Hot Wheels, and Fisher-Price.' },
  { name: 'Hasbro', website: 'hasbro.com', founded: 1923, categories: ['home-living'], tagline: 'American multinational toy and game company', description: 'Produces toys, board games, and entertainment properties for children and families.' },
  { name: 'Toys"R"Us', website: 'toysrus.com', founded: 1948, categories: ['home-living', 'shopping'], tagline: 'American toy and juvenile products retailer', description: 'A retail chain specializing in toys, games, and children\'s products.' },

  // Media
  { name: 'The New York Times', website: 'nytimes.com', founded: 1851, categories: ['media'], tagline: 'American daily newspaper', description: 'A widely-circulated newspaper and digital news publisher based in New York City.' },
  { name: 'BBC', website: 'bbc.com', founded: 1922, categories: ['media'], tagline: 'British public service broadcaster', description: 'Produces news, television, and radio programming broadcast around the world.' },
  { name: 'CNN', website: 'cnn.com', founded: 1980, categories: ['media'], tagline: 'American news television channel', description: 'A cable news network providing 24-hour news coverage worldwide.' },
  { name: 'The Washington Post', website: 'washingtonpost.com', founded: 1877, categories: ['media'], tagline: 'American daily newspaper', description: 'A major newspaper based in Washington, D.C., covering national and world news.' },

  // Nonprofit & Community
  { name: 'American Red Cross', website: 'redcross.org', founded: 1881, categories: ['business-professional-services'], tagline: 'Humanitarian nonprofit organization', description: 'Provides emergency assistance, disaster relief, and disaster preparedness education.' },
  { name: 'World Wildlife Fund', website: 'worldwildlife.org', founded: 1961, categories: ['business-professional-services'], tagline: 'International conservation organization', description: 'Works on wildlife conservation and the reduction of humanity\'s environmental footprint.' },
  { name: 'Habitat for Humanity', website: 'habitat.org', founded: 1976, categories: ['business-professional-services', 'real-estate'], tagline: 'Nonprofit housing organization', description: 'Builds and rehabilitates affordable housing in partnership with families in need.' },
  { name: 'UNICEF', website: 'unicef.org', founded: 1946, categories: ['business-professional-services', 'home-living'], tagline: "United Nations agency for children's welfare", description: 'Provides humanitarian and developmental aid to children worldwide.' },

  // Pets
  { name: 'Chewy', website: 'chewy.com', founded: 2011, categories: ['home-living', 'shopping'], tagline: 'American online pet retailer', description: 'An e-commerce company selling pet food, supplies, and pharmacy products.' },
  { name: 'Petco', website: 'petco.com', founded: 1965, categories: ['home-living'], tagline: 'American pet supply retailer', description: 'Operates pet stores selling food, supplies, and health services for pets.' },
  { name: 'PetSmart', website: 'petsmart.com', founded: 1986, categories: ['home-living'], tagline: 'North American pet supply retailer', description: 'A large pet retail chain offering pet products, grooming, and services.' },
  { name: 'Blue Buffalo', website: 'bluebuffalo.com', founded: 2002, categories: ['home-living'], tagline: 'American pet food company', description: 'Manufactures natural pet food for dogs and cats.' },

  // Real Estate
  { name: 'Zillow', website: 'zillow.com', founded: 2006, categories: ['real-estate', 'technology'], tagline: 'American online real estate marketplace', description: 'An online platform for buying, selling, renting, and financing real estate.' },
  { name: 'Redfin', website: 'redfin.com', founded: 2004, categories: ['real-estate', 'technology'], tagline: 'American real estate brokerage', description: 'A technology-powered real estate brokerage offering online home search and agent services.' },
  { name: 'RE/MAX', website: 'remax.com', founded: 1973, categories: ['real-estate'], tagline: 'American multinational real estate franchise', description: 'A franchised real estate brokerage network operating in many countries.' },
  { name: 'CBRE', website: 'cbre.com', founded: 1906, categories: ['real-estate', 'business-professional-services'], tagline: 'Commercial real estate services company', description: 'Provides commercial real estate services and investment management worldwide.' },

  // Shopping
  { name: 'Amazon', website: 'amazon.com', founded: 1994, categories: ['shopping', 'technology'], tagline: 'American multinational e-commerce and technology company', description: 'An e-commerce and cloud computing company offering retail, streaming, and web services.' },
  { name: 'Walmart', website: 'walmart.com', founded: 1962, categories: ['shopping'], tagline: 'American multinational retail corporation', description: 'Operates a chain of hypermarkets, discount department stores, and grocery stores.' },
  { name: 'Target', website: 'target.com', founded: 1962, categories: ['shopping'], tagline: 'American retail corporation', description: 'Operates a chain of general merchandise and grocery discount stores.' },
  { name: 'eBay', website: 'ebay.com', founded: 1995, categories: ['shopping', 'technology'], tagline: 'American multinational e-commerce company', description: 'Operates an online marketplace connecting buyers and sellers worldwide.' },
  { name: 'Costco', website: 'costco.com', founded: 1983, categories: ['shopping'], tagline: 'American multinational membership warehouse club', description: 'Operates membership-only warehouse clubs selling goods in bulk.' },

  // Software
  { name: 'Microsoft', website: 'microsoft.com', founded: 1975, categories: ['technology'], tagline: 'American multinational technology corporation', description: 'Develops, licenses, and sells computer software, consumer electronics, and cloud services.' },
  { name: 'Adobe', website: 'adobe.com', founded: 1982, categories: ['technology'], tagline: 'American multinational software company', description: 'Creates software for creative work, document management, and digital marketing.' },
  { name: 'Salesforce', website: 'salesforce.com', founded: 1999, categories: ['technology', 'business-professional-services'], tagline: 'American cloud-based software company', description: 'Provides customer relationship management (CRM) software and applications.' },
  { name: 'Slack', website: 'slack.com', founded: 2013, categories: ['technology'], tagline: 'Business communication platform', description: 'A messaging and collaboration platform used by teams and organizations.' },
  { name: 'Atlassian', website: 'atlassian.com', founded: 2002, categories: ['technology'], tagline: 'Australian enterprise software company', description: 'Develops products for software development, project management, and collaboration.' },

  // Sports
  { name: 'ESPN', website: 'espn.com', founded: 1979, categories: ['entertainment', 'media'], tagline: 'American sports media company', description: 'Broadcasts and publishes sports programming, news, and analysis.' },
  { name: 'Under Armour', website: 'underarmour.com', founded: 1996, categories: ['entertainment', 'shopping'], tagline: 'American sports apparel and equipment company', description: 'Designs and manufactures athletic apparel, footwear, and accessories.' },
  { name: 'Fanatics', website: 'fanatics.com', founded: 1995, categories: ['entertainment', 'shopping'], tagline: 'American licensed sports merchandise retailer', description: 'Sells licensed sports merchandise, apparel, and trading cards online.' },
  { name: 'Decathlon', website: 'decathlon.com', founded: 1976, categories: ['entertainment'], tagline: 'French sporting goods retailer', description: 'Designs and sells sporting goods and equipment for a wide range of sports.' },

  // Technology
  { name: 'Apple', website: 'apple.com', founded: 1976, categories: ['technology'], tagline: 'American multinational technology company', description: 'Designs and manufactures consumer electronics, software, and online services.' },
  { name: 'Google', website: 'google.com', founded: 1998, categories: ['technology'], tagline: 'American multinational technology company', description: 'Provides internet search, cloud computing, advertising, and software services.' },
  { name: 'Meta', website: 'meta.com', founded: 2004, categories: ['technology'], tagline: 'American multinational technology conglomerate', description: 'Builds social technology, including Facebook, Instagram, and virtual reality products.' },
  { name: 'Samsung Electronics', website: 'samsung.com', founded: 1969, categories: ['technology'], tagline: 'South Korean multinational electronics company', description: 'Manufactures consumer electronics, semiconductors, and mobile devices.' },
  { name: 'IBM', website: 'ibm.com', founded: 1911, categories: ['technology'], tagline: 'American multinational technology corporation', description: 'Provides computer hardware, software, and consulting services worldwide.' },

  // Travel
  { name: 'Airbnb', website: 'airbnb.com', founded: 2008, categories: ['travel', 'technology'], tagline: 'American online marketplace for lodging', description: 'An online platform connecting travelers with hosts offering short-term lodging.' },
  { name: 'Booking.com', website: 'booking.com', founded: 1996, categories: ['travel', 'technology'], tagline: 'Dutch online travel agency', description: 'An online platform for booking accommodation, flights, and travel experiences.' },
  { name: 'Expedia', website: 'expedia.com', founded: 1996, categories: ['travel'], tagline: 'American online travel agency', description: 'Provides online booking for flights, hotels, car rentals, and vacation packages.' },
  { name: 'TripAdvisor', website: 'tripadvisor.com', founded: 2000, categories: ['travel'], tagline: 'American online travel guidance platform', description: 'Provides traveler reviews and booking tools for hotels, restaurants, and attractions.' },
]

const LOGO_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#85C1E9', '#F8B739', '#52BE80', '#EC7063', '#5DADE2', '#F1948A', '#48C9B0',
  '#AF7AC5', '#F0B27A', '#7FB3D5', '#73C6B6', '#D7BDE2', '#A9CCE3',
]

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents (Estée -> Estee)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function initials(name) {
  const words = name.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
  const significant = words.filter((w) => !['the', 'of', 'and', 'company'].includes(w.toLowerCase()))
  const source = significant.length > 0 ? significant : words
  return source.slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'CO'
}

function sqlString(s) {
  return `'${s.replace(/'/g, "''")}'`
}

/**
 * Queries the currently-linked Supabase project's REAL categories table
 * (slug, is_archived) via the Supabase CLI — not a hardcoded mirror of the
 * schema, which is exactly the class of bug that caused Phase 40 to
 * originally assign 43 of 98 companies to categories that had already been
 * archived by the taxonomy-v2 migration (see
 * 20260823140000_backfill_missing_taxonomy_categories.sql's commit message).
 * A stale hardcoded active-category list could silently drift out of sync
 * with the database the same way; this can't, because it asks the database
 * directly every time it runs.
 */
function fetchLiveCategoryState() {
  const dir = mkdtempSync(join(tmpdir(), 'phase40-cat-check-'))
  const sqlFile = join(dir, 'query.sql')
  writeFileSync(sqlFile, 'select slug, is_archived from categories;', 'utf-8')
  try {
    // shell: true is required for npx to resolve on Windows here. Safe in this
    // context: every argument is internally generated (a fixed subcommand list
    // plus an OS-temp path from mkdtempSync), never user input.
    const raw = execFileSync('npx', ['supabase', 'db', 'query', '--linked', '--output', 'json', '-f', sqlFile], {
      encoding: 'utf-8',
      shell: true,
    })
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Could not parse category query output:\n${raw}`)
    const parsed = JSON.parse(match[0])
    const active = new Set()
    const all = new Set()
    for (const row of parsed.rows) {
      all.add(row.slug)
      if (!row.is_archived) active.add(row.slug)
    }
    return { active, all }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Fails loudly (throws, non-zero exit) rather than silently generating SQL
 * that would insert an invalid or archived category link — the whole point
 * of this check existing. Reports every offending company/category pair in
 * one error rather than stopping at the first, so a bulk fix (like the
 * Phase 40 correction) doesn't need N re-runs to find all N problems.
 */
function validateCategoriesAgainstLiveSchema() {
  const { active, all } = fetchLiveCategoryState()
  const problems = []
  for (const c of COMPANIES) {
    for (const cat of c.categories) {
      if (!all.has(cat)) problems.push(`${c.name}: category '${cat}' does not exist in the live database`)
      else if (!active.has(cat)) problems.push(`${c.name}: category '${cat}' is archived — pick an active category instead`)
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Refusing to generate seed SQL — ${problems.length} categor${problems.length === 1 ? 'y' : 'ies'} ` +
      `reference invalid/archived categories against the live schema:\n` +
      problems.map((p) => `  - ${p}`).join('\n'),
    )
  }
}

function generate() {
  const seen = new Set()
  const lines = []
  lines.push('-- Phase 40: Initial Real-Company Discovery Dataset')
  lines.push('-- Generated by scripts/generate-phase40-seed.mjs — do not hand-edit, regenerate instead.')
  lines.push('-- STAGING ONLY. Every company is real/public-facing, seeded unowned and unverified.')
  lines.push('-- Idempotent: ON CONFLICT (slug) DO NOTHING, categories only assigned on first insert.')
  lines.push('')
  lines.push('begin;')
  lines.push('')

  for (const c of COMPANIES) {
    if (c.categories.length < 1 || c.categories.length > 2) {
      throw new Error(`${c.name}: must have 1-2 categories, got ${c.categories.length}`)
    }
    const slug = slugify(c.name)
    if (seen.has(slug)) throw new Error(`Duplicate slug: ${slug} (${c.name})`)
    seen.add(slug)
    const init = initials(c.name)
    const color = LOGO_PALETTE[lines.length % LOGO_PALETTE.length]

    lines.push(`-- ${c.name}`)
    lines.push(
      `insert into companies (slug, name, initials, logo_color, tagline, description, website, founded_year, organic_votes_baseline, is_seed) values (` +
      `${sqlString(slug)}, ${sqlString(c.name)}, ${sqlString(init)}, ${sqlString(color)}, ${sqlString(c.tagline)}, ${sqlString(c.description)}, ${sqlString(c.website)}, ${c.founded}, 0, true` +
      `) on conflict (slug) do nothing;`,
    )
    lines.push(
      `insert into company_categories (company_id, category_id) ` +
      `select co.id, cat.id from companies co, categories cat ` +
      `where co.slug = ${sqlString(slug)} and cat.slug in (${c.categories.map(sqlString).join(', ')}) ` +
      `on conflict do nothing;`,
    )
    lines.push('')
  }

  lines.push('commit;')
  lines.push('')
  return { sql: lines.join('\n'), count: COMPANIES.length }
}

validateCategoriesAgainstLiveSchema()
const { sql, count } = generate()
const outPath = join(__dirname, '..', 'supabase', 'seed-data', 'phase40_real_companies.sql')
writeFileSync(outPath, sql, 'utf-8')
console.log(`Validated against the live schema (linked project) — no archived/missing categories referenced.`)
console.log(`Generated ${outPath} with ${count} companies.`)
