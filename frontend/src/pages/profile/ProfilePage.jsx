import BookingHistoryList from '../../components/profile/BookingHistoryList.jsx'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import ProfileHero from '../../components/profile/ProfileHero.jsx'
import ProfileShortcutPanel from '../../components/profile/ProfileShortcutPanel.jsx'
import useProfile from '../../hooks/useProfile.js'

function ProfilePage() {
  const {
    actions,
    error,
    feedback,
    isCustomerPreview,
    loading,
    viewModel,
  } = useProfile()

  const showGuestGate = !isCustomerPreview && !loading

  return (
    <div className="profile-page">
      <div className="profile-shell">
        {loading ? (
          <p className="profile-page__status" role="status">
            Đang chuẩn bị dữ liệu hồ sơ mock theo pattern API-ready...
          </p>
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
          <div className="profile-page__status profile-page__status--error" role="status">
            <p>{error}</p>
            <button type="button" onClick={actions.retry}>
              Thử lại
            </button>
          </div>
        ) : null}

        {!loading && isCustomerPreview && !error ? (
          <>
            <ProfileHero greeting={viewModel.greeting} />

            {feedback ? (
              <p className="profile-page__status profile-page__status--feedback" role="status">
                {feedback}
              </p>
            ) : null}

            <div className="profile-dashboard">
              <BookingHistoryList
                filters={viewModel.bookingHistoryFilters}
                items={viewModel.filteredBookingHistory}
                onOpenItem={actions.openBookingHistoryItem}
                onSelectFilter={actions.selectBookingHistoryFilter}
                resultsLabel={viewModel.bookingHistoryResultsLabel}
                selectedFilter={viewModel.bookingHistoryFilter}
              />

              <div className="profile-support-grid">
                <ProfileShortcutPanel
                  description="Một vài công cụ nhỏ nhưng hữu ích để chuẩn bị chuyến đi nhanh hơn ngay từ tài khoản cá nhân."
                  eyebrow="Tiện ích"
                  items={viewModel.travelUtilities}
                  onOpenItem={actions.openProfileShortcut}
                  title="Tiện ích du lịch"
                  tone="utility"
                />

                <ProfileShortcutPanel
                  description="Khi cần thêm thông tin hoặc hỗ trợ, bạn có thể bắt đầu từ các điểm chạm quen thuộc này."
                  eyebrow="Hỗ trợ"
                  items={viewModel.supportLinks}
                  onOpenItem={actions.openProfileShortcut}
                  title="Hỗ trợ"
                  tone="support"
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default ProfilePage
