import TrainCard from '../../components/trains/TrainCard.jsx'
import TrainFilterSidebar from '../../components/trains/TrainFilterSidebar.jsx'
import TrainSearchPanel from '../../components/trains/TrainSearchPanel.jsx'
import TrainSortBar from '../../components/trains/TrainSortBar.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicPagination,
} from '../../components/public/ui/index.js'
import useTrainList from '../../hooks/useTrainList.js'

function TrainResultsFooter({ currentPage, disabled = false, onPageChange, totalPages }) {
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

function TrainListPage() {
  const {
    applyFilters,
    currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    formatCurrency,
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
    totalPages,
    trains,
    updatePassengers,
    updateSearchField,
    updateTripType,
  } = useTrainList()

  return (
    <div className="train-list-page">
      <section className="flight-list-page__hero">
        <div className="flight-list-page__hero-overlay" />
        <img
          alt="Tàu hỏa trên hành trình du lịch Việt Nam"
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
                description="Danh sách chuyến tàu đang được cập nhật."
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
                  currentPage={currentPage}
                  disabled={loading}
                  onPageChange={setPage}
                  totalPages={totalPages}
                />
              </>
            ) : resultSummary.hasRoute ? (
              <PublicEmptyState
                className="train-results__state"
                description="Thử thay đổi ga đi, ga đến, ngày đi hoặc bộ lọc để xem thêm kết quả."
                eyebrow="Chưa có kết quả"
                title="Chưa có chuyến tàu phù hợp"
              />
            ) : (
              <PublicEmptyState
                className="train-results__state"
                description="Hiện chưa có vé tàu nào đang mở bán để hiển thị."
                eyebrow="Danh sách trống"
                title="Chưa có vé tàu khả dụng"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default TrainListPage
