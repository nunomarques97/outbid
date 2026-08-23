import { getBidSliderMax, normalizeBidInput } from '@/lib/bidPayment'
import { Slider } from '@/components/ui/slider'

interface BidAmountControlProps {
  value: number
  onChange: (value: number) => void
  /** The lowest amount selectable — StartBidCard passes getOpeningBidMinimum's result, BidAdjustControl passes the company's own current amount. */
  min: number
  disabled?: boolean
}

/**
 * A numeric euro input paired with a slider, kept in sync through the same
 * `value`/`onChange` pair — typing €10 updates the slider immediately, and
 * dragging the slider updates the number. The slider's range is purely a
 * convenience for quick adjustment (see getBidSliderMax); the input is what
 * actually lets a business type any whole-euro amount, however large,
 * without being constrained by the slider's visual range at all.
 */
export function BidAmountControl({ value, onChange, min, disabled }: BidAmountControlProps) {
  const sliderMax = getBidSliderMax(min, value)

  return (
    <div className="flex items-center gap-3">
      <label className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 focus-within:border-brand">
        <span className="text-sm text-fg-subtle">€</span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(normalizeBidInput(e.target.value, min))}
          aria-label="Bid amount in euros"
          className="w-16 bg-transparent font-numeral text-sm text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </label>
      <div className="flex-1">
        <Slider
          min={min}
          max={sliderMax}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
