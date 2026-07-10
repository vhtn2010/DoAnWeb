import { Link, useNavigate } from 'react-router-dom'

function shouldSkipCardNavigation(target) {
  return target instanceof Element && Boolean(target.closest('a, button'))
}

function TrainRelatedRouteCard({ formatCurrency, train }) {
  const navigate = useNavigate()

  return (
    <article
      className="train-related-route-card train-related-route-card--interactive"
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if (shouldSkipCardNavigation(event.target)) {
          return
        }

        navigate(train.detail_path)
      }}
      onKeyDown={(event) => {
        if (
          shouldSkipCardNavigation(event.target) ||
          (event.key !== 'Enter' && event.key !== ' ')
        ) {
          return
        }

        event.preventDefault()
        navigate(train.detail_path)
      }}
    >
      <div className="train-related-route-card__media">
        <img alt={train.image_alt} src={train.image_url} />
        <span>{train.train_number_label}</span>
      </div>

      <div className="train-related-route-card__body">
        <div className="train-related-route-card__times">
          <div>
            <strong>{train.departure_time_label}</strong>
            <p>{train.departure_station_code_label}</p>
          </div>
          <div className="train-related-route-card__duration">
            <span>{train.duration_display}</span>
            <small>{train.route_label}</small>
          </div>
          <div>
            <strong>{train.arrival_time_label}</strong>
            <p>{train.arrival_station_code_label}</p>
          </div>
        </div>

        <p className="train-related-route-card__description">{train.route_note}</p>

        <div className="train-related-route-card__footer">
          <strong>{formatCurrency(train.sale_price)}</strong>
          <Link to={train.detail_path}>Chọn</Link>
        </div>
      </div>
    </article>
  )
}

export default TrainRelatedRouteCard
