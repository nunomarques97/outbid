import { Hero } from '@/features/home/Hero'
import { TopBiddersSection } from '@/features/home/TopBiddersSection'
import { CreateCompanyCta } from '@/features/home/CreateCompanyCta'
import { HowItWorks } from '@/features/home/HowItWorks'
import { SponsoredMechanicShowcase } from '@/features/home/SponsoredMechanicShowcase'
import { RankingsPreview } from '@/features/home/RankingsPreview'
import { TrendingSection } from '@/features/home/TrendingSection'
import { TopRatedSection } from '@/features/home/TopRatedSection'
import { BattleOfTheDay } from '@/features/home/BattleOfTheDay'
import { DealsSection } from '@/features/home/DealsSection'

export function HomePage() {
  return (
    <>
      <Hero />
      <CreateCompanyCta />
      <TopBiddersSection />
      <HowItWorks />
      <SponsoredMechanicShowcase />
      <RankingsPreview />
      <TrendingSection />
      <TopRatedSection />
      <BattleOfTheDay />
      <DealsSection />
    </>
  )
}
