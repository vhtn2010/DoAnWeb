import { Link } from 'react-router-dom'
import HotelCard from '../../components/hotels/HotelCard.jsx'
import HotelFilterSidebar from '../../components/hotels/HotelFilterSidebar.jsx'
import HotelSearchBar from '../../components/hotels/HotelSearchBar.jsx'
import useHotelList from '../../hooks/useHotelList.js'

function HotelPagination({ currentPage, totalPages, onPageChange }) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className="hotel-pagination" aria-label="Phân trang khách sạn">
      <button
        aria-label="Trang trước"
        className="hotel-pagination__button"
        disabled={currentPage === 1}
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
      >
        ‹
      </button>

      {pageNumbers.map((pageNumber) => (
        <button
          aria-current={pageNumber === currentPage ? 'page' : undefined}
          className={`hotel-pagination__button ${
            pageNumber === currentPage ? 'hotel-pagination__button--active' : ''
          }`}
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}

      <button
        aria-label="Trang sau"
        className="hotel-pagination__button"
        disabled={currentPage === totalPages}
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
      >
        ›
      </button>
    </div>
  )
}

function HotelListPage() {
  const {
    breadcrumbHomePath,
    currentPage,
    errorMessage,
    favoriteIds,
    feedbackMessage,
    filterDraft,
    formatCurrency,
    handleApplyFilters,
    handleApplySearch,
    handleBookNow,
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
        {feedbackMessage ? (
          <p className="hotel-list-page__feedback" role="status">
            {feedbackMessage}
          </p>
        ) : null}

        <div className="hotel-list-page__layout">
          <HotelFilterSidebar
            filters={filterDraft}
            onApply={handleApplyFilters}
            onLocationChange={handleSidebarLocationChange}
            onToggleFilter={handleToggleFilter}
          />

          <div className="hotel-results">
            <div className="hotel-results__header">
              <div>
                <h2 className="hotel-results__title">Khách sạn nổi bật</h2>
                <p className="hotel-results__summary">{resultSummary}</p>
              </div>

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
              <div className="hotel-results__empty" role="alert">
                <h3>Không thể tải danh sách khách sạn</h3>
                <p>{errorMessage}</p>
              </div>
            ) : isLoading ? (
              <div className="hotel-results__empty" role="status">
                <h3>Đang tải khách sạn</h3>
                <p>Danh sách đang được đọc từ mock adapter theo API-ready pattern.</p>
              </div>
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
                      onBookNow={handleBookNow}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>

                <HotelPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <div className="hotel-results__empty" role="status">
                <h3>Chưa có khách sạn phù hợp</h3>
                <p>Thử điều chỉnh tìm kiếm hoặc áp dụng bộ lọc khác để xem thêm lựa chọn.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HotelListPage
