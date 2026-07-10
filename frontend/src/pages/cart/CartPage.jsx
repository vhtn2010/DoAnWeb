import CartBenefitsPanel from '../../components/cart/CartBenefitsPanel.jsx'
import CartFeedbackStack from '../../components/cart/CartFeedbackStack.jsx'
import CartItemsSection from '../../components/cart/CartItemsSection.jsx'
import CartPageHeader from '../../components/cart/CartPageHeader.jsx'
import CartSummaryCard from '../../components/cart/CartSummaryCard.jsx'
import useCart from '../../hooks/useCart.js'

function CartPage() {
  const {
    appliedVoucher,
    canContinue,
    cartItems,
    error,
    feedback,
    formattedSummary,
    handleApplyVoucher,
    handleClearCart,
    handleContinueCheckout,
    handleEditItem,
    handleGoBack,
    handleRemoveItem,
    handleRemoveVoucher,
    handleToggleAll,
    handleToggleItem,
    isAllSelected,
    isCustomer,
    isVoucherLoading,
    loading,
    reloadCart,
    selectedItemIds,
    setVoucherCode,
    voucherCode,
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
            appliedVoucher={appliedVoucher}
            feedbackHint={
              isCustomer
                ? 'Voucher và checkout hiện được backend xử lý theo toàn bộ giỏ hàng. Hãy chọn tất cả dịch vụ trước khi áp mã hoặc tiếp tục.'
                : 'Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo.'
            }
            isContinueDisabled={!canContinue}
            isVoucherLoading={isVoucherLoading}
            onApplyVoucher={handleApplyVoucher}
            onChangeVoucherCode={setVoucherCode}
            onClearCart={handleClearCart}
            onContinue={handleContinueCheckout}
            onRemoveVoucher={handleRemoveVoucher}
            summary={formattedSummary}
            voucherCode={voucherCode}
          />

          <CartBenefitsPanel />
        </aside>
      </div>
    </div>
  )
}

export default CartPage
