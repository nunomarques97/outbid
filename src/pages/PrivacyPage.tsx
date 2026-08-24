import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { useSeo } from '@/lib/useSeo'
import { SUPPORT_EMAIL, PRIVACY_EMAIL } from '@/lib/contact'

const SECTIONS = [
  { id: 'who-we-are', title: 'Who we are' },
  { id: 'information-we-collect', title: 'Information we collect' },
  { id: 'cookies-and-storage', title: 'Cookies & local storage' },
  { id: 'how-we-use-it', title: 'How we use information' },
  { id: 'what-is-public', title: 'What other people can see' },
  { id: 'reporting', title: 'Reporting content' },
  { id: 'third-parties', title: 'Third-party services' },
  { id: 'retention', title: 'Data retention' },
  { id: 'deletion', title: 'Account & data deletion' },
  { id: 'your-rights', title: 'Your rights' },
  { id: 'children', title: "Children's privacy" },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact' },
]

export function PrivacyPage() {
  useSeo({ title: 'Privacy Policy', canonicalPath: '/privacy' })
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="August 23, 2026"
      sections={SECTIONS}
      intro={
        <p>
          This page describes what information Repcastr collects, why, and what you can do about
          it — based on how the product actually works.
        </p>
      }
    >
      <LegalSection id="who-we-are" title="Who we are">
        <p>
          Repcastr is a platform for discovering companies through community rankings and reviews,
          with transparently labeled sponsored placement. It's currently operated personally by
          Nuno Daniel Oliveira Marques, based in Portugal — not through a registered company.
        </p>
        <p>
          Fiscal/establishment address (Portugal): Rua da Aldeia n.º 193, Longos, 4805-204,
          Portugal. This is the operator's fiscal/establishment address, published here at the
          operator's own choice — it is not a registered company address (Repcastr is not
          currently a registered legal entity) and is not published as a residential address.
        </p>
        <p>No Data Protection Officer (DPO) is currently designated.</p>
      </LegalSection>

      <LegalSection id="information-we-collect" title="Information we collect">
        <p>We only collect information tied to an account you create or an action you take.</p>
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li><strong className="text-fg">Account:</strong> your email address and password, or your Google account identity if you sign in with Google. This is handled by our authentication provider, Supabase — your email is never copied into our own public profile data.</li>
          <li><strong className="text-fg">Profile:</strong> a display name, an automatically generated username, and, if you choose to add them, a bio (up to 500 characters) and an avatar image. You can mark your profile public or private at any time.</li>
          <li><strong className="text-fg">Interests:</strong> the categories you choose to follow.</li>
          <li><strong className="text-fg">Reviews:</strong> a star rating, a title, and a body you write about a company. Your display name at the time you post is stored with the review permanently, so a later name change doesn't rewrite past reviews.</li>
          <li><strong className="text-fg">Votes:</strong> which companies you've upvoted and which side you picked in a head-to-head comparison. Votes are tied to your account, not anonymous.</li>
          <li><strong className="text-fg">Saved companies and watched deals:</strong> which companies and deals you've bookmarked.</li>
          <li><strong className="text-fg">Reports:</strong> if you report a review, company, or deal, we store which account filed it, what was reported, the reason you selected, and any optional description you add.</li>
          <li><strong className="text-fg">Company/advertiser information:</strong> if you create a company profile, its name, description, tagline, website, founding year, logo, and up to two categories.</li>
          <li><strong className="text-fg">Payments:</strong> if you place a sponsored bid, payment is handled entirely by Stripe. Repcastr does not receive or store your card details — only a Stripe reference id, the amount charged, and the payment's status, tied to the company, not to any individual person.</li>
          <li><strong className="text-fg">Technical information:</strong> Repcastr's own code does not run analytics or trackers. Our infrastructure providers (Supabase, and whoever hosts the site) may automatically log standard technical information such as IP addresses, as is normal for any web service.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies-and-storage" title="Cookies & local storage">
        <p>Repcastr does not set any cookies of its own.</p>
        <p>
          When you sign in, our authentication library (provided by Supabase) stores your session
          in your browser's local storage so you stay signed in between visits. This is required
          for the site to work and is not used for tracking, advertising, or analytics of any
          kind.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-it" title="How we use information">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li>To operate your account, keep you signed in, and show you your own saved items, votes, and reviews.</li>
          <li>To display public content — reviews, votes counts, rankings, company and (public) user profiles — to other visitors.</li>
          <li>To process advertiser sponsored-bid payments through Stripe.</li>
          <li>To send you account-related email (sign-up confirmation, password reset) through Supabase's authentication system.</li>
        </ul>
        <p>Repcastr does not sell personal information, and does not use it for advertising.</p>
      </LegalSection>

      <LegalSection id="what-is-public" title="What other people can see">
        <p>
          Company profiles, their rankings, and their reviews are always public — that's the
          point of the product. For your own account:
        </p>
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li>If your profile is set to <strong className="text-fg">Public</strong> (the default), your username, display name, avatar, and bio are visible to anyone.</li>
          <li>If set to <strong className="text-fg">Private</strong>, your profile page itself is hidden from everyone but you.</li>
          <li>
            Reviews you write are visible on the company's page regardless of your profile's
            public/private setting — a review always shows the display name you had when you
            posted it.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="reporting" title="Reporting content">
        <p>
          Reports you file are visible only to you and to whoever manually reviews reports — there
          is no public list of reports, and the person or content you report is not automatically
          notified who reported them. There is no dedicated moderation team yet; reports are
          reviewed directly by the operator, reachable at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="Third-party services">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li><strong className="text-fg">Supabase</strong> — database, authentication, file storage, and backend hosting.</li>
          <li><strong className="text-fg">Stripe</strong> — payment processing for advertiser sponsored bids.</li>
          <li><strong className="text-fg">Google</strong> — only if you choose "Continue with Google" to sign in.</li>
        </ul>
        <p>Each processes data under its own privacy policy in addition to this one.</p>
      </LegalSection>

      <LegalSection id="retention" title="Data retention">
        <p>
          Repcastr doesn't apply a single arbitrary retention period to everything. Instead,
          information is kept for as long as it's needed: for as long as your account is active
          and the data serves the purpose it was collected for (operating your account, showing
          your reviews/votes/saves), and afterward for as long as needed to meet legal, accounting,
          fraud-prevention, or dispute-resolution obligations where applicable. Deleting your
          account (see below) removes account-linked data immediately, except records — like
          payment history — that are kept independently for accounting purposes.
        </p>
      </LegalSection>

      <LegalSection id="deletion" title="Account & data deletion">
        <p>
          If you don't manage a company, you can permanently delete your own account from your
          profile page at any time. This removes your profile, reviews, votes, saved companies,
          watched deals, interests, and reports — immediately and without a recovery option.
        </p>
        <p>
          If you manage a company, self-service deletion is intentionally blocked: deleting your
          account would leave your company without an owner and disconnect it from its sponsored
          bid and payment history. Email{' '}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand hover:underline">{PRIVACY_EMAIL}</a>{' '}
          to request deletion in this case, and we'll handle the company transfer/closure manually
          first.
        </p>
        <p>
          Payment records tied to a company (amounts charged, status) are financial records and
          are kept independently of any individual account for accounting purposes, regardless of
          what happens to the account that made them.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          Repcastr is operated from Portugal, an EU member state, so EU/Portuguese data protection
          law (GDPR as implemented in Portugal) applies to how your personal data is handled. You
          may have rights to access, correct, export, or delete your personal information, and to
          object to or restrict certain processing. To exercise any of these, email{' '}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand hover:underline">{PRIVACY_EMAIL}</a>.
        </p>
        <p>
          We will review and respond to requests within the timeframe required by applicable
          data-protection law. We may request information needed to verify the identity of the
          requester before processing a request.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children's privacy">
        <p>Repcastr is intended for users aged 13 and older. It is not directed at children under 13.</p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          If this policy changes in a way that matters, we'll update the date at the top of this
          page. Continuing to use Repcastr after a change means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Privacy questions or data requests:{' '}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand hover:underline">{PRIVACY_EMAIL}</a>
        </p>
        <p className="text-sm text-fg-subtle">
          This mailbox reaches the operator directly — Repcastr doesn't have a separate privacy
          department, just one person reading this inbox.
        </p>
        <p className="text-sm">
          See also <Link to="/terms" className="text-brand hover:underline">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
