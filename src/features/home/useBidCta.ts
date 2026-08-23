import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany } from '@/lib/supabase/hooks'
import { getBidCtaDestination } from '@/lib/advertiserRouting'

/**
 * Shared click behavior for every "start bidding" entry point (the Hero
 * button, the BidForPlacementCta card below Top Bidders, and any future
 * one) — one place for the auth/company routing logic so every bid CTA
 * behaves identically. Signed out opens the normal AuthDialog (the caller
 * renders it, wired to the returned open/onOpenChange); signed in with no
 * company goes to company creation; signed in with a company goes straight
 * to the Bids tab of their own dashboard.
 */
export function useBidCta() {
  const { user, isConfigured } = useAuth()
  const companyQuery = useMyCompany()
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)

  function handleClick() {
    const destination = getBidCtaDestination({ signedIn: isConfigured && Boolean(user), hasCompany: Boolean(companyQuery.data) })
    if (destination === 'auth') {
      setAuthOpen(true)
      return
    }
    navigate(destination === 'dashboard-bids' ? '/dashboard?tab=bids' : '/dashboard/new')
  }

  return { handleClick, authOpen, setAuthOpen }
}
