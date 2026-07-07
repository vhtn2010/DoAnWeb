function TrainCarTabs({ cars = [], selectedCarId, onSelectCar }) {
  return (
    <section className="train-detail-card train-car-tabs train-detail-section">
      <div className="train-car-tabs__list" role="tablist" aria-label="Chọn toa tàu">
        {cars.map((car) => {
          const isActive = car.id === selectedCarId

          return (
            <button
              key={car.id}
              className={isActive ? 'train-car-tabs__tab train-car-tabs__tab--active' : 'train-car-tabs__tab'}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectCar(car.id)}
            >
              {car.tab_label ?? car.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default TrainCarTabs
