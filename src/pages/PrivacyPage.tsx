import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection, LegalInputRequired } from '@/components/legal/LegalLayout'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const SECTIONS = [
  { id: 'who-we-are', title: 'Who we are' },
  { id: 'information-we-collect', title: 'Information we collect' },
  { id: 'cookies-and-storage', title: 'Cookies & local storage' },
  { id: 'how-we-use-it', title: 'How we use information' },
  { id: 'what-is-public', title: 'What other people can see' },
  { id: 'third-parties', title: 'Third-party services' },
  { id: 'retention', title: 'Data retention' },
  { id: 'deletion', title: 'Account & data deletion' },
  { id: 'your-rights', title: 'Your rights' },
  { id: 'children', title: "Children's privacy" },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact' },
]

export function PrivacyPage() {
  useDocumentTitle('Privacy Policy')
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="August 22, 2026"
      sections={SECTIONS}
      intro={
        <p>
          This page describes what information Repcastr actually collects and why, based on how
          the product is built today. It is a launch draft: sections marked{' '}
          <LegalInputRequired>example</LegalInputRequired> need real business or legal details
          filled in — none of that has been invented here.
        </p>
      }
    >
      <LegalSection id="who-we-are" title="Who we are">
        <p>
          Repcastr is a platform for discovering companies through community rankings and reviews,
          with transparently labeled sponsored placement.
        </p>
        <p>
          Legal entity name, registered address, and jurisdiction:{' '}
          <LegalInputRequired>legal business name and address</LegalInputRequired>
        </p>
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

      <LegalSection id="third-parties" title="Third-party services">
        <ul className="ml-5 list-disc [&>li]:mt-1.5">
          <li><strong className="text-fg">Supabase</strong> — database, authentication, file storage, and backend hosting.</li>
          <li><strong className="text-fg">Stripe</strong> — payment processing for advertiser sponsored bids.</li>
          <li><strong className="text-fg">Google</strong> — only if you choose "Continue with Google" to sign in.</li>
        </ul>
        <p>Each processes data under its own privacy policy in addition to this one.</p>
      </LegalSection>

      <LegalSection id="retention" title="Data retention">
        <p>How long we keep your information after account inactivity or deletion: <LegalInputRequired>data retention period</LegalInputRequired></p>
      </LegalSection>

      <LegalSection id="deletion" title="Account & data deletion">
        <p>
          Repcastr does not yet have a self-service "delete my account" feature. Until one ships,
          requests are handled manually: <LegalInputRequired>a real contact address to request account/data deletion</LegalInputRequired>
        </p>
        <p>
          Payment records tied to a company (amounts charged, status) are financial records and
          are kept independently of any individual account for accounting purposes, regardless of
          what happens to the account that made them.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct, export, or delete
          your personal information. Applicable law and the process for exercising these rights:{' '}
          <LegalInputRequired>applicable privacy law and rights process</LegalInputRequired>
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children's privacy">
        <p>Minimum age to use Repcastr: <LegalInputRequired>minimum age policy</LegalInputRequired></p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          If this policy changes in a way that matters, we'll update the date at the top of this
          page. Continuing to use Repcastr after a change means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>Privacy questions or requests: <LegalInputRequired>privacy contact email</LegalInputRequired></p>
        <p className="text-sm">
          See also <Link to="/terms" className="text-brand hover:underline">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
