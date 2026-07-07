import BookingHistoryList from '../../components/profile/BookingHistoryList.jsx'
import FavoriteDestinationsCard from '../../components/profile/FavoriteDestinationsCard.jsx'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import ProfileHero from '../../components/profile/ProfileHero.jsx'
import UpcomingTripCard from '../../components/profile/UpcomingTripCard.jsx'
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
            message={error || 'Đăng nhập để tiếp tục xem các chuyến đi yêu thích và lịch sử đặt chỗ.'}
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

            <div className="profile-content-grid">
              <FavoriteDestinationsCard
                destinations={viewModel.favoriteDestinations}
                onOpenDestination={actions.openFavoriteDestination}
              />

              <div className="profile-main-column">
                {viewModel.upcomingTrip ? (
                  <UpcomingTripCard
                    trip={viewModel.upcomingTrip}
                    onOpenPrimary={() => actions.openUpcomingTrip('primary')}
                    onOpenSecondary={() => actions.openUpcomingTrip('secondary')}
                  />
                ) : null}

                <BookingHistoryList
                  items={viewModel.bookingHistory}
                  onOpenItem={actions.openBookingHistoryItem}
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
