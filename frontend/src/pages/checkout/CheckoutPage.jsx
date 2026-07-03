import { useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import CheckoutContactCard from '../../components/checkout/CheckoutContactCard.jsx'
import CheckoutSpecialRequestCard from '../../components/checkout/CheckoutSpecialRequestCard.jsx'
import CheckoutStepper from '../../components/checkout/CheckoutStepper.jsx'
import CheckoutSummaryCard from '../../components/checkout/CheckoutSummaryCard.jsx'
import CheckoutVoucherCard from '../../components/checkout/CheckoutVoucherCard.jsx'
import {
  buildCheckoutPayload,
  calculateCheckoutSummary,
  createMockCheckoutDraft,
  formatCurrencyVND,
  validateCheckoutForm,
} from '../../data/mockCheckout.js'

const trustItems = ['SSL SECURE', 'BEST PRICE GUARANTEE', '24/7 SUPPORT']

function ContactTrustRow() {
  return (
    <div className="checkout-trust-row" aria-label="Niềm tin và bảo mật">
      {trustItems.map((item) => (
        <span className="checkout-trust-row__item" key={item}>
          {item}
        </span>
      ))}
    </div>
  )
}

function CheckoutPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const authState = searchParams.get('auth') === 'customer' ? 'customer' : 'guest'

  const selectedCartItemIds = useMemo(() => {
    if (Array.isArray(location.state?.selectedCartItemIds) && location.state.selectedCartItemIds.length > 0) {
      return location.state.selectedCartItemIds
    }

    return undefined
  }, [location.state])

  const cartSummaryPayload = useMemo(() => {
    if (location.state?.cartSummaryPayload) {
      return location.state.cartSummaryPayload
    }

    return undefined
  }, [location.state])

  const [checkoutDraft, setCheckoutDraft] = useState(() =>
    createMockCheckoutDraft({ authState, selectedCartItemIds, cartSummaryPayload })
  )
  const [formErrors, setFormErrors] = useState({})
  const [voucherFeedback, setVoucherFeedback] = useState('')
  const [submitFeedback, setSubmitFeedback] = useState('')

  const formattedSummary = {
    ...checkoutDraft.summary,
    subtotal_amount: formatCurrencyVND(checkoutDraft.summary.subtotal_amount),
    service_fee_amount: formatCurrencyVND(checkoutDraft.summary.service_fee_amount),
    discount_amount: formatCurrencyVND(checkoutDraft.summary.discount_amount),
    total_amount: formatCurrencyVND(checkoutDraft.summary.total_amount),
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target

    setCheckoutDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
      travellers: currentDraft.travellers.map((traveller) => ({
        ...traveller,
        traveller_info: traveller.traveller_info.map((travellerInfo) => ({
          ...travellerInfo,
          full_name: name === 'contact_name' ? value : currentDraft.contact_name,
          phone: name === 'contact_phone' ? value : currentDraft.contact_phone,
          email: name === 'contact_email' ? value : currentDraft.contact_email,
        })),
      })),
    }))
    setSubmitFeedback('')

    if (formErrors[name]) {
      setFormErrors((currentErrors) => {
        const nextErrors = { ...currentErrors }
        delete nextErrors[name]
        return nextErrors
      })
    }
  }

  const handleCheckboxChange = (event) => {
    const { checked, name } = event.target

    setCheckoutDraft((currentDraft) => ({
      ...currentDraft,
      [name]: checked,
    }))
    setSubmitFeedback('')

    if (formErrors[name]) {
      setFormErrors((currentErrors) => {
        const nextErrors = { ...currentErrors }
        delete nextErrors[name]
        return nextErrors
      })
    }
  }

  const handleNoteChange = (event) => {
    const { value } = event.target

    setCheckoutDraft((currentDraft) => ({
      ...currentDraft,
      note: value,
    }))
    setSubmitFeedback('')
  }

  const handleBaggageToggle = (baggageKey) => {
    // TODO: map baggage add-ons to cart item options or booking item traveller_info when API integration is defined.
    setCheckoutDraft((currentDraft) => ({
      ...currentDraft,
      special_requests: {
        ...currentDraft.special_requests,
        [baggageKey]: !currentDraft.special_requests[baggageKey],
      },
    }))
    setSubmitFeedback('Đã cập nhật lựa chọn hành lý mock cho bước checkout.')
  }

  const handleVoucherChange = (event) => {
    const { value } = event.target

    setCheckoutDraft((currentDraft) => ({
      ...currentDraft,
      voucher_code: value,
    }))
    setVoucherFeedback('')
  }

  const handleApplyVoucher = () => {
    // TODO: replace mock voucher validation with /cart/apply-voucher or /cart/validate in API integration phase.
    const normalizedVoucher = checkoutDraft.voucher_code.trim().toUpperCase()

    if (!normalizedVoucher) {
      setVoucherFeedback('Vui lòng nhập mã ưu đãi.')
      return
    }

    if (!['SUMMER2026', 'NETVIET300'].includes(normalizedVoucher)) {
      setVoucherFeedback('Mã ưu đãi không hợp lệ trong dữ liệu mock.')
      return
    }

    setCheckoutDraft((currentDraft) => ({
      ...currentDraft,
      voucher_code: normalizedVoucher,
      summary: calculateCheckoutSummary({
        subtotalAmount: currentDraft.summary.subtotal_amount,
        serviceFeeAmount: currentDraft.summary.service_fee_amount,
        discountAmount: 300000,
      }),
    }))
    setVoucherFeedback('Đã áp dụng mã ưu đãi mock giảm 300.000đ.')
  }

  const handleSubmitCheckout = () => {
    const nextErrors = validateCheckoutForm(checkoutDraft)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      setSubmitFeedback('Vui lòng hoàn thiện đầy đủ thông tin bắt buộc trước khi tiếp tục.')
      return
    }

    setFormErrors({})

    // TODO: replace mock checkout payload with POST /bookings/checkout in API integration phase.
    buildCheckoutPayload(checkoutDraft)

    setSubmitFeedback(
      'Thông tin đặt đơn đã sẵn sàng. Màn xác nhận đơn hàng/thanh toán sẽ làm ở task tiếp theo.'
    )
  }

  return (
    <div className="checkout-page">
      <div className="checkout-page__shell">
        <CheckoutStepper activeStep={2} />

        <div className="checkout-page__layout">
          <div className="checkout-page__main">
            <CheckoutContactCard
              errors={formErrors}
              formValues={checkoutDraft}
              onChange={handleFieldChange}
            />

            <CheckoutSpecialRequestCard
              baggageSelection={checkoutDraft.special_requests}
              errors={formErrors}
              note={checkoutDraft.note}
              onBaggageToggle={handleBaggageToggle}
              onCheckboxChange={handleCheckboxChange}
              onTextareaChange={handleNoteChange}
              termsAccepted={Boolean(checkoutDraft.accepted_terms)}
            />

            <ContactTrustRow />
          </div>

          <aside className="checkout-page__sidebar">
            <CheckoutSummaryCard
              buttonLabel="Tiếp Tục Thanh Toán ->"
              feedbackMessage={submitFeedback}
              formErrors={formErrors}
              onContinue={handleSubmitCheckout}
              summary={formattedSummary}
              summaryService={checkoutDraft.service}
            />

            <CheckoutVoucherCard
              feedbackMessage={voucherFeedback}
              onApplyVoucher={handleApplyVoucher}
              onChange={handleVoucherChange}
              value={checkoutDraft.voucher_code}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
