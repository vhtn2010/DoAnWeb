import { PROFILE_HISTORY_FILTERS } from '../../constants/profile.js'
import BookingHistoryList from '../../components/profile/BookingHistoryList.jsx'
import ProfileStateStack from '../../components/profile/ProfileStateStack.jsx'
import { PublicButton } from '../../components/public/ui/index.js'
import useProfile from '../../hooks/useProfile.js'

function ProfileOrdersPage() {
  const {
    actions,
    error,
    isCustomerPreview,
    loading,
    viewModel,
  } = useProfile()

  const selectedFilter = viewModel.bookingHistoryFilter ?? PROFILE_HISTORY_FILTERS.all
  const visibleItems = viewModel.bookingHistoryFilter
    ? viewModel.filteredBookingHistory
    : viewModel.bookingHistory
  const resultsLabel = `${visibleItems.length} đơn hàng`

  return (
    <div className="profile-page profile-page--orders">
      <div className="profile-shell">
        <ProfileStateStack
          actions={actions}
          error={error}
          isCustomerPreview={isCustomerPreview}
          loading={loading}
        />

        {!loading && isCustomerPreview && !error ? (
          <main className="profile-orders-page">
            <div className="profile-orders-page__topbar">
              <button
                className="profile-orders-page__back"
                type="button"
                onClick={() => actions.goProfile()}
              >
                <span aria-hidden="true">‹</span>
                <span>Quay lại hồ sơ</span>
              </button>
            </div>

            <BookingHistoryList
              filters={viewModel.bookingHistoryFilters}
              items={visibleItems}
              onOpenItem={actions.openBookingHistoryItem}
              onSelectFilter={actions.selectBookingHistoryFilter}
              resultsLabel={resultsLabel}
              selectedFilter={selectedFilter}
            />

            <PublicButton
              className="profile-orders-page__fallback"
              type="button"
              variant="ghost"
              onClick={() => actions.goProfile()}
            >
              Về trang hồ sơ
            </PublicButton>
          </main>
        ) : null}
      </div>
    </div>
  )
}

export default ProfileOrdersPage
