import TrainCard from './TrainCard.jsx'
import TrainResultsFooter from './TrainResultsFooter.jsx'
import TrainSortBar from './TrainSortBar.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
} from '../public/ui/index.js'

export default function TrainResultsSection({
  currentPage,
  error,
  formatCurrency,
  hasMore,
  loading,
  openTrainDetail,
  resultSummary,
  retry,
  selectedSort,
  selectedTrainId,
  selectTrain,
  setPage,
  setSort,
  sortOptions,
  trains,
}) {
  return (
    <div className="train-results">
      <TrainSortBar
        resultSummary={resultSummary}
        selectedSort={selectedSort}
        sortOptions={sortOptions}
        onSortChange={setSort}
      />

      {error ? (
        <PublicErrorState
          action={
            <PublicButton className="train-results__retry" type="button" variant="secondary" onClick={retry}>
              Tải lại danh sách
            </PublicButton>
          }
          className="train-results__state"
          description={error}
          eyebrow="Kết nối thất bại"
          title="Không thể tải chuyến tàu lúc này"
        />
      ) : loading && !trains.length ? (
        <PublicLoadingBlock
          className="train-results__state"
          description="Danh sách đang được đọc từ mock adapter theo pattern API-ready hiện tại."
          rows={4}
          title="Đang tìm chuyến tàu phù hợp"
        />
      ) : trains.length ? (
        <>
          <div className="train-results__list">
            {trains.map((train) => (
              <TrainCard
                key={train.id}
                formatCurrency={formatCurrency}
                isSelected={selectedTrainId === train.id}
                train={train}
                onOpenDetail={openTrainDetail}
                onSelect={selectTrain}
              />
            ))}
          </div>

          <TrainResultsFooter
            canLoadMore={hasMore}
            isLoading={loading}
            onLoadMore={() => setPage(currentPage + 1)}
          />
        </>
      ) : (
        <PublicEmptyState
          className="train-results__state"
          description="Thử thay đổi ga đi, ga đến, ngày đi hoặc bộ lọc để xem thêm kết quả."
          eyebrow="Chưa có kết quả"
          title="Chưa có chuyến tàu phù hợp"
        />
      )}
    </div>
  )
}
