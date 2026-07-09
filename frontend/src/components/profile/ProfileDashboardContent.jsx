import BookingHistoryList from './BookingHistoryList.jsx'
import FavoriteDestinationsCard from './FavoriteDestinationsCard.jsx'
import ProfileHero from './ProfileHero.jsx'
import ProfileShortcutPanel from './ProfileShortcutPanel.jsx'
import UpcomingTripCard from './UpcomingTripCard.jsx'
import { PublicNotice } from '../public/ui/index.js'

export default function ProfileDashboardContent({
  actions,
  feedback,
  heroHighlights,
  heroStats,
  profile,
  viewModel,
}) {
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
  )
}
