import TrainRelatedRouteCard from './TrainRelatedRouteCard.jsx'

function TrainRelatedRoutes({ formatCurrency, trains = [] }) {
  if (!trains.length) {
    return null
  }

  return (
    <section className="train-detail-card train-related-routes">
      <div className="train-detail-section-heading">
        <h2>Các tàu khác trên tuyến này</h2>
      </div>

      <div className="train-related-routes__grid">
        {trains.map((train) => (
          <TrainRelatedRouteCard key={train.id} formatCurrency={formatCurrency} train={train} />
        ))}
      </div>
    </section>
  )
}

export default TrainRelatedRoutes
