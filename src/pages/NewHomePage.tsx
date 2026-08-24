import { Hero } from '@/features/home/Hero'
import { TopBiddersSection } from '@/features/home/TopBiddersSection'
import { BidForPlacementCta } from '@/features/home/BidForPlacementCta'
import { CreateCompanyCta } from '@/features/home/CreateCompanyCta'
import { HowItWorks } from '@/features/home/HowItWorks'
import { SponsoredMechanicShowcase } from '@/features/home/SponsoredMechanicShowcase'
import { RankingsPreview } from '@/features/home/RankingsPreview'
import { TrendingSection } from '@/features/home/TrendingSection'
import { TopRatedSection } from '@/features/home/TopRatedSection'
import { BattleOfTheDay } from '@/features/home/BattleOfTheDay'
import { DealsSection } from '@/features/home/DealsSection'

/**
 * New-style homepage — same sections and data as legacy, reordered to lead
 * with the requested priority: discover/rankings + Top Bidders up front,
 * then the business/bidding CTAs, then category ranking discovery, with
 * the remaining existing sections preserved below.
 */
export function NewHomePage() {
  return (
    <>
      <Hero />
      <TopBiddersSection />
      <CreateCompanyCta />
      <BidForPlacementCta />
      <RankingsPreview />
      <HowItWorks />
      <SponsoredMechanicShowcase />
      <TrendingSection />
      <TopRatedSection />
      <BattleOfTheDay />
      <DealsSection />
    </>
  )
}
