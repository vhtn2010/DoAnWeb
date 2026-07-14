import CartItemCard from './CartItemCard.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
} from '../public/ui/index.js'
import { formatCurrencyVND } from '../../utils/formatCurrency.js'

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

export default function CartItemsSection({
  cartItems,
  error,
  handleClearCart,
  handleEditItem,
  handleTourPassengerChange,
  handleQuantityChange,
  handleRemoveItem,
  handleToggleAll,
  handleToggleItem,
  isAllSelected,
  isBusy = false,
  loading,
  reloadCart,
  selectedItemIds,
  updatingItemIds = [],
}) {
  return (
    <section className="cart-list-card">
      <div className="cart-list-card__header">
        <div className="cart-list-card__intro">
          <span aria-hidden="true" className="cart-list-card__icon">
            <CartBasketIcon />
          </span>
          <h2 className="cart-list-card__title">Lựa chọn của bạn</h2>
        </div>

        <div className="cart-list-card__header-actions">
          {cartItems.length > 0 ? (
            <>
              <button
                className="cart-item-card__action cart-item-card__action--ghost"
                type="button"
                onClick={handleToggleAll}
              >
                {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>

              <button
                className="cart-item-card__action cart-item-card__action--ghost cart-item-card__action--subtle-danger"
                disabled={isBusy}
                type="button"
                onClick={handleClearCart}
              >
                Xóa giỏ hàng
              </button>
            </>
          ) : null}
          <span className="cart-list-card__pill">{cartItems.length} mục</span>
        </div>
      </div>

      <div className="cart-list-card__items">
        {loading ? (
          <PublicLoadingBlock
            className="cart-list-card__state"
            description="Giỏ hàng đang được đồng bộ từ dữ liệu hiện tại của bạn."
            rows={3}
            title="Đang tải giỏ hàng"
          />
        ) : error && cartItems.length === 0 ? (
          <PublicErrorState
            action={
              <PublicButton
                className="cart-list-card__retry"
                type="button"
                variant="secondary"
                onClick={reloadCart}
              >
                Tải lại
              </PublicButton>
            }
            className="cart-list-card__state"
            description="Vui lòng thử tải lại để tiếp tục xem các dịch vụ đã lưu trong giỏ."
            eyebrow="Kết nối thất bại"
            title="Chưa tải được giỏ hàng"
          />
        ) : cartItems.length > 0 ? (
          cartItems.map((item) => (
            <CartItemCard
              key={item.id}
              formatCurrency={formatCurrencyVND}
              isSelected={selectedItemIds.includes(item.id)}
              isUpdatingQuantity={updatingItemIds.includes(item.id)}
              item={item}
              onEdit={handleEditItem}
              onTourPassengerChange={handleTourPassengerChange}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveItem}
              onToggle={handleToggleItem}
            />
          ))
        ) : (
          <PublicEmptyState
            className="cart-list-card__state"
            description="Thêm dịch vụ vào giỏ để tiếp tục đặt chỗ và thanh toán."
            eyebrow="Chưa có lựa chọn"
            title="Giỏ hàng đang trống"
          />
        )}
      </div>
    </section>
  )
}
