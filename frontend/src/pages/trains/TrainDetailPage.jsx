import LoginRequiredModal from '../../components/auth/LoginRequiredModal.jsx'
import TrainBookingSummary from '../../components/trains/TrainBookingSummary.jsx'
import TrainCarTabs from '../../components/trains/TrainCarTabs.jsx'
import TrainDetailHeaderCard from '../../components/trains/TrainDetailHeaderCard.jsx'
import TrainRelatedRoutes from '../../components/trains/TrainRelatedRoutes.jsx'
import TrainScheduleCard from '../../components/trains/TrainScheduleCard.jsx'
import TrainSeatMap from '../../components/trains/TrainSeatMap.jsx'
import TrainSeatTypeCard from '../../components/trains/TrainSeatTypeCard.jsx'
import useTrainDetail from '../../hooks/useTrainDetail.js'

function ShareIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M14.25 5.25h4.5v4.5M10.5 13.5l8.25-8.25M18 13.5v4.2a1.05 1.05 0 0 1-1.05 1.05H6.3A1.05 1.05 0 0 1 5.25 17.7V7.05A1.05 1.05 0 0 1 6.3 6H10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m12 19.2-.92-.84C6.18 13.9 3 11.02 3 7.5a4.2 4.2 0 0 1 4.28-4.2c1.69 0 3.31.8 4.32 2.07A5.5 5.5 0 0 1 15.92 3.3 4.2 4.2 0 0 1 20.2 7.5c0 3.52-3.18 6.4-8.08 10.86l-.12.12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function TrainDetailTopActions({ isFavorite, onToggleFavorite }) {
  return (
    <div className="train-detail-page__actions" aria-label="Tác vụ vé tàu">
      <button className="train-detail-page__action" type="button" aria-label="Chia sẻ">
        <ShareIcon />
      </button>
      <button
        aria-label="Lưu chuyến tàu"
        className={`train-detail-page__action ${isFavorite ? 'train-detail-page__action--active' : ''}`}
        type="button"
        onClick={onToggleFavorite}
      >
        <HeartIcon />
      </button>
    </div>
  )
}

function TrainDetailPage() {
  const {
    addToCartMock,
    bookNowMock,
    bookingSummary,
    closeLoginPrompt,
    error,
    feedback,
    formatCurrency,
    goToLoginFromPrompt,
    goBackToTrains,
    handleToggleFavorite,
    isFavorite,
    isLoginPromptOpen,
    loading,
    relatedTrains,
    retry,
    selectCar,
    selectSeat,
    selectSeatOption,
    selectedCar,
    selectedCarId,
    selectedSeatIds,
    selectedSeatOption,
    selectedSeatOptionId,
    train,
  } = useTrainDetail()

  const displayedSeatOptions = train
    ? (() => {
        const featuredOptions = Array.isArray(train.featured_seat_options)
          ? train.featured_seat_options
          : train.seat_options

        if (!selectedSeatOption) {
          return featuredOptions
        }

        return featuredOptions.some((seatOption) => seatOption.id === selectedSeatOption.id)
          ? featuredOptions
          : [...featuredOptions, selectedSeatOption]
      })()
    : []

  if (error) {
    return (
      <div className="train-detail-page">
        <div className="train-detail-shell">
          <section className="train-detail-state-card" role="alert">
            <p className="train-detail-state-card__eyebrow">Không khả dụng</p>
            <h1>Không tìm thấy chuyến tàu</h1>
            <p>{error}</p>
            <div className="train-detail-state-card__actions">
              <button className="train-detail-state-card__button" type="button" onClick={retry}>
                Tải lại
              </button>
              <button
                className="train-detail-state-card__button train-detail-state-card__button--secondary"
                type="button"
                onClick={goBackToTrains}
              >
                Quay lại danh sách vé
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (loading || !train) {
    return (
      <div className="train-detail-page">
        <div className="train-detail-shell">
          <section className="train-detail-state-card" role="status">
            <p className="train-detail-state-card__eyebrow">Đang tải</p>
            <h1>Chi tiết vé tàu đang được chuẩn bị</h1>
            <p>Dữ liệu đang được đọc từ mock adapter theo đúng pattern API-ready hiện tại.</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="train-detail-page">
      <div className="train-detail-shell">
        <LoginRequiredModal
          isOpen={isLoginPromptOpen}
          onClose={closeLoginPrompt}
          onLogin={goToLoginFromPrompt}
        />

        <section className="train-detail-hero">
          <div className="train-detail-page__topbar">
            <TrainDetailTopActions
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>

          <TrainDetailHeaderCard train={train} />
        </section>

        {feedback.message ? (
          <p className={`train-detail-page__feedback train-detail-page__feedback--${feedback.tone}`}>
            {feedback.message}
          </p>
        ) : null}

        <div className="train-detail-layout">
          <div className="train-detail-main">
            <TrainCarTabs cars={train.cars} selectedCarId={selectedCarId} onSelectCar={selectCar} />
            <TrainSeatMap
              car={selectedCar}
              onSelectSeat={selectSeat}
              selectedSeatIds={selectedSeatIds}
            />

            <section className="train-seat-options train-detail-section" aria-label="Hạng vé và loại chỗ">
              <div className="train-seat-options__grid train-seat-options-grid">
                {displayedSeatOptions.map((seatOption) => (
                  <TrainSeatTypeCard
                    key={seatOption.id}
                    formatCurrency={formatCurrency}
                    onSelect={selectSeatOption}
                    option={seatOption}
                    selected={seatOption.id === selectedSeatOptionId}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="train-detail-sidebar">
            <TrainBookingSummary
              bookingSummary={bookingSummary}
              formatCurrency={formatCurrency}
              onAddToCart={addToCartMock}
              onBookNow={bookNowMock}
            />
          </aside>
        </div>

        <TrainScheduleCard schedule={train.schedule} />
        <TrainRelatedRoutes formatCurrency={formatCurrency} trains={relatedTrains} />
      </div>
    </div>
  )
}

export default TrainDetailPage
