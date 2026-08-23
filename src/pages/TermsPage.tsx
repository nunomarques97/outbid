import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { SUPPORT_EMAIL, PRIVACY_EMAIL } from '@/lib/contact'

const SECTIONS = [
  { id: 'acceptance', title: 'Acceptance of these terms' },
  { id: 'accounts', title: 'Accounts' },
  { id: 'reviews-votes', title: 'Reviews & voting' },
  { id: 'companies', title: 'Company profiles' },
  { id: 'sponsored', title: 'Sponsored placement & bidding' },
  { id: 'deals', title: 'Deals' },
  { id: 'payments', title: 'Payments' },
  { id: 'prohibited', title: 'Prohibited conduct' },
  { id: 'content', title: 'Content ownership' },
  { id: 'moderation', title: 'Moderation & enforcement' },
  { id: 'termination', title: 'Suspension & termination' },
  { id: 'third-parties', title: 'Third-party services' },
  { id: 'disclaimers', title: 'Disclaimers & liability' },
  { id: 'law', title: 'Governing law' },
  { id: 'changes', title: 'Changes to these terms' },
  { id: 'contact', title: 'Contact' },
]

export function TermsPage() {
  useDocumentTitle('Terms of Service')
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="August 23, 2026"
      sections={SECTIONS}
      intro={
        <p>
          These terms describe the rules that govern your use of Repcastr, based on how the
          product actually works.
        </p>
      }
    >
      <LegalSection id="acceptance" title="Acceptance of these terms">
        <p>By creating an account or using Repcastr, you agree to these terms.</p>
        <p>Repcastr is intended for users aged 13 and older.</p>
      </LegalSection>

      <LegalSection id="accounts" title="Accounts">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li>You create an account with an email and password, or by signing in with Google.</li>
          <li>You're responsible for keeping your login credentials secure.</li>
          <li>Each account may manage at most one company profile — this is enforced by the platform, not just a suggestion.</li>
          <li>
            You can permanently delete your own account at any time if you don't manage a company.
            If you do manage a company, self-service deletion is blocked — see{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand hover:underline">{PRIVACY_EMAIL}</a>{' '}
            to request it manually, so your company isn't left ownerless.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="reviews-votes" title="Reviews & voting">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li>Reviews must reflect your own genuine experience with the company you're reviewing.</li>
          <li>You may leave one review per company.</li>
          <li>A company's own team members cannot review or vote for their own company.</li>
          <li>Community (organic) rankings are driven entirely by votes — never by sponsored bid amount.</li>
          <li>Fake reviews, vote manipulation, and coordinated or automated voting are prohibited.</li>
        </ul>
      </LegalSection>

      <LegalSection id="companies" title="Company profiles">
        <p>
          A company profile must accurately describe a real business. Each company selects one or
          two categories that genuinely describe what it is — categories exist to help customers
          find real, relevant businesses, not to maximize exposure.
        </p>
      </LegalSection>

      <LegalSection id="sponsored" title="Sponsored placement & bidding">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li>A company may hold exactly one active sponsored bid at a time. That single bid is what makes it eligible for sponsored visibility in every category it belongs to — it is one purchase, not one per category.</li>
          <li>Raising a bid charges only the difference between your current bid and the new, higher amount.</li>
          <li>A bid can be raised, but not lowered or withdrawn once placed.</li>
          <li>Sponsored placement is always clearly labeled, and never affects a company's organic (community-voted) ranking.</li>
        </ul>
      </LegalSection>

      <LegalSection id="deals" title="Deals">
        <p>
          Deals are created and controlled entirely by the advertiser company that posts them.
          Repcastr does not manually select, curate, or guarantee any deal, and an expired deal is
          automatically removed from active listings.
        </p>
      </LegalSection>

      <LegalSection id="payments" title="Payments">
        <p>
          All sponsored-bid payments are processed by Stripe and are one-time charges — Repcastr
          does not run subscriptions or recurring billing. Repcastr never sees or stores your card
          details.
        </p>
        <p>
          Sponsored bids are one-time purchases. Once a bid is activated, it's generally
          non-refundable — except where required by applicable law, or where Repcastr charged an
          incorrect amount. This doesn't waive any statutory consumer right you may have.
        </p>
      </LegalSection>

      <LegalSection id="prohibited" title="Prohibited conduct">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li>Creating fake accounts or fake companies.</li>
          <li>Posting reviews you didn't genuinely experience, or paying/incentivizing others to do so.</li>
          <li>Manipulating votes, or attempting to automate voting or bidding.</li>
          <li>Impersonating another person or business.</li>
          <li>Attempting to bypass the one-company-per-account or category limits.</li>
          <li>Scraping or systematically extracting data from the platform outside normal use.</li>
          <li>Filing false or bad-faith reports against another user's or company's content.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="Content ownership">
        <p>
          You keep ownership of the reviews, profile content, and company content you post. By
          posting it, you give Repcastr the right to display it publicly as part of the service.
        </p>
      </LegalSection>

      <LegalSection id="moderation" title="Moderation & enforcement">
        <p>
          You can report a review, company profile, or deal directly from its page. Reports are
          reviewed manually — there is no automated moderation and, as of today, no dedicated
          moderation team beyond the operator. Repcastr may remove content or take other action on
          an account that violates these terms based on a report or otherwise.
        </p>
        <p>
          Moderation/reporting contact:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Suspension & termination">
        <p>
          Repcastr may temporarily restrict or terminate an account for serious or repeated
          violations of these terms, fraud, manipulation of votes/reviews/bidding, illegal
          activity, or other threats to the integrity of the platform. Where reasonably possible,
          you'll be told why and given a way to reach us — {' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand hover:underline">{SUPPORT_EMAIL}</a>{' '}
          — to ask about or contest the decision.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="Third-party services">
        <p>
          Repcastr relies on Supabase (hosting, database, authentication), Stripe (payments), and
          optionally Google (sign-in). Your use of those features is also subject to those
          providers' own terms.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers & liability">
        <p>
          Repcastr is provided "as is." Rankings reflect community votes and paid sponsorship as
          disclosed — they are not a guarantee of quality, and Repcastr is not responsible for the
          accuracy of user-submitted reviews or company-submitted content.
        </p>
        <p>
          To the extent permitted by applicable law, Repcastr is not liable for indirect or
          consequential losses arising from use of the service. Nothing in these terms limits
          liability that cannot lawfully be limited or excluded.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Governing law">
        <p>These terms are governed by the laws of Portugal.</p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these terms">
        <p>
          If these terms change materially, we'll update the date at the top of this page.
          Continuing to use Repcastr after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand hover:underline">{SUPPORT_EMAIL}</a>
        </p>
        <p className="text-sm text-fg-subtle">
          This mailbox reaches the operator directly — Repcastr doesn't have a separate support
          department, just one person reading this inbox.
        </p>
        <p className="text-sm">
          See also <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
