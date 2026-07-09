import TrainCard from '../../components/trains/TrainCard.jsx'
import TrainFilterSidebar from '../../components/trains/TrainFilterSidebar.jsx'
import TrainSearchPanel from '../../components/trains/TrainSearchPanel.jsx'
import TrainSortBar from '../../components/trains/TrainSortBar.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
} from '../../components/public/ui/index.js'
import useTrainList from '../../hooks/useTrainList.js'

function TrainResultsFooter({ canLoadMore, isLoading, onLoadMore }) {
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

function TrainListPage() {
  const {
    applyFilters,
    currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    formatCurrency,
    hasMore,
    loading,
    openTrainDetail,
    resultSummary,
    retry,
    searchState,
    selectedSort,
    selectedTrainId,
    setFilter,
    setPage,
    setSort,
    selectTrain,
    submitSearch,
    trains,
    updatePassengers,
    updateSearchField,
    updateTripType,
  } = useTrainList()

  return (
    <div className="train-list-page">
      <section className="train-hero">
        <div className="train-hero__backdrop" aria-hidden="true" />
        <div className="train-hero__content">
          <h1>Khám phá Việt Nam</h1>
          <p>Hành trình vạn dặm, bắt đầu từ một bước chân cùng Nét Việt Travel.</p>
        </div>
      </section>

      <div className="train-list-page__search-shell">
        <TrainSearchPanel
          feedback={feedback}
          searchState={searchState}
          selectedSort={selectedSort}
          sortOptions={defaults.sort_options}
          stations={defaults.stations}
          updatePassengers={updatePassengers}
          updateSearchField={updateSearchField}
          updateTripType={updateTripType}
          onSortChange={setSort}
          onSubmit={submitSearch}
        />
      </div>

      <section className="train-list-page__body">
        <div className="train-list-page__layout">
          <TrainFilterSidebar
            draftFilters={draftFilters}
            onApply={applyFilters}
            onToggle={setFilter}
          />

          <div className="train-results">
            <TrainSortBar
              resultSummary={resultSummary}
              selectedSort={selectedSort}
              sortOptions={defaults.sort_options}
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
        </div>
      </section>
    </div>
  )
}

export default TrainListPage
