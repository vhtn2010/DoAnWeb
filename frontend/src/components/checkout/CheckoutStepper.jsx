const checkoutSteps = [
  { id: 1, label: 'Kiểm Tra' },
  { id: 2, label: 'Thông Tin' },
  { id: 3, label: 'Thanh Toán' },
]

function CheckoutStepper({ activeStep = 2 }) {
  return (
    <div className="checkout-stepper" aria-label="Tiến trình checkout">
      {checkoutSteps.map((step, index) => {
        const isActive = step.id === activeStep
        const isCompleted = step.id < activeStep

        return (
          <div className="checkout-stepper__item" key={step.id}>
            <div
              className={`checkout-stepper__marker ${
                isActive ? 'checkout-stepper__marker--active' : ''
              } ${isCompleted ? 'checkout-stepper__marker--completed' : ''}`}
            >
              {step.id}
            </div>
            <span
              className={`checkout-stepper__label ${
                isActive ? 'checkout-stepper__label--active' : ''
              }`}
            >
              {step.label}
            </span>

            {index < checkoutSteps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`checkout-stepper__line ${
                  step.id < activeStep ? 'checkout-stepper__line--active' : ''
                }`}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default CheckoutStepper
