import CartBenefitsPanel from '../../components/cart/CartBenefitsPanel.jsx'
import CartFeedbackStack from '../../components/cart/CartFeedbackStack.jsx'
import CartItemsSection from '../../components/cart/CartItemsSection.jsx'
import CartPageHeader from '../../components/cart/CartPageHeader.jsx'
import CartSummaryCard from '../../components/cart/CartSummaryCard.jsx'
import useCart from '../../hooks/useCart.js'

function CartPage() {
  const {
    appliedVoucher,
    availableVouchers,
    canApplyVoucherSelection,
    canContinue,
    cartItems,
    error,
    feedback,
    formattedSummary,
    handleApplyVoucher,
    handleClearCart,
    handleCloseVoucherPicker,
    handleContinueCheckout,
    handleEditItem,
    handleGoBack,
    handleOpenVoucherPicker,
    handleQuantityChange,
    handleRemoveItem,
    handleRemoveVoucher,
    handleToggleAll,
    handleToggleItem,
    isAllSelected,
    isCustomer,
    isVoucherLoading,
    isVoucherPickerOpen,
    isVoucherWalletLoading,
    loading,
    loadVoucherWallet,
    reloadCart,
    selectedItemIds,
    updatingItemIds,
    voucherWallet,
    voucherWalletError,
  } = useCart()

  return (
    <div className="cart-page">
      <CartPageHeader onGoBack={handleGoBack} />

      <CartFeedbackStack error={error} feedback={feedback} />

      <div className="cart-page__layout">
        <CartItemsSection
          cartItems={cartItems}
          error={error}
          handleClearCart={handleClearCart}
          handleEditItem={handleEditItem}
          handleQuantityChange={handleQuantityChange}
          handleRemoveItem={handleRemoveItem}
          handleToggleAll={handleToggleAll}
          handleToggleItem={handleToggleItem}
          isAllSelected={isAllSelected}
          isBusy={isVoucherLoading}
          loading={loading}
          reloadCart={reloadCart}
          selectedItemIds={selectedItemIds}
          updatingItemIds={updatingItemIds}
        />

        <aside className="cart-page__sidebar">
          <CartSummaryCard
            appliedVoucher={appliedVoucher}
            availableVoucherCount={availableVouchers.length}
            canApplyVoucherSelection={canApplyVoucherSelection}
            feedbackHint={
              isCustomer
                ? 'Chọn dịch vụ muốn đặt, kiểm tra lại ở bước xác nhận rồi nhập thông tin đặt đơn.'
                : 'Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo.'
            }
            isContinueDisabled={!canContinue}
            isCustomer={isCustomer}
            isVoucherLoading={isVoucherLoading}
            isVoucherPickerOpen={isVoucherPickerOpen}
            isVoucherWalletLoading={isVoucherWalletLoading}
            onApplyVoucher={handleApplyVoucher}
            onCloseVoucherPicker={handleCloseVoucherPicker}
            onContinue={handleContinueCheckout}
            onOpenVoucherPicker={handleOpenVoucherPicker}
            onReloadVoucherWallet={() => loadVoucherWallet({ force: true })}
            onRemoveVoucher={handleRemoveVoucher}
            summary={formattedSummary}
            voucherWallet={voucherWallet}
            voucherWalletError={voucherWalletError}
          />

          <CartBenefitsPanel />
        </aside>
      </div>
    </div>
  )
}

export default CartPage
