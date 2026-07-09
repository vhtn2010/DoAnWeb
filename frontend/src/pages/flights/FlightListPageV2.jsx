import FlightFilterSidebar from '../../components/flights/FlightFilterSidebar.jsx'
import FlightListHero from '../../components/flights/FlightListHero.jsx'
import FlightResultsSection from '../../components/flights/FlightResultsSection.jsx'
import FlightSearchPanel from '../../components/flights/FlightSearchPanel.jsx'
import useFlightList from '../../hooks/useFlightList.js'

function FlightListPageV2() {
  const {
    applyFilters,
    currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    flights,
    formatCurrency,
    hasMore,
    loading,
    openFlightDetail,
    resultSummary,
    retry,
    searchState,
    selectFlight,
    selectedFlightId,
    selectedSort,
    setFilter,
    setPage,
    setSort,
    submitSearch,
    updatePassengers,
    updateSearchField,
    updateTripType,
  } = useFlightList()
  const searchPanelFeedback = selectedFlightId ? { tone: feedback.tone, message: '' } : feedback

  return (
    <div className="flight-list-page">
      <FlightListHero />

      <div className="flight-list-page__search-shell">
        <FlightSearchPanel
          airports={defaults.airports}
          feedback={searchPanelFeedback}
          searchState={searchState}
          selectedSort={selectedSort}
          sortOptions={defaults.sort_options}
          updatePassengers={updatePassengers}
          updateSearchField={updateSearchField}
          updateTripType={updateTripType}
          onSortChange={setSort}
          onSubmit={submitSearch}
        />
      </div>

      <section className="flight-list-page__body">
        <div className="flight-list-page__layout">
          <FlightFilterSidebar
            airlineOptions={defaults.airlines}
            draftFilters={draftFilters}
            onApply={applyFilters}
            onToggle={setFilter}
          />

          <FlightResultsSection
            currentPage={currentPage}
            error={error}
            flights={flights}
            formatCurrency={formatCurrency}
            hasMore={hasMore}
            loading={loading}
            openFlightDetail={openFlightDetail}
            resultSummary={resultSummary}
            retry={retry}
            selectFlight={selectFlight}
            selectedFlightId={selectedFlightId}
            selectedSort={selectedSort}
            setPage={setPage}
            setSort={setSort}
            sortOptions={defaults.sort_options}
          />
        </div>
      </section>
    </div>
  )
}

export default FlightListPageV2
