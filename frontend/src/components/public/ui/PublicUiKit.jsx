import './publicUiKit.css'

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

export function PublicButton({
  children,
  className = '',
  disabled = false,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      aria-busy={loading || undefined}
      className={cx(
        'public-ui-button',
        `public-ui-button--${variant}`,
        `public-ui-button--${size}`,
        loading && 'public-ui-button--loading',
        className,
      )}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="public-ui-button__spinner" /> : null}
      <span className="public-ui-button__label">{children}</span>
    </button>
  )
}

export function PublicCard({ children, className = '', padding = 'md', tone = 'default', ...props }) {
  return (
    <section
      className={cx(
        'public-ui-card',
        `public-ui-card--${padding}`,
        `public-ui-card--${tone}`,
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function PublicSectionHeader({
  actions = null,
  children,
  className = '',
  eyebrow = '',
  subtitle = '',
  title,
}) {
  return (
    <div className={cx('public-ui-section-header', className)}>
      <div className="public-ui-section-header__copy">
        {eyebrow ? <p className="public-ui-section-header__eyebrow">{eyebrow}</p> : null}
        {title ? <h2 className="public-ui-section-header__title">{title}</h2> : null}
        {subtitle ? <p className="public-ui-section-header__subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="public-ui-section-header__actions">{actions}</div> : null}
    </div>
  )
}

export function PublicPageHeader({
  actions = null,
  children,
  className = '',
  eyebrow = '',
  subtitle = '',
  title,
}) {
  return (
    <section className={cx('public-ui-page-header', className)}>
      <div className="public-ui-page-header__copy">
        {eyebrow ? <p className="public-ui-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="public-ui-page-header__title">{title}</h1>
        {subtitle ? <p className="public-ui-page-header__subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="public-ui-page-header__actions">{actions}</div> : null}
    </section>
  )
}

export function PublicToolbar({ children, className = '', compact = false, ...props }) {
  return (
    <div className={cx('public-ui-toolbar', compact && 'public-ui-toolbar--compact', className)} {...props}>
      {children}
    </div>
  )
}

export function PublicFilterBar({ actions = null, children, className = '', ...props }) {
  return (
    <section className={cx('public-ui-filter-bar', className)} {...props}>
      <div className="public-ui-filter-bar__content">{children}</div>
      {actions ? <div className="public-ui-filter-bar__actions">{actions}</div> : null}
    </section>
  )
}

export function PublicFormPanel({ actions = null, children, className = '', subtitle = '', title }) {
  return (
    <section className={cx('public-ui-form-panel', className)}>
      <PublicSectionHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="public-ui-form-panel__body">{children}</div>
    </section>
  )
}

export function PublicState({
  action = null,
  className = '',
  description = '',
  eyebrow = '',
  role,
  title,
  tone = 'neutral',
}) {
  return (
    <div className={cx('public-ui-state', `public-ui-state--${tone}`, className)} role={role}>
      <div className="public-ui-state__copy">
        {eyebrow ? <p className="public-ui-state__eyebrow">{eyebrow}</p> : null}
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="public-ui-state__action">{action}</div> : null}
    </div>
  )
}

export function PublicEmptyState(props) {
  return <PublicState role="status" tone="neutral" {...props} />
}

export function PublicErrorState(props) {
  return <PublicState role="alert" tone="danger" {...props} />
}

export function PublicNotice({
  children,
  className = '',
  tone = 'info',
  ...props
}) {
  return (
    <div className={cx('public-ui-notice', `public-ui-notice--${tone}`, className)} {...props}>
      {children}
    </div>
  )
}

export function PublicSkeleton({ className = '', width = '100%' }) {
  return (
    <span
      aria-hidden="true"
      className={cx('public-ui-skeleton', className)}
      style={{ width }}
    />
  )
}

export function PublicLoadingBlock({
  className = '',
  description = '',
  rows = 3,
  title = 'Đang tải dữ liệu',
}) {
  return (
    <div className={cx('public-ui-loading-block', className)} role="status">
      <div className="public-ui-loading-block__copy">
        <span className="public-ui-loading-block__eyebrow">Đang đồng bộ</span>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="public-ui-loading-block__rows" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="public-ui-loading-block__row" key={index}>
            <PublicSkeleton width={index === rows - 1 ? '62%' : '100%'} />
            <PublicSkeleton width={index % 2 === 0 ? '36%' : '54%'} />
          </div>
        ))}
      </div>
    </div>
  )
}

const PUBLIC_PAGINATION_VISIBLE_PAGE_COUNT = 5

function createPaginationItems(currentPage, totalPages, visiblePageCount = PUBLIC_PAGINATION_VISIBLE_PAGE_COUNT) {
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1)
  const safeTotalPages = Math.max(0, Number(totalPages) || 0)

  if (safeTotalPages <= visiblePageCount) {
    return Array.from({ length: safeTotalPages }, (_, index) => ({
      type: 'page',
      value: index + 1,
    }))
  }

  const items = [
    { type: 'page', value: 1 },
  ]

  const windowStart = Math.max(2, safeCurrentPage - 1)
  const windowEnd = Math.min(safeTotalPages - 1, safeCurrentPage + 1)

  if (windowStart > 2) {
    items.push({ type: 'ellipsis', value: 'pagination-ellipsis-start' })
  }

  for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
    items.push({ type: 'page', value: pageNumber })
  }

  if (windowEnd < safeTotalPages - 1) {
    items.push({ type: 'ellipsis', value: 'pagination-ellipsis-end' })
  }

  items.push({ type: 'page', value: safeTotalPages })

  return items
}

export function PublicPagination({
  ariaLabel = 'Phân trang',
  className = '',
  currentPage = 1,
  disabled = false,
  onPageChange,
  totalPages = 0,
}) {
  const safeTotalPages = Math.max(0, Number(totalPages) || 0)
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, safeTotalPages))
  const paginationItems = createPaginationItems(safeCurrentPage, safeTotalPages)

  if (safeTotalPages <= 1) {
    return null
  }

  return (
    <nav aria-label={ariaLabel} className={cx('public-ui-pagination', className)}>
      <PublicButton
        aria-label="Trang trước"
        disabled={disabled || safeCurrentPage <= 1}
        size="sm"
        variant="ghost"
        onClick={() => onPageChange?.(Math.max(1, safeCurrentPage - 1))}
      >
        {'<'}
      </PublicButton>

      {paginationItems.map((item) => {
        if (item.type === 'ellipsis') {
          return <span className="public-ui-pagination__ellipsis" key={item.value}>...</span>
        }

        return (
          <PublicButton
            aria-current={safeCurrentPage === item.value ? 'page' : undefined}
            className="public-ui-pagination__page"
            disabled={disabled}
            key={item.value}
            size="sm"
            variant={safeCurrentPage === item.value ? 'primary' : 'ghost'}
            onClick={() => onPageChange?.(item.value)}
          >
            {item.value}
          </PublicButton>
        )
      })}

      <PublicButton
        aria-label="Trang sau"
        disabled={disabled || safeCurrentPage >= safeTotalPages}
        size="sm"
        variant="ghost"
        onClick={() => onPageChange?.(Math.min(safeTotalPages, safeCurrentPage + 1))}
      >
        {'>'}
      </PublicButton>
    </nav>
  )
}
