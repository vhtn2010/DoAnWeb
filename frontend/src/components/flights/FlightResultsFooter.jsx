import { PublicPagination } from '../public/ui/index.js'

export default function FlightResultsFooter({ currentPage, disabled = false, onPageChange, totalPages }) {
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
