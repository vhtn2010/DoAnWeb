import FlightCard from '../../components/flights/FlightCard.jsx'
import FlightFilterSidebar from '../../components/flights/FlightFilterSidebar.jsx'
import FlightSearchPanel from '../../components/flights/FlightSearchPanel.jsx'
import FlightSortBar from '../../components/flights/FlightSortBar.jsx'
import useFlightList from '../../hooks/useFlightList.js'

function FlightResultsFooter({ canLoadMore, isLoading, onLoadMore }) {
  return (
    <div className="flight-results__footer">
      <button
        className="flight-results__load-more"
        disabled={!canLoadMore || isLoading}
        type="button"
        onClick={onLoadMore}
      >
        <span>Xem thêm chuyến bay</span>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  )
}

function FlightListPage() {
  const {
    applyFilters,
    currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    flights,
    formatCurrency,
    hasMore,
    loading,
    openFlightDetail,
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
  const searchPanelFeedback = selectedFlightId ? { tone: feedback.tone, message: '' } : feedback

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
          <p className="flight-list-page__hero-eyebrow">VivuTrip Flight</p>
          <h1 className="flight-list-page__hero-title">Khám phá Việt Nam</h1>
          <p className="flight-list-page__hero-copy">
            Hành trình vạn dặm, bắt đầu từ một bước chân cùng VivuTrip.
          </p>
        </div>
      </section>

      <div className="flight-list-page__search-shell">
        <FlightSearchPanel
          airports={defaults.airports}
          feedback={searchPanelFeedback}
          searchState={searchState}
          selectedSort={selectedSort}
          sortOptions={defaults.sort_options}
          updatePassengers={updatePassengers}
          updateSearchField={updateSearchField}
          updateTripType={updateTripType}
          onSortChange={setSort}
          onSubmit={submitSearch}
        />
      </div>

      <section className="flight-list-page__body">
        <div className="flight-list-page__layout">
          <FlightFilterSidebar
            airlineOptions={defaults.airlines}
            draftFilters={draftFilters}
            onApply={applyFilters}
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
                <h3>Không thể tải chuyến bay lúc này</h3>
                <p>{error}</p>
                <button className="flight-results__retry" type="button" onClick={retry}>
                  Tải lại danh sách
                </button>
              </div>
            ) : loading && !flights.length ? (
              <div className="flight-results__empty" role="status">
                <h3>Đang tìm chuyến bay phù hợp</h3>
                <p>Danh sách chuyến bay đang được tải từ hệ thống.</p>
              </div>
            ) : flights.length ? (
              <>
                <div className="flight-results__list">
                  {flights.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      formatCurrency={formatCurrency}
                      isSelected={selectedFlightId === flight.id}
                      onOpenDetail={openFlightDetail}
                      onSelect={selectFlight}
                    />
                  ))}
                </div>

                <FlightResultsFooter
                  canLoadMore={hasMore}
                  isLoading={loading}
                  onLoadMore={() => setPage(currentPage + 1)}
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
