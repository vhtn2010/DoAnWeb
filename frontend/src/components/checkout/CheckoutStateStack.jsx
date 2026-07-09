import { PublicErrorState, PublicLoadingBlock } from '../public/ui/index.js'

export default function CheckoutStateStack({ checkoutDraft, error, loading }) {
  return (
    <>
      {loading && !checkoutDraft ? (
        <PublicLoadingBlock
          className="checkout-page__state"
          description="Đơn nháp và thông tin liên hệ đang được tải theo luồng mock API-ready hiện tại."
          rows={3}
          title="Đang tải thông tin đặt đơn"
        />
      ) : null}

      {error ? (
        <PublicErrorState
          className="checkout-page__state"
          description={error}
          eyebrow="Không thể tiếp tục"
          title="Có lỗi khi chuẩn bị bước checkout"
        />
      ) : null}
    </>
  )
}
