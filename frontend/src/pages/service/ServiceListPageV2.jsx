import { useLocation } from 'react-router-dom'
import ServiceFilterSidebar from '../../components/service/ServiceFilterSidebar.jsx'
import ServiceListHero from '../../components/service/ServiceListHero.jsx'
import ServiceResultsSection from '../../components/service/ServiceResultsSection.jsx'
import useFavorites from '../../hooks/useFavorites.js'
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
