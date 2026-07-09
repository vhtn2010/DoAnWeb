import { PublicButton } from '../public/ui/index.js'

export default function TrainResultsFooter({ canLoadMore, isLoading, onLoadMore }) {
  return (
    <div className="train-results__footer">
      <PublicButton
        className="train-results__load-more"
        disabled={!canLoadMore || isLoading}
        loading={isLoading}
        variant="secondary"
        type="button"
        onClick={onLoadMore}
      >
        <span>Xem thêm chuyến tàu</span>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </PublicButton>
    </div>
  )
}
