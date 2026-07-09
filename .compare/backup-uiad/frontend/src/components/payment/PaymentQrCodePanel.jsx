function createQrMatrix(payload = '') {
  const matrixSize = 17
  const payloadSeed = Array.from(payload).reduce(
    (seedValue, character, index) => seedValue + character.charCodeAt(0) * (index + 1),
    97,
  )

  return Array.from({ length: matrixSize }, (_, rowIndex) =>
    Array.from({ length: matrixSize }, (_, columnIndex) => {
      const inCorner =
        (rowIndex < 4 && columnIndex < 4) ||
        (rowIndex < 4 && columnIndex > matrixSize - 5) ||
        (rowIndex > matrixSize - 5 && columnIndex < 4)

      if (inCorner) {
        return rowIndex === 0 ||
          rowIndex === 3 ||
          columnIndex === 0 ||
          columnIndex === 3 ||
          (rowIndex === 2 && columnIndex === 2)
      }

      return ((rowIndex * 19 + columnIndex * 13 + payloadSeed) % 7) < 3
    }),
  )
}

function PaymentQrCodePanel({ amountLabel, bookingCode, payload }) {
  const qrMatrix = createQrMatrix(payload)

  return (
    <section className="payment-qr-code-panel" aria-label="Thanh toán ví điện tử mock">
      <div className="payment-qr-code-panel__surface">
        <div className="payment-qr-code-panel__grid" aria-hidden="true">
          {qrMatrix.map((row, rowIndex) =>
            row.map((cell, columnIndex) => (
              <span
                className={`payment-qr-code-panel__cell ${
                  cell ? 'payment-qr-code-panel__cell--filled' : ''
                }`}
                key={`${rowIndex}-${columnIndex}`}
              />
            )),
          )}
        </div>
      </div>

      <div className="payment-qr-code-panel__copy">
        <strong>Quét mã để thanh toán</strong>
        <span>Số tiền: {amountLabel}</span>
        {bookingCode ? <span>Mã đơn: {bookingCode}</span> : null}
      </div>
    </section>
  )
}

export default PaymentQrCodePanel
