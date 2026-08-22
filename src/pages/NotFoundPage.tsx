import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
      <p className="font-numeral text-6xl text-sponsored">404</p>
      <h1 className="mt-4 text-2xl font-bold text-fg">Nothing to report here.</h1>
      <p className="mt-2 text-fg-muted">Nothing lives at this position anymore.</p>
      <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
        Back to Repcastr
      </Link>
    </div>
  )
}
