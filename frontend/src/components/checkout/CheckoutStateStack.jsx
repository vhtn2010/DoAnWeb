import { PublicErrorState, PublicLoadingBlock } from '../public/ui/index.js'

export default function CheckoutStateStack({ checkoutDraft, error, loading }) {
  return (
    <>
      {loading && !checkoutDraft ? (
        <PublicLoadingBlock
          className="checkout-page__state"
          rows={3}
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
