import { ClockIcon, TourTypeIcon, TransportIcon } from './ServiceDetailIcons.jsx'

function getInfoIcon(label) {
  if (label === 'Thời gian') {
    return <ClockIcon />
  }

  if (label === 'Phương tiện') {
    return <TransportIcon />
  }

  if (label === 'Loại tour') {
    return <TourTypeIcon />
  }

  return null
}

export default function ServiceDetailInfoStrip({ infoItems }) {
  return (
    <section className="service-detail-strip">
      {infoItems.map((item) => (
        <div className="service-detail-strip__item" key={item.label}>
          <span className="service-detail-strip__icon">{getInfoIcon(item.label)}</span>
          <div>
            <p className="service-detail-strip__label">{item.label}</p>
            <p className="service-detail-strip__value">{item.value}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
