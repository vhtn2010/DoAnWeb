import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CartBenefitCard from '../../components/cart/CartBenefitCard.jsx'
import CartItemCard from '../../components/cart/CartItemCard.jsx'
import CartSummaryCard from '../../components/cart/CartSummaryCard.jsx'
import {
  buildCartSummaryPayload,
  calculateCartSummary,
  formatCurrencyVND,
  mockActiveCart,
} from '../../data/mockCart.js'

const benefitCards = [
  {
    id: 'best-price',
    icon: 'shield',
    title: 'Đảm bảo giá tốt nhất',
    description: 'Hoàn tiền chênh lệch nếu thấy giá rẻ hơn.',
  },
  {
    id: 'support',
    icon: 'support',
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ hỗ trợ tận tâm luôn sẵn sàng.',
  },
]

function CartBasketIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="m5.5 9.5 1.6 9a1 1 0 0 0 .98.82h7.92a1 1 0 0 0 .98-.82l1.6-9H5.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 9.5 12 5l3 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CartPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const authState = searchParams.get('auth') === 'customer' ? 'customer' : 'guest'
  const isCustomer = authState === 'customer'
  const [cartItems, setCartItems] = useState(mockActiveCart.cart_items)
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [feedbackState, setFeedbackState] = useState({
    tone: 'info',
    message: '',
  })

  const cartSummary = calculateCartSummary(cartItems, selectedItemIds)

  const handleToggleItem = (itemId) => {
    setSelectedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((currentId) => currentId !== itemId)
        : [...currentIds, itemId]
    )
    setFeedbackState({
      tone: 'info',
      message: '',
    })
  }

  const handleRemoveItem = (itemId) => {
    // TODO: replace local remove with DELETE /cart/items/{cart_item_id} in API integration phase.
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== itemId))
    setSelectedItemIds((currentIds) => currentIds.filter((currentId) => currentId !== itemId))
    setFeedbackState({
      tone: 'success',
      message: 'Đã xóa dịch vụ khỏi giỏ hàng.',
    })
  }

  const handleEditItem = () => {
    // TODO: replace local update with PATCH /cart/items/{cart_item_id} in API integration phase.
    setFeedbackState({
      tone: 'info',
      message:
        'Chỉnh sửa chi tiết giỏ hàng sẽ được nối API PATCH /cart/items/{cart_item_id} ở phase integration.',
    })
  }

  const handleContinue = () => {
    // TODO: replace mock validation with POST /cart/validate before checkout integration.
    // TODO: in checkout integration, allow guest checkout with contact/traveller info; merge guest cart after login only if user chooses to sign in.
    if (selectedItemIds.length === 0) {
      setFeedbackState({
        tone: 'error',
        message: 'Vui lòng chọn ít nhất một dịch vụ để tiếp tục.',
      })
      return
    }

    buildCartSummaryPayload(mockActiveCart, cartItems, selectedItemIds)

    setFeedbackState({
      tone: 'success',
      message: 'Sẵn sàng chuyển sang thông tin đặt đơn. Checkout sẽ làm ở Task 16B.',
    })
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(isCustomer ? '/services?auth=customer' : '/services')
  }

  return (
    <div className="cart-page">
      <section className="cart-page__hero">
        <div className="cart-page__hero-copy">
          <button className="cart-page__back-button" type="button" onClick={handleGoBack}>
            <span aria-hidden="true">←</span>
            <span>Quay lại</span>
          </button>
          <p className="cart-page__eyebrow">Cart preview</p>
          <h1 className="cart-page__title">Giỏ hàng của bạn</h1>
        </div>
      </section>

      {feedbackState.message ? (
        <p className={`cart-page__feedback cart-page__feedback--${feedbackState.tone}`} role="status">
          {feedbackState.message}
        </p>
      ) : null}

      <div className="cart-page__layout">
        <section className="cart-list-card">
          <div className="cart-list-card__header">
            <div className="cart-list-card__intro">
              <span aria-hidden="true" className="cart-list-card__icon">
                <CartBasketIcon />
              </span>
              <h2 className="cart-list-card__title">Lựa chọn của bạn</h2>
            </div>
            <span className="cart-list-card__pill">{cartItems.length} Mục</span>
          </div>

          <div className="cart-list-card__items">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <CartItemCard
                  key={item.id}
                  formatCurrency={formatCurrencyVND}
                  isSelected={selectedItemIds.includes(item.id)}
                  item={item}
                  onEdit={handleEditItem}
                  onRemove={handleRemoveItem}
                  onToggle={handleToggleItem}
                />
              ))
            ) : (
              <div className="cart-list-card__empty" role="status">
                <h2>Giỏ hàng đang trống</h2>
                <p>Thêm dịch vụ vào giỏ để tiếp tục preview quy trình đặt đơn ở các task sau.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="cart-page__sidebar">
          <CartSummaryCard
            feedbackHint={
              'Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo.'
            }
            onContinue={handleContinue}
            summary={{
              ...cartSummary,
              total_amount: formatCurrencyVND(cartSummary.total_amount),
              subtotal_amount: formatCurrencyVND(cartSummary.subtotal_amount),
            }}
          />

          <div className="cart-page__benefits">
            {benefitCards.map((benefit) => (
              <CartBenefitCard
                key={benefit.id}
                description={benefit.description}
                icon={benefit.icon}
                title={benefit.title}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CartPage
