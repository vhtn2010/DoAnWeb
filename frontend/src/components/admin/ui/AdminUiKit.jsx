import './adminUiKit.css'
import { forwardRef } from 'react'

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function AdminButton({
  children,
  className = '',
  disabled = false,
  icon = null,
  iconPosition = 'start',
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      className={cx(
        'admin-ui-button',
        `admin-ui-button--${variant}`,
        `admin-ui-button--${size}`,
        loading && 'admin-ui-button--loading',
        className,
      )}
      disabled={isDisabled}
      type={type}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="admin-ui-button__spinner" /> : null}
      {icon && iconPosition === 'start' ? (
        <span aria-hidden="true" className="admin-ui-button__icon">
          {icon}
        </span>
      ) : null}
      <span className="admin-ui-button__label">{children}</span>
      {icon && iconPosition === 'end' ? (
        <span aria-hidden="true" className="admin-ui-button__icon">
          {icon}
        </span>
      ) : null}
    </button>
  )
}

export function AdminIconButton({
  children,
  className = '',
  disabled = false,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'ghost',
  ...props
}) {
  return (
    <button
      className={cx(
        'admin-ui-icon-button',
        `admin-ui-icon-button--${variant}`,
        `admin-ui-icon-button--${size}`,
        loading && 'admin-ui-icon-button--loading',
        className,
      )}
      disabled={disabled || loading}
      type={type}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="admin-ui-button__spinner" /> : children}
    </button>
  )
}

export function AdminActionIconButton({
  children,
  className = '',
  label,
  variant = 'ghost',
  ...props
}) {
  return (
    <AdminIconButton
      aria-label={label}
      title={label}
      className={cx('admin-ui-action-icon-button', className)}
      size="sm"
      variant={variant}
      {...props}
    >
      {children}
    </AdminIconButton>
  )
}

export function AdminBadge({ children, className = '', dot = false, tone = 'neutral' }) {
  return (
    <span className={cx('admin-ui-badge', `admin-ui-badge--${tone}`, className)}>
      {dot ? <span aria-hidden="true" className="admin-ui-badge__dot" /> : null}
      {children}
    </span>
  )
}

