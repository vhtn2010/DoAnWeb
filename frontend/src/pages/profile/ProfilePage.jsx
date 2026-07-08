import {
  PROFILE_HISTORY_FILTERS,
} from '../../constants/profile.js'
import BookingHistoryList from '../../components/profile/BookingHistoryList.jsx'
import FavoriteDestinationsCard from '../../components/profile/FavoriteDestinationsCard.jsx'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import ProfileHero from '../../components/profile/ProfileHero.jsx'
import ProfileShortcutPanel from '../../components/profile/ProfileShortcutPanel.jsx'
import UpcomingTripCard from '../../components/profile/UpcomingTripCard.jsx'
import useProfile from '../../hooks/useProfile.js'

function ProfilePage() {
  const {
    actions,
    error,
    feedback,
    isCustomerPreview,
    loading,
    profile,
    viewModel,
  } = useProfile()

  const bookingCounts = (viewModel.bookingHistoryFilters ?? []).reduce((result, filter) => {
    result[filter.id] = filter.count
    return result
  }, {})

  const totalOrders = bookingCounts[PROFILE_HISTORY_FILTERS.all] ?? 0
  const upcomingOrders = bookingCounts[PROFILE_HISTORY_FILTERS.upcoming] ?? 0
  const pendingOrders = bookingCounts[PROFILE_HISTORY_FILTERS.pending_confirmation] ?? 0
  const latestFavorite = viewModel.favoriteDestinations?.[0]

  const heroStats = [
    {
      id: 'orders',
      value: totalOrders,
      label: 'đơn đang theo dõi',
    },
    {
      id: 'upcoming',
      value: upcomingOrders,
      label: 'chuyến sắp tới',
    },
    {
      id: 'pending',
      value: pendingOrders,
      label: 'yêu cầu cần xử lý',
    },
  ]

  const heroHighlights = [
    upcomingOrders
      ? `Bạn có ${upcomingOrders} chuyến sắp khởi hành cần theo dõi.`
      : 'Hiện chưa có chuyến sắp khởi hành trong tài khoản này.',
    profile?.loyalty_tier
      ? `Ưu đãi hạng ${profile.loyalty_tier} đang sẵn sàng cho hành trình tiếp theo.`
      : 'Quyền lợi thành viên sẽ hiển thị tại đây khi tài khoản được kích hoạt.',
    latestFavorite
      ? `Gợi ý mới dành cho bạn: ${latestFavorite.name}.`
      : 'Bài viết và gợi ý hành trình mới sẽ xuất hiện theo sở thích của bạn.',
  ]

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
            <ProfileHero
              greeting={viewModel.greeting}
              highlights={heroHighlights}
              onPrimaryAction={() => actions.openUpcomingTripPrimary(viewModel.upcomingTrip)}
              onSecondaryAction={() =>
                actions.selectBookingHistoryFilter(PROFILE_HISTORY_FILTERS.upcoming)
              }
              primaryActionLabel="Xem lịch trình gần nhất"
              profile={profile}
              secondaryActionLabel="Theo dõi chuyến sắp tới"
              stats={heroStats}
              upcomingTrip={viewModel.upcomingTrip}
            />

            {feedback ? (
              <p className="profile-page__status profile-page__status--feedback" role="status">
                {feedback}
              </p>
            ) : null}

            <div className="profile-dashboard">
              <div className="profile-content-grid">
                <div className="profile-main-column">
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

                <aside className="profile-side-column">
                  {viewModel.upcomingTrip ? (
                    <UpcomingTripCard
                      onOpenPrimary={() => actions.openUpcomingTripPrimary(viewModel.upcomingTrip)}
                      onOpenSecondary={() =>
                        actions.openUpcomingTripSecondary(viewModel.upcomingTrip)
                      }
                      trip={viewModel.upcomingTrip}
                    />
                  ) : null}

                  {viewModel.favoriteDestinations?.length ? (
                    <FavoriteDestinationsCard
                      destinations={viewModel.favoriteDestinations}
                      onOpenDestination={actions.openFavoriteDestination}
                    />
                  ) : null}
                </aside>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default ProfilePage
