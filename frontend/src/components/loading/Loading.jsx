import './loading.css'

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

export function LocalLoading({
  className = '',
  minHeight = '180px',
  size = 'md',
}) {
  return (
    <div
      aria-label="Loading"
      className={cx('app-local-loading', `app-local-loading--${size}`, className)}
      role="status"
      style={{ '--app-local-loading-min-height': minHeight }}
    >
      <span aria-hidden="true" className="app-local-loading__spinner" />
    </div>
  )
}

export function FullPageLoading({ className = '' }) {
  return (
    <div
      aria-label="Loading"
      className={cx('app-full-page-loading', className)}
      role="status"
    >
      <div className="app-full-page-loading__scene" aria-hidden="true">
        <img
          alt=""
          className="app-full-page-loading__accent"
          src="/assets/loading/birds-stars-cropped.png"
        />
        <img
          alt=""
          className="app-full-page-loading__cloud app-full-page-loading__cloud--one"
          src="/assets/loading/cloud-1-cropped.png"
        />
        <img
          alt=""
          className="app-full-page-loading__cloud app-full-page-loading__cloud--two"
          src="/assets/loading/cloud-2-cropped.png"
        />
        <img
          alt=""
          className="app-full-page-loading__cloud app-full-page-loading__cloud--three"
          src="/assets/loading/cloud-3-cropped.png"
        />
        <img
          alt=""
          className="app-full-page-loading__plane"
          src="/assets/loading/plane-cropped.png"
        />
        <div className="app-full-page-loading__dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
