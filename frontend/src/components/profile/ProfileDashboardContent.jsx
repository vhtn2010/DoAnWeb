import ProfileAccountCenter from './ProfileAccountCenter.jsx'
import ProfileHero from './ProfileHero.jsx'
import ProfileShortcutPanel from './ProfileShortcutPanel.jsx'
import { PROFILE_HISTORY_FILTERS } from '../../constants/profile.js'
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
  const bookingHistoryFilterCounts = (viewModel.bookingHistoryFilters ?? []).reduce(
    (result, filter) => ({
      ...result,
      [filter.id]: filter.count,
    }),
    {},
  )
  const historyEntry = {
    description: 'Xem nhanh các đơn chờ duyệt, chờ thanh toán và lịch sử đặt chỗ của bạn.',
    metrics: [
      [PROFILE_HISTORY_FILTERS.all, 'tất cả'],
      [PROFILE_HISTORY_FILTERS.pending_confirmation, 'chờ duyệt'],
      [PROFILE_HISTORY_FILTERS.upcoming, 'sắp tới'],
      [PROFILE_HISTORY_FILTERS.booking_history, 'đã đặt'],
      [PROFILE_HISTORY_FILTERS.cancelled, 'đã hủy'],
    ].map(([id, label]) => ({
      id,
      label,
      value: bookingHistoryFilterCounts[id] ?? 0,
    })),
  }

  return (
    <>
      <ProfileHero
        accountCenterContent={<ProfileAccountCenter />}
        favoriteDestinations={viewModel.favoriteDestinations}
        greeting={viewModel.greeting}
        highlights={heroHighlights}
        historyEntry={historyEntry}
        onOpenFavoriteDestination={actions.openFavoriteDestination}
        onOpenHistory={actions.openBookingHistoryPage}
        onOpenUpcomingTripPrimary={() => actions.openUpcomingTripPrimary(viewModel.upcomingTrip)}
        onOpenUpcomingTripSecondary={() =>
          actions.openUpcomingTripSecondary(viewModel.upcomingTrip)
        }
        onProfileUpdated={actions.applyProfileUpdate}
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
