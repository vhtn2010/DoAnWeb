import {
  PROFILE_HISTORY_FILTER_LABELS,
  PROFILE_HISTORY_FILTERS,
} from '../../constants/profile.js'
import BookingHistoryItem from './BookingHistoryItem.jsx'

const EMPTY_HISTORY_COPY = Object.freeze({
  [PROFILE_HISTORY_FILTERS.all]: {
    title: 'Chưa có đơn hàng nào để hiển thị',
    description: 'Khi bạn đặt tour, vé hoặc khách sạn, lịch sử sẽ xuất hiện tại đây.',
  },
  [PROFILE_HISTORY_FILTERS.pending_confirmation]: {
    title: 'Không có yêu cầu hủy nào đang chờ xác nhận',
    description: 'Các yêu cầu hủy đơn mới sẽ được cập nhật ngay khi hệ thống ghi nhận.',
  },
  [PROFILE_HISTORY_FILTERS.upcoming]: {
    title: 'Chưa có chuyến đi sắp tới',
    description: 'Những đơn đã xác nhận cho hành trình tiếp theo sẽ hiện trong mục này.',
  },
  [PROFILE_HISTORY_FILTERS.booking_history]: {
    title: 'Chưa có lịch sử đặt chỗ hoàn tất',
    description: 'Các đơn đã đi hoặc đã sử dụng xong sẽ được lưu lại để bạn xem lại nhanh hơn.',
  },
  [PROFILE_HISTORY_FILTERS.cancelled]: {
    title: 'Chưa có đơn hàng đã hủy',
    description: 'Nếu bạn hủy đặt chỗ hoặc hoàn tiền thành công, thông tin sẽ hiển thị tại đây.',
  },
})

function BookingHistoryList({
  filters = [],
  items = [],
  onOpenItem,
  onSelectFilter,
  resultsLabel,
  selectedFilter = null,
}) {
  const hasSelectedFilter = Boolean(selectedFilter)
  const emptyState =
    EMPTY_HISTORY_COPY[selectedFilter] ?? EMPTY_HISTORY_COPY[PROFILE_HISTORY_FILTERS.all]
  const activeFilterLabel =
    PROFILE_HISTORY_FILTER_LABELS[selectedFilter] ??
    PROFILE_HISTORY_FILTER_LABELS[PROFILE_HISTORY_FILTERS.all]

  return (
    <section className="profile-history">
      <header className="profile-history__header">
        <div className="profile-history__heading">
          <p className="profile-history__eyebrow">Theo dõi đơn hàng</p>
          <h2>Lịch sử đơn hàng</h2>
          <p className="profile-history__description">
            Chỉ cần chọn một bộ lọc để mở đúng nhóm dịch vụ bạn muốn xem, từ đơn chờ
            xác nhận hủy đến các chuyến đi sắp tới.
          </p>
        </div>

        {resultsLabel ? (
          <span className="profile-history__result-pill" aria-live="polite">
            {resultsLabel}
          </span>
        ) : null}
      </header>

      <div className="profile-history__filters" role="toolbar" aria-label="Bộ lọc lịch sử đơn hàng">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={
              selectedFilter === filter.id
                ? 'profile-history__filter profile-history__filter--active'
                : 'profile-history__filter'
            }
            type="button"
            aria-pressed={selectedFilter === filter.id}
            onClick={() => onSelectFilter(filter.id)}
          >
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </div>

      {hasSelectedFilter && items.length ? (
        <div className="profile-history__list">
          {items.map((item) => (
            <BookingHistoryItem key={item.id} item={item} onOpen={onOpenItem} />
          ))}
        </div>
      ) : null}

      {hasSelectedFilter && !items.length ? (
        <div className="profile-history__empty" role="status">
          <strong>{emptyState.title}</strong>
          <p>{emptyState.description}</p>
          <span>{activeFilterLabel}</span>
        </div>
      ) : null}
    </section>
  )
}

export default BookingHistoryList
