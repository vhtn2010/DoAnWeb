import { BOOKING_CONFIRMATION_STEPS } from '../../constants/bookings.js'

function BookingStepper({ activeStep = 1 }) {
  return (
    <div className="booking-confirmation-stepper" aria-label="Tiến trình đặt đơn">
      {BOOKING_CONFIRMATION_STEPS.map((step, index) => {
        const isActive = step.id === activeStep
        const isCompleted = step.id < activeStep

        return (
          <div className="booking-confirmation-stepper__item" key={step.id}>
            <div
              className={`booking-confirmation-stepper__marker ${
                isActive ? 'booking-confirmation-stepper__marker--active' : ''
              } ${
                isCompleted ? 'booking-confirmation-stepper__marker--completed' : ''
              }`}
            >
              {step.id}
            </div>

            <span
              className={`booking-confirmation-stepper__label ${
                isActive ? 'booking-confirmation-stepper__label--active' : ''
              } ${
                isCompleted ? 'booking-confirmation-stepper__label--completed' : ''
              }`}
            >
              {step.label}
            </span>

            {index < BOOKING_CONFIRMATION_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={`booking-confirmation-stepper__line ${
                  isCompleted ? 'booking-confirmation-stepper__line--completed' : ''
                }`}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default BookingStepper
