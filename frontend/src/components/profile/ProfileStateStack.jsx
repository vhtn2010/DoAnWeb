import ProfileGuestGate from './ProfileGuestGate.jsx'
import {
  PublicButton,
  PublicErrorState,
  PublicLoadingBlock,
} from '../public/ui/index.js'

export default function ProfileStateStack({
  actions,
  error,
  isCustomerPreview,
  loading,
}) {
  const showGuestGate = !isCustomerPreview && !loading

  return (
    <>
      {loading ? (
        <PublicLoadingBlock
          className="profile-page__loading"
          description="Dữ liệu hồ sơ đang được đồng bộ từ tài khoản và lịch sử đơn hàng của bạn."
          rows={3}
          title="Đang chuẩn bị hồ sơ khách hàng"
        />
      ) : null}

      {showGuestGate ? (
        <ProfileGuestGate
          message={
            error ||
            'Đăng nhập để tiếp tục xem lịch sử đơn hàng, tiện ích du lịch và khu hỗ trợ cá nhân.'
          }
          onGoHome={actions.goHome}
          onGoLogin={actions.goLogin}
        />
      ) : null}

      {!loading && isCustomerPreview && error ? (
        <PublicErrorState
          action={
            <PublicButton type="button" variant="secondary" onClick={actions.retry}>
              Thử lại
            </PublicButton>
          }
          className="profile-page__error"
          description={error}
          eyebrow="Cần đồng bộ lại"
          title="Không thể tải hồ sơ khách hàng"
        />
      ) : null}
    </>
  )
}
