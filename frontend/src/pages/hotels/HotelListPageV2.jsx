import HotelFilterSidebar from '../../components/hotels/HotelFilterSidebar.jsx'
import HotelListHero from '../../components/hotels/HotelListHero.jsx'
import HotelResultsSection from '../../components/hotels/HotelResultsSection.jsx'
import HotelSearchBar from '../../components/hotels/HotelSearchBar.jsx'
import useHotelList from '../../hooks/useHotelList.js'

function HotelListPageV2() {
  const {
    breadcrumbHomePath,
    currentPage,
    errorMessage,
    favoriteIds,
    filterDraft,
    formatCurrency,
    handleApplyFilters,
    handleApplySearch,
    handlePageChange,
    handleSearchFieldChange,
    handleSidebarLocationChange,
    handleSortChange,
    handleToggleFavorite,
    handleToggleFilter,
    isLoading,
    resultSummary,
    searchDraft,
    selectedSort,
    sortOptions,
    totalPages,
    visibleHotels,
  } = useHotelList()

  return (
    <div className="hotel-list-page">
      <HotelListHero breadcrumbHomePath={breadcrumbHomePath} />

      <div className="hotel-list-page__search-shell">
        <HotelSearchBar
          searchValues={searchDraft}
          onFieldChange={handleSearchFieldChange}
          onSubmit={handleApplySearch}
        />
      </div>

      <section className="hotel-list-page__body">
        <div className="hotel-list-page__layout">
          <HotelFilterSidebar
            filters={filterDraft}
            onApply={handleApplyFilters}
            onLocationChange={handleSidebarLocationChange}
            onToggleFilter={handleToggleFilter}
          />

          <HotelResultsSection
            currentPage={currentPage}
            errorMessage={errorMessage}
            favoriteIds={favoriteIds}
            formatCurrency={formatCurrency}
            handlePageChange={handlePageChange}
            handleSortChange={handleSortChange}
            handleToggleFavorite={handleToggleFavorite}
            isLoading={isLoading}
            resultSummary={resultSummary}
            selectedSort={selectedSort}
            sortOptions={sortOptions}
            totalPages={totalPages}
            visibleHotels={visibleHotels}
          />
        </div>
      </section>
    </div>
  )
}

export default HotelListPageV2
