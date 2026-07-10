import FlightCard from './FlightCard.jsx'
import FlightResultsFooter from './FlightResultsFooter.jsx'
import FlightSortBar from './FlightSortBar.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
} from '../public/ui/index.js'

export default function FlightResultsSection({
  currentPage,
  error,
  flights,
  formatCurrency,
  loading,
  openFlightDetail,
  resultSummary,
  retry,
  selectFlight,
  selectedFlightId,
  selectedSort,
  setPage,
  setSort,
  sortOptions,
  totalPages,
}) {
  return (
    <div className="flight-results">
      <FlightSortBar
        resultSummary={resultSummary}
        selectedSort={selectedSort}
        sortOptions={sortOptions}
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
  )
}
