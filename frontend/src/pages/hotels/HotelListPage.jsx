import { Link } from 'react-router-dom'
import HotelCard from '../../components/hotels/HotelCard.jsx'
import HotelFilterSidebar from '../../components/hotels/HotelFilterSidebar.jsx'
import HotelSearchBar from '../../components/hotels/HotelSearchBar.jsx'
import {
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicPagination,
  PublicSectionHeader,
} from '../../components/public/ui/index.js'
import useHotelList from '../../hooks/useHotelList.js'

function HotelListPage() {
  const {
    breadcrumbHomePath,
    currentPage,
    errorMessage,
    favoriteIds,
    filterDraft,
    formatCurrency,
    handleApplyFilters,
    handleApplySearch,
    handlePageChange,
    handleSearchFieldChange,
    handleSidebarLocationChange,
    handleSortChange,
    handleToggleFavorite,
    handleToggleFilter,
    isLoading,
    resultSummary,
    searchDraft,
    selectedSort,
    sortOptions,
    totalPages,
    visibleHotels,
  } = useHotelList()

  return (
    <div className="hotel-list-page">
      <section className="hotel-list-page__hero">
        <img
          alt="Không gian thiên nhiên và núi đồi"
          className="hotel-list-page__hero-image"
          src="/assets/template/service/list/hero-terrace.png"
        />
        <div className="hotel-list-page__hero-overlay" />
        <div className="hotel-list-page__hero-content">
          <div className="hotel-list-page__breadcrumb">
            <Link className="hotel-list-page__breadcrumb-link" to={breadcrumbHomePath}>
              Trang chủ
            </Link>
            <span aria-hidden="true">›</span>
            <span>Danh sách Khách sạn</span>
          </div>
          <h1 className="hotel-list-page__hero-title">Khách sạn</h1>
        </div>
      </section>

      <div className="hotel-list-page__search-shell">
        <HotelSearchBar
          searchValues={searchDraft}
          onFieldChange={handleSearchFieldChange}
          onSubmit={handleApplySearch}
        />
      </div>

      <section className="hotel-list-page__body">
        <div className="hotel-list-page__layout">
          <HotelFilterSidebar
            filters={filterDraft}
            onApply={handleApplyFilters}
            onLocationChange={handleSidebarLocationChange}
            onToggleFilter={handleToggleFilter}
          />

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
        </div>
      </section>
    </div>
  )
}

export default HotelListPage
