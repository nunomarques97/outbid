import { Hero } from '@/features/home/Hero'
import { HowItWorks } from '@/features/home/HowItWorks'
import { TrendingSection } from '@/features/home/TrendingSection'
import { RankingsPreview } from '@/features/home/RankingsPreview'
import { BattleOfTheDay } from '@/features/home/BattleOfTheDay'
import { DealsSection } from '@/features/home/DealsSection'
import { SponsoredMechanicShowcase } from '@/features/home/SponsoredMechanicShowcase'

export function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <TrendingSection />
      <SponsoredMechanicShowcase />
      <RankingsPreview />
      <BattleOfTheDay />
      <DealsSection />
    </>
  )
}
