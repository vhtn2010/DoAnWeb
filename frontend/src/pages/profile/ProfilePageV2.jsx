import { PROFILE_HISTORY_FILTERS } from '../../constants/profile.js'
import ProfileDashboardContent from '../../components/profile/ProfileDashboardContent.jsx'
import ProfileStateStack from '../../components/profile/ProfileStateStack.jsx'
import useProfile from '../../hooks/useProfile.js'

function ProfilePageV2() {
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

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <ProfileStateStack
          actions={actions}
          error={error}
          isCustomerPreview={isCustomerPreview}
          loading={loading}
        />

        {!loading && isCustomerPreview && !error ? (
          <ProfileDashboardContent
            actions={actions}
            feedback={feedback}
            heroHighlights={heroHighlights}
            heroStats={heroStats}
            profile={profile}
            viewModel={viewModel}
          />
        ) : null}
      </div>
    </div>
  )
}

export default ProfilePageV2
