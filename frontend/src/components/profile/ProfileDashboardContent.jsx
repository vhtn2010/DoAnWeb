import BookingHistoryList from './BookingHistoryList.jsx'
import FavoriteDestinationsCard from './FavoriteDestinationsCard.jsx'
import ProfileAccountCenter from './ProfileAccountCenter.jsx'
import ProfileHero from './ProfileHero.jsx'
import ProfileShortcutPanel from './ProfileShortcutPanel.jsx'
import UpcomingTripCard from './UpcomingTripCard.jsx'
import { PublicNotice } from '../public/ui/index.js'
import './profileDashboardLayout.css'

function LogoutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M10 6.5H7.5A2.5 2.5 0 0 0 5 9v6a2.5 2.5 0 0 0 2.5 2.5H10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13 8.5 18 12l-5 3.5M18 12H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default function ProfileDashboardContent({
  actions,
  feedback,
  heroHighlights,
  heroStats,
  profile,
  viewModel,
}) {
  const hasUpcomingTrip = Boolean(viewModel.upcomingTrip)
  const hasFavoriteDestinations = Array.isArray(viewModel.favoriteDestinations)
    ? viewModel.favoriteDestinations.length > 0
    : false
  const spotlightGridClassName =
    hasUpcomingTrip && hasFavoriteDestinations
      ? 'profile-dashboard__spotlight-grid'
      : 'profile-dashboard__spotlight-grid profile-dashboard__spotlight-grid--single'

  return (
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
        {hasUpcomingTrip || hasFavoriteDestinations ? (
          <div className={spotlightGridClassName}>
            {hasUpcomingTrip ? (
              <div className="profile-dashboard__spotlight-card">
                <UpcomingTripCard
                  onOpenPrimary={() => actions.openUpcomingTripPrimary(viewModel.upcomingTrip)}
                  onOpenSecondary={() =>
                    actions.openUpcomingTripSecondary(viewModel.upcomingTrip)
                  }
                  trip={viewModel.upcomingTrip}
                />
              </div>
            ) : null}

            {hasFavoriteDestinations ? (
              <div className="profile-dashboard__spotlight-card">
                <FavoriteDestinationsCard
                  destinations={viewModel.favoriteDestinations}
                  onOpenDestination={actions.openFavoriteDestination}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="profile-dashboard__section">
          <BookingHistoryList
            filters={viewModel.bookingHistoryFilters}
            items={viewModel.filteredBookingHistory}
            onOpenItem={actions.openBookingHistoryItem}
            onSelectFilter={actions.selectBookingHistoryFilter}
            resultsLabel={viewModel.bookingHistoryResultsLabel}
            selectedFilter={viewModel.bookingHistoryFilter}
          />
        </section>

        <section className="profile-dashboard__section">
          <ProfileAccountCenter />
        </section>

        <div className="profile-dashboard__utility-grid">
          <div className="profile-dashboard__utility-cell">
            <ProfileShortcutPanel
              description="Một vài công cụ nhỏ nhưng hữu ích để chuẩn bị chuyến đi nhanh hơn ngay từ tài khoản cá nhân."
              eyebrow="Tiện ích"
              items={viewModel.travelUtilities}
              onOpenItem={actions.openProfileShortcut}
              title="Tiện ích du lịch"
              tone="utility"
            />
          </div>

          <div className="profile-dashboard__utility-cell profile-dashboard__utility-cell--stack">
            <ProfileShortcutPanel
              description="Khi cần thêm thông tin hoặc hỗ trợ, bạn có thể bắt đầu từ các điểm chạm quen thuộc này."
              eyebrow="Hỗ trợ"
              items={viewModel.supportLinks}
              onOpenItem={actions.openProfileShortcut}
              title="Hỗ trợ"
              tone="support"
            />

            <div className="profile-dashboard__logout-area">
              <button
                className="profile-dashboard__logout-button"
                type="button"
                onClick={actions.logout}
              >
                <span className="profile-dashboard__logout-button-icon" aria-hidden="true">
                  <LogoutIcon />
                </span>

                <span className="profile-dashboard__logout-button-copy">
                  <strong>Đăng xuất</strong>
                  <small>Thoát phiên hiện tại</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
