import TrainFilterSidebar from '../../components/trains/TrainFilterSidebar.jsx'
import TrainListHero from '../../components/trains/TrainListHero.jsx'
import TrainResultsSection from '../../components/trains/TrainResultsSection.jsx'
import TrainSearchPanel from '../../components/trains/TrainSearchPanel.jsx'
import useTrainList from '../../hooks/useTrainList.js'

function TrainListPageV2() {
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
      <TrainListHero />

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

          <TrainResultsSection
            currentPage={currentPage}
            error={error}
            formatCurrency={formatCurrency}
            loading={loading}
            openTrainDetail={openTrainDetail}
            resultSummary={resultSummary}
            retry={retry}
            selectedSort={selectedSort}
            selectedTrainId={selectedTrainId}
            selectTrain={selectTrain}
            setPage={setPage}
            setSort={setSort}
            sortOptions={defaults.sort_options}
            totalPages={totalPages}
            trains={trains}
          />
        </div>
      </section>
    </div>
  )
}

export default TrainListPageV2
