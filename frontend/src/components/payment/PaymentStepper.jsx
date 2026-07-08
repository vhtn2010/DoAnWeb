import { PAYMENT_CONFIRMATION_STEPS } from '../../constants/payments.js'

function PaymentStepper({ activeStep = 3 }) {
  return (
    <div className="payment-confirmation-stepper" aria-label="Tiến trình thanh toán">
      {PAYMENT_CONFIRMATION_STEPS.map((step, index) => {
        const isActive = step.id === activeStep
        const isCompleted = step.id < activeStep

        return (
          <div className="payment-confirmation-stepper__item" key={step.id}>
            <div
              className={`payment-confirmation-stepper__marker ${
                isActive ? 'payment-confirmation-stepper__marker--active' : ''
              } ${
                isCompleted ? 'payment-confirmation-stepper__marker--completed' : ''
              }`}
            >
              {step.id}
            </div>

            <span
              className={`payment-confirmation-stepper__label ${
                isActive ? 'payment-confirmation-stepper__label--active' : ''
              } ${
                isCompleted ? 'payment-confirmation-stepper__label--completed' : ''
              }`}
            >
              {step.label}
            </span>

            {index < PAYMENT_CONFIRMATION_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={`payment-confirmation-stepper__line ${
                  isCompleted ? 'payment-confirmation-stepper__line--completed' : ''
                }`}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default PaymentStepper
