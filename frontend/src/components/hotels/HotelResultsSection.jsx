import HotelCard from './HotelCard.jsx'
import {
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicPagination,
  PublicSectionHeader,
} from '../public/ui/index.js'

export default function HotelResultsSection({
  currentPage,
  errorMessage,
  favoriteIds,
  formatCurrency,
  handlePageChange,
  handleSortChange,
  handleToggleFavorite,
  isLoading,
  resultSummary,
  selectedSort,
  sortOptions,
  totalPages,
  visibleHotels,
}) {
  return (
    <div className="hotel-results">
      <div className="hotel-results__header">
        <PublicSectionHeader
          eyebrow="Khách sạn"
          subtitle={resultSummary}
          title="Khách sạn nổi bật"
        />

        <label className="hotel-results__sort">
          <span>Sắp xếp:</span>
          <select value={selectedSort} onChange={handleSortChange}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage ? (
        <PublicErrorState
          className="hotel-results__state"
          description={errorMessage}
          eyebrow="Kết nối thất bại"
          title="Không thể tải danh sách khách sạn"
        />
      ) : isLoading ? (
        <PublicLoadingBlock
          className="hotel-results__state"
          rows={4}
        />
      ) : visibleHotels.length ? (
        <>
          <div className="hotel-results__grid">
            {visibleHotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                formatCurrency={formatCurrency}
                hotel={hotel}
                isFavorite={favoriteIds.includes(hotel.id)}
                ratingValue={hotel.displayRatingValue}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>

          <PublicPagination
            ariaLabel="Phân trang khách sạn"
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <PublicEmptyState
          className="hotel-results__state"
          description="Thử điều chỉnh tìm kiếm hoặc áp dụng bộ lọc khác để xem thêm lựa chọn."
          eyebrow="Chưa có kết quả"
          title="Chưa có khách sạn phù hợp"
        />
      )}
    </div>
  )
}
