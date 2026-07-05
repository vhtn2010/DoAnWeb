import { Link } from 'react-router-dom'
import FlightCard from '../../components/flights/FlightCard.jsx'
import FlightFilterSidebar from '../../components/flights/FlightFilterSidebar.jsx'
import FlightSearchPanel from '../../components/flights/FlightSearchPanel.jsx'
import FlightSortBar from '../../components/flights/FlightSortBar.jsx'
import useFlightList from '../../hooks/useFlightList.js'

function FlightPagination({ currentPage, totalPages, onPageChange }) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className="flight-pagination" aria-label="Phân trang chuyến bay">
      <button
        aria-label="Trang trước"
        className="flight-pagination__button"
        disabled={currentPage === 1}
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
      >
        ‹
      </button>

      {pageNumbers.map((pageNumber) => (
        <button
          aria-current={pageNumber === currentPage ? 'page' : undefined}
          className={`flight-pagination__button ${
            pageNumber === currentPage ? 'flight-pagination__button--active' : ''
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
        className="flight-pagination__button"
        disabled={currentPage === totalPages}
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
      >
        ›
      </button>
    </div>
  )
}

function FlightListPage() {
  const {
    applyFilters,
    breadcrumbHomePath,
    continueBookingMock,
    currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    flights,
    formatCurrency,
    goToFlightDetail,
    loading,
    pagination,
    resetFilters,
    resultSummary,
    retry,
    searchState,
    selectFlight,
    selectedFlightId,
    selectedSort,
    setFilter,
    setPage,
    setSort,
    submitSearch,
    updatePassengers,
    updateSearchField,
    updateTripType,
  } = useFlightList()

  return (
    <div className="flight-list-page">
      <section className="flight-list-page__hero">
        <div className="flight-list-page__hero-overlay" />
        <img
          alt="Máy bay cất cánh cho hành trình du lịch"
          className="flight-list-page__hero-image"
          src="/assets/template/home/v39_1669.png"
        />
        <div className="flight-list-page__hero-content">
          <div className="flight-list-page__breadcrumb">
            <Link className="flight-list-page__breadcrumb-link" to={breadcrumbHomePath}>
              Trang chủ
            </Link>
            <span aria-hidden="true">›</span>
            <span>Đặt vé máy bay</span>
          </div>
          <h1 className="flight-list-page__hero-title">Đặt vé máy bay</h1>
          <p className="flight-list-page__hero-copy">
            Tìm chuyến bay theo dữ liệu mock với pattern API-ready để tiếp tục giỏ hàng và checkout.
          </p>
        </div>
      </section>

      <div className="flight-list-page__search-shell">
        <FlightSearchPanel
          airports={defaults.airports}
          cabinClasses={defaults.cabin_classes}
          feedback={feedback}
          searchState={searchState}
          updatePassengers={updatePassengers}
          updateSearchField={updateSearchField}
          updateTripType={updateTripType}
          onSubmit={submitSearch}
        />
      </div>

      <section className="flight-list-page__body">
        <div className="flight-list-page__layout">
          <FlightFilterSidebar
            airlineOptions={defaults.airlines}
            draftFilters={draftFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            onToggle={setFilter}
          />

          <div className="flight-results">
            <FlightSortBar
              resultSummary={resultSummary}
              selectedSort={selectedSort}
              sortOptions={defaults.sort_options}
              onSortChange={setSort}
            />

            {error ? (
              <div className="flight-results__empty" role="alert">
                <h3>Không thể tải chuyến bay</h3>
                <p>{error}</p>
                <button className="flight-results__retry" type="button" onClick={retry}>
                  Tải lại
                </button>
              </div>
            ) : loading ? (
              <div className="flight-results__empty" role="status">
                <h3>Đang tải chuyến bay</h3>
                <p>Dữ liệu đang được đọc từ mock adapter theo API-ready pattern.</p>
              </div>
            ) : flights.length ? (
              <>
                <div className="flight-results__list">
                  {flights.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      feedbackMessage={selectedFlightId === flight.id ? feedback.message : ''}
                      flight={flight}
                      formatCurrency={formatCurrency}
                      isSelected={selectedFlightId === flight.id}
                      onContinueBooking={continueBookingMock}
                      onSelect={selectFlight}
                      onViewDetail={goToFlightDetail}
                    />
                  ))}
                </div>

                <FlightPagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </>
            ) : (
              <div className="flight-results__empty" role="status">
                <h3>Chưa có chuyến bay phù hợp</h3>
                <p>Thử thay đổi điểm đi, điểm đến, ngày bay hoặc bộ lọc để xem thêm kết quả.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default FlightListPage
