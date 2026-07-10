import BookingHistoryList from './BookingHistoryList.jsx'
import FavoriteDestinationsCard from './FavoriteDestinationsCard.jsx'
import ProfileAccountCenter from './ProfileAccountCenter.jsx'
import ProfileHero from './ProfileHero.jsx'
import ProfileShortcutPanel from './ProfileShortcutPanel.jsx'
import UpcomingTripCard from './UpcomingTripCard.jsx'
import { PublicNotice } from '../public/ui/index.js'
import './profileDashboardLayout.css'

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

          <div className="profile-dashboard__utility-cell">
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
      </div>
    </>
  )
}
