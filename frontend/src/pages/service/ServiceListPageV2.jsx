import { useLocation } from 'react-router-dom'
import HomeSearchCard from '../../components/public/home/HomeSearchCard.jsx'
import ServiceFilterSidebar from '../../components/service/ServiceFilterSidebar.jsx'
import ServiceListHero from '../../components/service/ServiceListHero.jsx'
import ServiceResultsSection from '../../components/service/ServiceResultsSection.jsx'
import useFavorites from '../../hooks/useFavorites.js'
import useHomePage from '../../hooks/useHomePage.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import useTourServiceList from '../../hooks/useTourServiceList.js'
import {
  buildFavoriteItem,
  buildFavoriteKey,
  buildFavoriteSourcePath,
  getFavoriteSourceLabel,
} from '../../services/favoriteStorage.js'

function ServiceListPageV2() {
  const location = useLocation()
  const { currentUser } = usePublicSession()
  const { hasFavorite, toggleFavorite } = useFavorites({ currentUser })
  const homeSearch = useHomePage()
  const {
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
  const sourcePath = buildFavoriteSourcePath(location)

  function buildServiceFavoriteItem(service) {
    return buildFavoriteItem({
      favorite_key: buildFavoriteKey(service.service_type ?? 'tour', service.service_id ?? service.id ?? service.slug),
      service_type: service.service_type ?? 'tour',
      service_id: service.service_id ?? service.id ?? '',
      slug: service.slug,
      title: service.title,
      image_url: service.image_url,
      detail_path: service.detail_path ?? `/services/${service.slug}`,
      source_path: sourcePath,
      source_label: getFavoriteSourceLabel(service.service_type ?? 'tour'),
      summary: [service.duration_text, service.transport_text].filter(Boolean).join(' • '),
      location_text: service.location_text,
    })
  }

  function handleToggleFavorite(service) {
    toggleFavorite(buildServiceFavoriteItem(service))
  }

  function isFavorite(service) {
    return hasFavorite(
      buildFavoriteKey(service.service_type ?? 'tour', service.service_id ?? service.id ?? service.slug),
    )
  }

  return (
    <div className="service-list-page">
      <ServiceListHero />

      <section className="service-list-page__quick-search" aria-label="Tìm kiếm tour">
        <HomeSearchCard
          calendarPreview={homeSearch.calendarPreview}
          calendarSelection={homeSearch.calendarSelection}
          compareDates={homeSearch.compareDates}
          displayedDateRange={homeSearch.displayedDateRange}
          errorMessage=""
          feedbackMessage={homeSearch.feedbackMessage}
          filterGroups={homeSearch.filterGroups}
          formatMonthLabel={homeSearch.formatMonthLabel}
          getMonthDays={homeSearch.getMonthDays}
          handleDateFieldToggle={homeSearch.handleDateFieldToggle}
          handleDateSelect={homeSearch.handleDateSelect}
          handleFieldSelect={homeSearch.handleFieldSelect}
          handleFilterSelect={homeSearch.handleFilterSelect}
          handleRetry={homeSearch.handleRetry}
          handleSearch={homeSearch.handleSearch}
          handleSortSelect={homeSearch.handleSortSelect}
          isSameDay={homeSearch.isSameDay}
          loading={false}
          openMenu={homeSearch.openMenu}
          searchCardRef={homeSearch.searchCardRef}
          searchFieldOptions={homeSearch.searchFieldOptions}
          searchState={homeSearch.searchState}
          showNextMonth={homeSearch.showNextMonth}
          showPreviousMonth={homeSearch.showPreviousMonth}
          sortOptions={homeSearch.sortOptions}
          toggleMenu={homeSearch.toggleMenu}
          visibleMonths={homeSearch.visibleMonths}
          weekdayLabels={homeSearch.weekdayLabels}
        />
      </section>

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
            isFavorite={isFavorite}
            isLoading={isLoading}
            resultCount={resultCount}
            selectedSort={selectedSort}
            services={services}
            sortOptions={sortOptions}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onResetFilters={handleResetFilters}
            onSortChange={handleSortChange}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      </section>
    </div>
  )
}

export default ServiceListPageV2