export function AdminCard({ children, className = '', padding = 'md', tone = 'default', ...props }) {
  return (
    <section
      className={cx(
        'admin-ui-card',
        `admin-ui-card--${padding}`,
        `admin-ui-card--${tone}`,
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function AdminSectionHeader({
  actions = null,
  children,
  className = '',
  eyebrow = '',
  subtitle = '',
  title,
}) {
  return (
    <div className={cx('admin-ui-section-header', className)}>
      <div className="admin-ui-section-header__copy">
        {eyebrow ? <p className="admin-ui-section-header__eyebrow">{eyebrow}</p> : null}
        {title ? <h2 className="admin-ui-section-header__title">{title}</h2> : null}
        {subtitle ? <p className="admin-ui-section-header__subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="admin-ui-section-header__actions">{actions}</div> : null}
    </div>
  )
}

export function AdminToolbar({ children, className = '', compact = false, ...props }) {
  return (
    <div className={cx('admin-ui-toolbar', compact && 'admin-ui-toolbar--compact', className)} {...props}>
      {children}
    </div>
  )
}

export function AdminPageHeader({
  actions = null,
  children,
  className = '',
  eyebrow = '',
  subtitle = '',
  title,
}) {
  return (
    <section className={cx('admin-ui-page-header', className)}>
      <div className="admin-ui-page-header__copy">
        {eyebrow ? <p className="admin-ui-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="admin-ui-page-header__title">{title}</h1>
        {subtitle ? <p className="admin-ui-page-header__subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="admin-ui-page-header__actions">{actions}</div> : null}
    </section>
  )
}

export function AdminFilterBar({ actions = null, children, className = '', ...props }) {
  return (
    <section className={cx('admin-ui-filter-bar', className)} {...props}>
      <div className="admin-ui-filter-bar__content">{children}</div>
      {actions ? <div className="admin-ui-filter-bar__actions">{actions}</div> : null}
    </section>
  )
}

export function AdminTable(props) {
  return <AdminDataTable {...props} />
}

const ADMIN_PAGINATION_VISIBLE_PAGE_COUNT = 4

function createPaginationItems(currentPage, totalPages, visiblePageCount = ADMIN_PAGINATION_VISIBLE_PAGE_COUNT) {
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1)
  const safeTotalPages = Math.max(0, Number(totalPages) || 0)

  if (safeTotalPages <= visiblePageCount) {
    return Array.from({ length: safeTotalPages }, (_, index) => ({
      type: 'page',
      value: index + 1,
    }))
  }

  const trailingWindowSize = Math.max(1, visiblePageCount - 1)
  const lastWindowStart = Math.max(1, safeTotalPages - visiblePageCount + 1)

  if (safeCurrentPage >= lastWindowStart) {
    return Array.from({ length: visiblePageCount }, (_, index) => ({
      type: 'page',
      value: lastWindowStart + index,
    }))
  }

  const windowStart = safeCurrentPage <= 2 ? 1 : safeCurrentPage - 1

  return [
    ...Array.from({ length: trailingWindowSize }, (_, index) => ({
      type: 'page',
      value: windowStart + index,
    })),
    { type: 'ellipsis', value: 'pagination-ellipsis' },
    { type: 'page', value: safeTotalPages },
  ]
}

export function AdminPagination({
  className = '',
  disabled = false,
  currentPage = 1,
  onPageChange,
  pages = [],
  totalPages = pages.length,
  visiblePageCount = ADMIN_PAGINATION_VISIBLE_PAGE_COUNT,
}) {
  const safeTotalPages = Math.max(0, Number(totalPages) || 0)
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, safeTotalPages))
  const paginationItems = createPaginationItems(safeCurrentPage, safeTotalPages, visiblePageCount)

  if (safeTotalPages <= 1) {
    return null
  }

  return (
    <nav className={cx('admin-ui-pagination', className)} aria-label="Phân trang">
      <AdminButton
        aria-label="Đến trang đầu tiên"
        disabled={disabled || safeCurrentPage <= 1}
        size="sm"
        variant="secondary"
        onClick={() => onPageChange?.(1)}
      >
        {'<<'}
      </AdminButton>

      <AdminButton
        aria-label="Về trang trước"
        disabled={disabled || safeCurrentPage <= 1}
        size="sm"
        variant="secondary"
        onClick={() => onPageChange?.(Math.max(1, safeCurrentPage - 1))}
      >
        {'<'}
      </AdminButton>

      {paginationItems.map((item) => {
        if (item.type === 'ellipsis') {
          return <span className="admin-ui-pagination__ellipsis" key={item.value}>...</span>
        }

        return (
          <AdminButton
            key={item.value}
            disabled={disabled}
            size="sm"
            variant={safeCurrentPage === item.value ? 'primary' : 'ghost'}
            onClick={() => onPageChange?.(item.value)}
          >
            {item.value}
          </AdminButton>
        )
      })}

      <AdminButton
        aria-label="Sang trang sau"
        disabled={disabled || safeCurrentPage >= safeTotalPages}
        size="sm"
        variant="secondary"
        onClick={() => onPageChange?.(Math.min(safeTotalPages, safeCurrentPage + 1))}
      >
        {'>'}
      </AdminButton>

      <AdminButton
        aria-label="Đến trang cuối cùng"
        disabled={disabled || safeCurrentPage >= safeTotalPages}
        size="sm"
        variant="secondary"
        onClick={() => onPageChange?.(safeTotalPages)}
      >
        {'>>'}
      </AdminButton>
    </nav>
  )
}

export function AdminStatusBadge({ children, className = '', dot = true, tone = 'neutral' }) {
  return (
    <AdminBadge
      className={cx('admin-ui-status-badge', `admin-ui-status-badge--${tone}`, className)}
      dot={dot}
      tone={tone}
    >
      {children}
    </AdminBadge>
  )
}

export function AdminActionIconGroup({ children, className = '', label = 'Thao tác' }) {
  return (
    <div className={cx('admin-ui-action-group', className)} role="group" aria-label={label}>
      {children}
    </div>
  )
}

export function AdminKpiCard({
  className = '',
  helper = '',
  icon = null,
  label,
  tone = 'neutral',
  trend = '',
  value,
}) {
  const hasTop = Boolean(icon || trend)

  return (
    <article className={cx('admin-ui-kpi-card', `admin-ui-kpi-card--${tone}`, className)}>
      {hasTop ? (
        <div className="admin-ui-kpi-card__top">
          {icon ? <span className="admin-ui-kpi-card__icon" aria-hidden="true">{icon}</span> : null}
          {trend ? <span className="admin-ui-kpi-card__trend">{trend}</span> : null}
        </div>
      ) : null}
      <p className="admin-ui-kpi-card__label">{label}</p>
      <strong className="admin-ui-kpi-card__value">{value}</strong>
      {helper ? <p className="admin-ui-kpi-card__helper">{helper}</p> : null}
    </article>
  )
}

export function AdminFormPanel({ actions = null, children, className = '', subtitle = '', title }) {
  return (
    <section className={cx('admin-ui-form-panel', className)}>
      <AdminSectionHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="admin-ui-form-panel__body">{children}</div>
    </section>
  )
}

export function AdminField({
  children,
  className = '',
  error = '',
  helper = '',
  htmlFor,
  label,
  required = false,
}) {
  return (
    <label className={cx('admin-ui-field', error && 'admin-ui-field--error', className)} htmlFor={htmlFor}>
      <span className="admin-ui-field__label">
        {label}
        {required ? <span className="admin-ui-field__required"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="admin-ui-field__message admin-ui-field__message--error" role="alert">
          {error}
        </span>
      ) : helper ? (
        <span className="admin-ui-field__message">{helper}</span>
      ) : null}
    </label>
  )
}

export function AdminInput({ className = '', invalid = false, ...props }) {
  return (
    <input
      className={cx('admin-ui-input', invalid && 'admin-ui-input--invalid', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export function AdminSearchInput({
  className = '',
  controlClassName = '',
  invalid = false,
  type = 'search',
  ...props
}) {
  return (
    <div className={cx('admin-ui-search-input', invalid && 'admin-ui-search-input--invalid', className)}>
      <span className="admin-ui-search-input__icon">
        <SearchIcon />
      </span>
      <input
        className={cx('admin-ui-search-input__control', controlClassName)}
        aria-invalid={invalid || undefined}
        type={type}
        {...props}
      />
    </div>
  )
}

export function AdminTextarea({ className = '', invalid = false, rows = 4, ...props }) {
  return (
    <textarea
      className={cx('admin-ui-textarea', invalid && 'admin-ui-input--invalid', className)}
      rows={rows}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export const AdminSelect = forwardRef(function AdminSelect({
  children,
  className = '',
  invalid = false,
  options = [],
  placeholder = '',
  ...props
}, ref) {
  return (
    <select
      className={cx('admin-ui-select', invalid && 'admin-ui-input--invalid', className)}
      aria-invalid={invalid || undefined}
      ref={ref}
      {...props}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option disabled={option.disabled} key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  )
})

export function AdminSegmentedControl({
  ariaLabel,
  className = '',
  disabled = false,
  onChange,
  options = [],
  variant = 'tabs',
  value,
}) {
  return (
    <div
      className={cx('admin-ui-segmented-control', `admin-ui-segmented-control--${variant}`, className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            className={cx(
              'admin-ui-segmented-control__item',
              isSelected && 'admin-ui-segmented-control__item--selected',
            )}
            disabled={disabled || option.disabled}
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function AdminState({
  action = null,
  className = '',
  description = '',
  icon = null,
  role,
  title,
  tone = 'neutral',
}) {
  return (
    <div
      className={cx('admin-ui-state', `admin-ui-state--${tone}`, className)}
      role={role}
    >
      {icon ? <div className="admin-ui-state__icon">{icon}</div> : null}
      <div className="admin-ui-state__copy">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="admin-ui-state__action">{action}</div> : null}
    </div>
  )
}

export function AdminEmptyState(props) {
  return <AdminState tone="neutral" role="status" {...props} />
}

export function AdminErrorState(props) {
  return <AdminState tone="danger" role="alert" {...props} />
}

export function AdminSkeleton({ className = '', width = '100%' }) {
  return (
    <span
      className={cx('admin-ui-skeleton', className)}
      style={{ width }}
      aria-hidden="true"
    />
  )
}

export function AdminLoadingBlock({ className = '', rows = 3 }) {
  return (
    <div className={cx('admin-ui-loading-block', className)} role="status">
      <span className="admin-ui-loading-block__label">Đang tải dữ liệu...</span>
      {Array.from({ length: rows }, (_, index) => (
        <div className="admin-ui-loading-block__row" key={index}>
          <AdminSkeleton width={index === rows - 1 ? '64%' : '100%'} />
          <AdminSkeleton width={index % 2 === 0 ? '42%' : '58%'} />
        </div>
      ))}
    </div>
  )
}

export function AdminDataTable({
  caption = '',
  children,
  className = '',
  columns = [],
  emptyState = null,
  loading = false,
  loadingLabel = 'Đang tải dữ liệu...',
  rows = [],
  tableClassName = '',
}) {
  const hasRows = rows.length > 0

  return (
    <div className={cx('admin-ui-table-shell', className)}>
      <table className={cx('admin-ui-table', tableClassName)}>
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>
                <AdminLoadingBlock rows={2} />
                <span className="admin-ui-table__status">{loadingLabel}</span>
              </td>
            </tr>
          ) : hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>
                {emptyState ?? (
                  <AdminEmptyState
                    title="Không có dữ liệu"
                    description="Chưa có bản ghi phù hợp để hiển thị."
                  />
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
