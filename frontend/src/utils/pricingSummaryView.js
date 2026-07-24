import { calculatePricingSummary } from './pricing.js'
import { formatCurrencyVND } from './formatCurrency.js'

const EMPTY_PRICING_SUMMARY_VIEW = Object.freeze({
  has_pricing: false,
  service_fee_amount: formatCurrencyVND(0),
  service_fee_amount_value: 0,
  subtotal_amount: formatCurrencyVND(0),
  subtotal_amount_value: 0,
  surcharge_amount: formatCurrencyVND(0),
  surcharge_amount_value: 0,
  tax_and_fee_amount: formatCurrencyVND(0),
  tax_and_fee_amount_value: 0,
  total_amount: formatCurrencyVND(0),
  total_amount_value: 0,
  vat_amount: formatCurrencyVND(0),
  vat_amount_value: 0,
})

function toNumber(value) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : 0
}

export function createPricingSummaryViewFromItem(item) {
  if (!item) {
    return EMPTY_PRICING_SUMMARY_VIEW
  }

  const summary = calculatePricingSummary([item])

  return {
    has_pricing: true,
    service_fee_amount: formatCurrencyVND(summary.service_fee_amount),
    service_fee_amount_value: toNumber(summary.service_fee_amount),
    subtotal_amount: formatCurrencyVND(summary.subtotal_amount),
    subtotal_amount_value: toNumber(summary.subtotal_amount),
    surcharge_amount: formatCurrencyVND(summary.surcharge_amount),
    surcharge_amount_value: toNumber(summary.surcharge_amount),
    tax_and_fee_amount: formatCurrencyVND(summary.tax_and_fee_amount),
    tax_and_fee_amount_value: toNumber(summary.tax_and_fee_amount),
    total_amount: formatCurrencyVND(summary.total_amount),
    total_amount_value: toNumber(summary.total_amount),
    vat_amount: formatCurrencyVND(summary.vat_amount),
    vat_amount_value: toNumber(summary.vat_amount),
  }
}
