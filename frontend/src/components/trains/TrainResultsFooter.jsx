import { PublicPagination } from '../public/ui/index.js'

export default function TrainResultsFooter({ currentPage, disabled = false, onPageChange, totalPages }) {
  return (
    <div className="train-results__footer">
      <PublicPagination
        ariaLabel="Phân trang chuyến tàu"
        currentPage={currentPage}
        disabled={disabled}
        onPageChange={onPageChange}
        totalPages={totalPages}
      />
    </div>
  )
}
