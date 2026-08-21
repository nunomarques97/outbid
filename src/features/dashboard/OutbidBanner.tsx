import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface OutbidBannerProps {
  placementName: string
  leaderName: string
  leaderBid: number
  myBid: number
  onRaiseBid: () => void
}

export function OutbidBanner({ placementName, leaderName, leaderBid, myBid, onRaiseBid }: OutbidBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-start gap-4 rounded-xl border border-danger/40 bg-danger/10 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger"
        >
          <AlertTriangle className="h-4 w-4" />
        </motion.span>
        <div>
          <p className="font-semibold text-fg">You’ve been outbid on {placementName}</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            <span className="font-medium text-fg">{leaderName}</span> is now bidding{' '}
            <span className="font-numeral text-danger">{formatCurrency(leaderBid)}</span> — your current bid is{' '}
            <span className="font-numeral">{formatCurrency(myBid)}</span>.
          </p>
        </div>
      </div>
      <Button variant="primary" onClick={onRaiseBid} className="shrink-0">
        Raise your bid
      </Button>
    </motion.div>
  )
}
