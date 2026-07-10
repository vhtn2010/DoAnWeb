import { PROFILE_HISTORY_FILTERS } from '../../constants/profile.js'
import BookingHistoryList from '../../components/profile/BookingHistoryList.jsx'
import FavoriteDestinationsCard from '../../components/profile/FavoriteDestinationsCard.jsx'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import ProfileHero from '../../components/profile/ProfileHero.jsx'
import ProfileShortcutPanel from '../../components/profile/ProfileShortcutPanel.jsx'
import UpcomingTripCard from '../../components/profile/UpcomingTripCard.jsx'
import {
  PublicButton,
  PublicErrorState,
  PublicLoadingBlock,
  PublicNotice,
} from '../../components/public/ui/index.js'
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
  const loyaltyTierLabel =
    profile?.loyalty_tier === 'Di sản Vàng' ? 'Hạng Vàng' : profile?.loyalty_tier

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
    loyaltyTierLabel
      ? `Ưu đãi ${loyaltyTierLabel} đang sẵn sàng cho hành trình tiếp theo.`
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
          <PublicLoadingBlock
            className="profile-page__loading"
            description="Dữ liệu hồ sơ đang được đồng bộ từ tài khoản, đơn hàng và lịch sử chuyến đi của bạn."
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

        {!loading && isCustomerPreview && !error ? (
          <>
            <ProfileHero
              greeting={viewModel.greeting}
              highlights={heroHighlights}
              profile={profile}
              stats={heroStats}
              upcomingTrip={viewModel.upcomingTrip}
            />

            {feedback ? (
              <PublicNotice className="profile-page__feedback" role="status" tone="success">
                {feedback}
              </PublicNotice>
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
