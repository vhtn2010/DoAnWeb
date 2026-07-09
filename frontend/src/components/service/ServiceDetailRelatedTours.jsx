import ServiceRecommendationCard from './ServiceRecommendationCard.jsx'

export default function ServiceDetailRelatedTours({ recommendedServices }) {
  if (!recommendedServices.length) {
    return null
  }

  return (
    <section className="service-detail-related">
      <h2 className="service-detail-related__title">Tour tương tự bạn có thể thích</h2>

      <div className="service-detail-recommendations">
        {recommendedServices.map((recommendedService) => (
          <ServiceRecommendationCard
            key={recommendedService.slug}
            service={recommendedService}
          />
        ))}
      </div>
    </section>
  )
}
