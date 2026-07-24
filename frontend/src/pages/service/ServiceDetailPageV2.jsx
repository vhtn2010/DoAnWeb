import ServiceDetailBookingPanel from '../../components/service/ServiceDetailBookingPanelV2.jsx'
import ServiceDetailBreadcrumb from '../../components/service/ServiceDetailBreadcrumb.jsx'
import ServiceDetailGallery from '../../components/service/ServiceDetailGallery.jsx'
import ServiceDetailHero from '../../components/service/ServiceDetailHero.jsx'
import ServiceDetailMainContent from '../../components/service/ServiceDetailMainContentV2.jsx'
import ServiceDetailRelatedTours from '../../components/service/ServiceDetailRelatedTours.jsx'
import ServiceDetailStateBlock from '../../components/service/ServiceDetailStateBlock.jsx'
import useTourServiceDetail from '../../hooks/useTourServiceDetail.js'

function ServiceDetailPageV2() {
  const {
    adultCount,
    adultTotal,
    bookingMessage,
    breadcrumbHomePath,
    breadcrumbListPath,
    childCount,
    childTotal,
    departureDate,
    errorMessage,
    handleAddToCart,
    handleBookNow,
    handleShareClick,
    handleToggleFavorite,
    infoItems,
    isFavorite,
    isLoading,
    isShared,
    leadLocation,
    pendingAction,
    pricingSummary,
    recommendedServices,
    selectedImage,
    service,
    setAdultCount,
    setChildCount,
    setDepartureDate,
    setSelectedImage,
    totalPrice,
  } = useTourServiceDetail()

  function handleImageError(event) {
    if (service && event.currentTarget.src !== service.image_url) {
      event.currentTarget.src = service.image_url
    }
  }

  if (errorMessage && !service && !isLoading) {
    return (
      <ServiceDetailStateBlock
        breadcrumbHomePath={breadcrumbHomePath}
        breadcrumbListPath={breadcrumbListPath}
        errorMessage={errorMessage}
      />
    )
  }

  if (isLoading || !service) {
    return <ServiceDetailStateBlock loading />
  }

  return (
    <div className="service-detail-page">
      <div className="service-detail-page__shell">
        <ServiceDetailBreadcrumb
          homePath={breadcrumbHomePath}
          leadLocation={leadLocation}
          listPath={breadcrumbListPath}
        />

        <ServiceDetailHero
          isFavorite={isFavorite}
          isShared={isShared}
          service={service}
          onShare={handleShareClick}
          onToggleFavorite={handleToggleFavorite}
        />

        <ServiceDetailGallery
          selectedImage={selectedImage}
          service={service}
          onImageError={handleImageError}
          onSelectImage={setSelectedImage}
        />

        <div className="service-detail-page__content-grid">
          <ServiceDetailMainContent
            infoItems={infoItems}
            service={service}
          />

          <ServiceDetailBookingPanel
            adultCount={adultCount}
            adultTotal={adultTotal}
            bookingMessage={bookingMessage}
            childCount={childCount}
            childTotal={childTotal}
            departureDate={departureDate}
            pendingAction={pendingAction}
            pricingSummary={pricingSummary}
            service={service}
            totalPrice={totalPrice}
            onAdultCountChange={setAdultCount}
            onAddToCart={handleAddToCart}
            onBookNow={handleBookNow}
            onChildCountChange={setChildCount}
            onDepartureDateChange={setDepartureDate}
          />
        </div>

        <ServiceDetailRelatedTours recommendedServices={recommendedServices} />
      </div>
    </div>
  )
}

export default ServiceDetailPageV2
