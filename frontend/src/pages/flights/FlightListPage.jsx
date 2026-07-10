import FlightCard from '../../components/flights/FlightCard.jsx'
import FlightFilterSidebar from '../../components/flights/FlightFilterSidebar.jsx'
import FlightSearchPanel from '../../components/flights/FlightSearchPanel.jsx'
import FlightSortBar from '../../components/flights/FlightSortBar.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicPagination,
} from '../../components/public/ui/index.js'
import useFlightList from '../../hooks/useFlightList.js'

function FlightResultsFooter({ currentPage, disabled = false, onPageChange, totalPages }) {
  return (
    <div className="flight-results__footer">
      <PublicPagination
        ariaLabel="Phân trang chuyến bay"
        currentPage={currentPage}
        disabled={disabled}
        onPageChange={onPageChange}
        totalPages={totalPages}
      />
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
    totalPages,
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
          <h1 className="flight-list-page__hero-title">Khám phá Việt Nam</h1>
          <p className="flight-list-page__hero-copy">
            Hành trình vạn dặm, bắt đầu từ một bước chân cùng Nét Việt Travel.
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
              <PublicErrorState
                action={
                  <PublicButton className="flight-results__retry" type="button" variant="secondary" onClick={retry}>
                    Tải lại danh sách
                  </PublicButton>
                }
                className="flight-results__state"
                description={error}
                eyebrow="Kết nối thất bại"
                title="Không thể tải chuyến bay lúc này"
              />
            ) : loading && !flights.length ? (
              <PublicLoadingBlock
                className="flight-results__state"
                description="Danh sách chuyến bay đang được tải từ hệ thống."
                rows={4}
                title="Đang tìm chuyến bay phù hợp"
              />
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
                  currentPage={currentPage}
                  disabled={loading}
                  onPageChange={setPage}
                  totalPages={totalPages}
                />
              </>
            ) : (
              <PublicEmptyState
                className="flight-results__state"
                description="Thử thay đổi điểm đi, điểm đến, ngày bay hoặc bộ lọc để xem thêm kết quả."
                eyebrow="Chưa có kết quả"
                title="Chưa có chuyến bay phù hợp"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default FlightListPage
