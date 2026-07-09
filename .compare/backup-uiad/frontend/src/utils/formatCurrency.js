export function formatCurrencyVND(amount = 0) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, '')
}
