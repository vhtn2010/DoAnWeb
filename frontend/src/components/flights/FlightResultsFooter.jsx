import { PublicButton } from '../public/ui/index.js'

export default function FlightResultsFooter({ canLoadMore, isLoading, onLoadMore }) {
  return (
    <div className="flight-results__footer">
      <PublicButton
        className="flight-results__load-more"
        disabled={!canLoadMore || isLoading}
        loading={isLoading}
        variant="secondary"
        type="button"
        onClick={onLoadMore}
      >
        <span>Xem thêm chuyến bay</span>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </PublicButton>
    </div>
  )
}
