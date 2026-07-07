import TrainCard from '../../components/trains/TrainCard.jsx'
import TrainFilterSidebar from '../../components/trains/TrainFilterSidebar.jsx'
import TrainSearchPanel from '../../components/trains/TrainSearchPanel.jsx'
import TrainSortBar from '../../components/trains/TrainSortBar.jsx'
import useTrainList from '../../hooks/useTrainList.js'

function TrainResultsFooter({ canLoadMore, isLoading, onLoadMore }) {
  return (
    <div className="train-results__footer">
      <button
        className="train-results__load-more"
        disabled={!canLoadMore || isLoading}
        type="button"
        onClick={onLoadMore}
      >
        <span>Xem thêm chuyến tàu</span>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </button>
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
              <div className="train-results__state" role="alert">
                <h3>Không thể tải chuyến tàu lúc này</h3>
                <p>{error}</p>
                <button className="train-results__retry" type="button" onClick={retry}>
                  Tải lại danh sách
                </button>
              </div>
            ) : loading && !trains.length ? (
              <div className="train-results__state" role="status">
                <h3>Đang tìm chuyến tàu phù hợp</h3>
                <p>Danh sách đang được đọc từ mock adapter theo pattern API-ready hiện tại.</p>
              </div>
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
              <div className="train-results__state" role="status">
                <h3>Chưa có chuyến tàu phù hợp</h3>
                <p>Thử thay đổi ga đi, ga đến, ngày đi hoặc bộ lọc để xem thêm kết quả.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default TrainListPage
