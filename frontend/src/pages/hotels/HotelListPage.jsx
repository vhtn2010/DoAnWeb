import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import HotelCard from '../../components/hotels/HotelCard.jsx'
import HotelFilterSidebar from '../../components/hotels/HotelFilterSidebar.jsx'
import HotelSearchBar from '../../components/hotels/HotelSearchBar.jsx'
import {
  buildHotelSearchParams,
  filterHotelServices,
  formatCurrencyVND,
  getHotelRatingValue,
  hotelSortOptions,
  mockHotelServices,
  sortHotelServices,
} from '../../data/mockHotels.js'

const hotelsPerPage = 4

function parseArraySearchParam(searchParams, key) {
  const value = searchParams.get(key)

  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createInitialSearchState(searchParams) {
  return {
    location: searchParams.get('location') ?? 'TP. Hồ Chí Minh (SGN)',
    checkin: searchParams.get('checkin') ?? '15-10-2026',
    checkout: searchParams.get('checkout') ?? '17-10-2026',
  }
}

function createInitialAppliedSearchState(searchParams) {
  if (
    searchParams.get('location') ||
    searchParams.get('checkin') ||
    searchParams.get('checkout')
  ) {
    return {
      location: searchParams.get('location') ?? '',
      checkin: searchParams.get('checkin') ?? '',
      checkout: searchParams.get('checkout') ?? '',
    }
  }

  return {
    location: '',
    checkin: '',
    checkout: '',
  }
}

function createInitialFilterState(searchParams) {
  return {
    sidebarLocation: searchParams.get('destination') ?? '',
    priceRanges: parseArraySearchParam(searchParams, 'prices'),
    durations: parseArraySearchParam(searchParams, 'durations'),
    starRatings: parseArraySearchParam(searchParams, 'stars'),
  }
}

function buildPreviewPath(path, isCustomer) {
  return isCustomer ? `${path}?auth=customer` : path
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const authState = searchParams.get('auth') === 'customer' ? 'customer' : 'guest'
  const isCustomer = authState === 'customer'

  const [searchDraft, setSearchDraft] = useState(() => createInitialSearchState(searchParams))
  const [appliedSearch, setAppliedSearch] = useState(() =>
    createInitialAppliedSearchState(searchParams)
  )
  const [filterDraft, setFilterDraft] = useState(() => createInitialFilterState(searchParams))
  const [appliedFilters, setAppliedFilters] = useState(() => createInitialFilterState(searchParams))
  const [selectedSort, setSelectedSort] = useState(() => searchParams.get('sort') ?? 'recommended')
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page') ?? 1))
  const [favoriteIds, setFavoriteIds] = useState([])
  const [feedbackMessage, setFeedbackMessage] = useState('')

  // TODO: replace mock hotel list with GET /services?type=hotel in API integration phase.
  const filteredHotels = filterHotelServices(mockHotelServices, {
    searchLocation: appliedSearch.location,
    sidebarLocation: appliedFilters.sidebarLocation,
    priceRanges: appliedFilters.priceRanges,
    durations: appliedFilters.durations,
    starRatings: appliedFilters.starRatings,
  })
  const sortedHotels = sortHotelServices(filteredHotels, selectedSort)
  const totalPages = Math.max(1, Math.ceil(sortedHotels.length / hotelsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const visibleHotels = sortedHotels.slice(
    (safeCurrentPage - 1) * hotelsPerPage,
    safeCurrentPage * hotelsPerPage,
  )

  function syncSearchParams({
    nextSearch = appliedSearch,
    nextFilters = appliedFilters,
    nextSort = selectedSort,
    nextPage = safeCurrentPage,
  } = {}) {
    setSearchParams(
      buildHotelSearchParams({
        auth: isCustomer ? 'customer' : '',
        location: nextSearch.location,
        checkin: nextSearch.checkin,
        checkout: nextSearch.checkout,
        sidebarLocation: nextFilters.sidebarLocation,
        prices: nextFilters.priceRanges,
        durations: nextFilters.durations,
        stars: nextFilters.starRatings,
        sort: nextSort,
        page: nextPage,
      }),
    )
  }

  function handleSearchFieldChange(event) {
    const { name, value } = event.target

    setSearchDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }))
  }

  function handleApplySearch() {
    // TODO: replace local filter with GET /services?type=hotel&location&min_price&max_price&sort&page&limit.
    const nextSearch = { ...searchDraft }
    setAppliedSearch(nextSearch)
    setCurrentPage(1)
    syncSearchParams({ nextSearch, nextPage: 1 })
  }

  function handleSidebarLocationChange(event) {
    const { value } = event.target

    setFilterDraft((currentDraft) => ({
      ...currentDraft,
      sidebarLocation: value,
    }))
  }

  function handleToggleFilter(filterKey, value) {
    setFilterDraft((currentDraft) => ({
      ...currentDraft,
      [filterKey]: currentDraft[filterKey].includes(value)
        ? currentDraft[filterKey].filter((currentValue) => currentValue !== value)
        : [...currentDraft[filterKey], value],
    }))
  }

  function handleApplyFilters() {
    const nextFilters = {
      ...filterDraft,
      priceRanges: [...filterDraft.priceRanges],
      durations: [...filterDraft.durations],
      starRatings: [...filterDraft.starRatings],
    }

    setAppliedFilters(nextFilters)
    setCurrentPage(1)
    syncSearchParams({ nextFilters, nextPage: 1 })
  }

  function handleSortChange(event) {
    const nextSort = event.target.value
    setSelectedSort(nextSort)
    setCurrentPage(1)
    syncSearchParams({ nextSort, nextPage: 1 })
  }

  function handlePageChange(nextPage) {
    setCurrentPage(nextPage)
    syncSearchParams({ nextPage })
  }

  function handleToggleFavorite(hotelId) {
    setFavoriteIds((currentIds) =>
      currentIds.includes(hotelId)
        ? currentIds.filter((currentId) => currentId !== hotelId)
        : [...currentIds, hotelId],
    )
  }

  function handleBookNow() {
    // TODO: check hotel room availability with POST /services/{service_id}/availability when booking integration is implemented.
    // TODO: load room types with GET /services/{hotel_service_id}/rooms in HotelDetailPage.
    setFeedbackMessage('Chi tiết khách sạn sẽ được hoàn thiện ở Task 17B.')
  }

  const breadcrumbHomePath = buildPreviewPath('/', isCustomer)

  const resultSummary = useMemo(() => {
    if (!filteredHotels.length) {
      return 'Chưa có khách sạn phù hợp với bộ lọc hiện tại.'
    }

    return `Hiển thị ${visibleHotels.length} trong ${filteredHotels.length} khách sạn nổi bật`
  }, [filteredHotels.length, visibleHotels.length])

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
          onChange={handleSearchFieldChange}
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
                  {hotelSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleHotels.length ? (
              <>
                <div className="hotel-results__grid">
                  {visibleHotels.map((hotel) => (
                    <HotelCard
                      key={hotel.id}
                      formatCurrency={formatCurrencyVND}
                      hotel={hotel}
                      isFavorite={favoriteIds.includes(hotel.id)}
                      ratingValue={getHotelRatingValue(hotel.id)}
                      onBookNow={handleBookNow}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>

                <HotelPagination
                  currentPage={safeCurrentPage}
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
