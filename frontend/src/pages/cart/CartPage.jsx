import CartBenefitsPanel from '../../components/cart/CartBenefitsPanel.jsx'
import CartFeedbackStack from '../../components/cart/CartFeedbackStack.jsx'
import CartItemsSection from '../../components/cart/CartItemsSection.jsx'
import CartPageHeader from '../../components/cart/CartPageHeader.jsx'
import CartSummaryCard from '../../components/cart/CartSummaryCard.jsx'
import useCart from '../../hooks/useCart.js'

function CartPage() {
  const {
    canContinue,
    cartItems,
    error,
    feedback,
    formattedSummary,
    handleContinueCheckout,
    handleEditItem,
    handleGoBack,
    handleRemoveItem,
    handleToggleAll,
    handleToggleItem,
    isAllSelected,
    isCustomer,
    loading,
    reloadCart,
    selectedItemIds,
  } = useCart()

  return (
    <div className="cart-page">
      <CartPageHeader onGoBack={handleGoBack} />

      <CartFeedbackStack error={error} feedback={feedback} />

      <div className="cart-page__layout">
        <CartItemsSection
          cartItems={cartItems}
          error={error}
          handleEditItem={handleEditItem}
          handleRemoveItem={handleRemoveItem}
          handleToggleAll={handleToggleAll}
          handleToggleItem={handleToggleItem}
          isAllSelected={isAllSelected}
          loading={loading}
          reloadCart={reloadCart}
          selectedItemIds={selectedItemIds}
        />

        <aside className="cart-page__sidebar">
          <CartSummaryCard
            feedbackHint={
              isCustomer
                ? 'Với tài khoản thành viên, backend hiện checkout theo toàn bộ giỏ hàng. Bạn có thể dùng nút "Chọn tất cả" rồi tiếp tục.'
                : 'Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo.'
            }
            isContinueDisabled={!canContinue}
            onContinue={handleContinueCheckout}
            summary={formattedSummary}
          />

          <CartBenefitsPanel />
        </aside>
      </div>
    </div>
  )
}

export default CartPage
