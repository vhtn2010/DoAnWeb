import ServiceFilterSidebar from '../../components/service/ServiceFilterSidebar.jsx'
import ServiceListHero from '../../components/service/ServiceListHero.jsx'
import ServiceResultsSection from '../../components/service/ServiceResultsSection.jsx'
import useTourServiceList from '../../hooks/useTourServiceList.js'

function ServiceListPageV2() {
  const {
    breadcrumbHomePath,
    categoryOptions,
    currentPage,
    draftFilters,
    durationOptions,
    errorMessage,
    handleApplyFilters,
    handleKeywordChange,
    handlePageChange,
    handleResetFilters,
    handleSortChange,
    handleToggleValue,
    isLoading,
    priceOptions,
    resultCount,
    selectedSort,
    services,
    sortOptions,
    totalPages,
  } = useTourServiceList()

  return (
    <div className="service-list-page">
      <ServiceListHero breadcrumbHomePath={breadcrumbHomePath} />

      <section className="service-list-page__body">
        <div className="service-list-page__layout">
          <ServiceFilterSidebar
            categoryOptions={categoryOptions}
            draftFilters={draftFilters}
            durationOptions={durationOptions}
            priceOptions={priceOptions}
            onApply={handleApplyFilters}
            onKeywordChange={handleKeywordChange}
            onToggleValue={handleToggleValue}
          />

          <ServiceResultsSection
            currentPage={currentPage}
            errorMessage={errorMessage}
            isLoading={isLoading}
            resultCount={resultCount}
            selectedSort={selectedSort}
            services={services}
            sortOptions={sortOptions}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onResetFilters={handleResetFilters}
            onSortChange={handleSortChange}
          />
        </div>
      </section>
    </div>
  )
}

export default ServiceListPageV2
