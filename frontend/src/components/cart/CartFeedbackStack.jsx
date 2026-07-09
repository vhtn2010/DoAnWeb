import { PublicErrorState, PublicNotice } from '../public/ui/index.js'

export default function CartFeedbackStack({ error, feedback }) {
  return (
    <>
      {feedback.message ? (
        <PublicNotice
          className={`cart-page__feedback cart-page__feedback--${feedback.tone}`}
          role="status"
          tone={feedback.tone === 'success' ? 'success' : 'info'}
        >
          {feedback.message}
        </PublicNotice>
      ) : null}

      {error ? (
        <PublicErrorState
          className="cart-page__feedback cart-page__feedback--error"
          description={error}
          eyebrow="Cần đồng bộ lại"
          title="Có lỗi khi tải giỏ hàng"
        />
      ) : null}
    </>
  )
}
