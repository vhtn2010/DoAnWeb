import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminFormPanel,
  AdminInput,
  AdminLoadingBlock,
  AdminPageHeader,
  AdminPagination,
  AdminSearchInput,
  AdminSelect,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_PROMOTION_FORM_STATUS_OPTIONS,
  ADMIN_PROMOTION_SORT_OPTIONS,
  ADMIN_PROMOTION_STATUS_OPTIONS,
  ADMIN_PROMOTION_STATUSES,
  ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS,
} from '../../constants/adminPromotions.js'
import useAdminPromotions from '../../hooks/useAdminPromotions.js'
import {
  getAdminPromotionStatusAction,
  getAdminPromotionStatusMeta,
} from '../../mappers/adminPromotionMappers.js'
import { getAdminPromotionVouchers } from '../../repositories/adminPromotionRepository.js'
import {
  changeAdminVoucherStatus,
  createAdminVoucher,
} from '../../repositories/adminUtilityRepository.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
})

const VOUCHER_MODAL_LIMIT = 100
const VOUCHER_CODE_PATTERN = /^[A-Z0-9_-]{3,50}$/
const VOUCHER_DISCOUNT_TYPE_OPTIONS = [
  { label: 'Giảm tiền cố định', value: 'fixed_amount' },
  { label: 'Giảm theo phần trăm', value: 'percent' },
]
const VOUCHER_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Disabled', value: 'disabled' },
]

function formatMoney(value) {
  return `${currencyFormatter.format(Number(value || 0))}đ`
}

function parseDateValue(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateTimeLocalValue(value) {
  const date = parseDateValue(value)

  if (!date) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function toIsoDateTime(value) {
  const date = parseDateValue(value)
  return date ? date.toISOString() : ''
}

function createInitialVoucherFormValues(promotion = null) {
  return {
    code: '',
    discountType: 'fixed_amount',
    discountValue: '',
    maxDiscountAmount: '',
    minOrderAmount: '0',
    status: 'active',
    usageLimitPerUser: '1',
    usageLimitTotal: '',
    validFrom: toDateTimeLocalValue(promotion?.startDate),
    validTo: toDateTimeLocalValue(promotion?.endDate),
  }
}

function parseOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

function validateVoucherCreateForm(values, promotion) {
  const errors = {}
  const normalizedCode = values.code.trim().toUpperCase()
  const discountValue = Number(values.discountValue)
  const maxDiscountAmount = parseOptionalNumber(values.maxDiscountAmount)
  const minOrderAmount = Number(values.minOrderAmount || 0)
  const usageLimitTotal = parseOptionalNumber(values.usageLimitTotal)
  const usageLimitPerUser = Number(values.usageLimitPerUser || 0)
  const validFrom = parseDateValue(values.validFrom)
  const validTo = parseDateValue(values.validTo)
  const now = new Date()
  const promotionValidFrom = parseDateValue(promotion?.startDate)
  const promotionValidTo = parseDateValue(promotion?.endDate)

  if (!normalizedCode) {
    errors.code = 'Nhập code voucher.'
  } else if (!VOUCHER_CODE_PATTERN.test(normalizedCode)) {
    errors.code = 'Code chỉ gồm chữ hoa, số, dấu gạch ngang hoặc gạch dưới; dài 3-50 ký tự.'
  }

  if (!values.discountType) {
    errors.discountType = 'Chọn loại giảm.'
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    errors.discountValue = 'Giá trị giảm phải lớn hơn 0.'
  } else if (values.discountType === 'percent' && discountValue > 100) {
    errors.discountValue = 'Voucher phần trăm không được vượt quá 100%.'
  }

  if (values.discountType === 'fixed_amount' && values.maxDiscountAmount) {
    errors.maxDiscountAmount = 'Giảm tối đa chỉ áp dụng cho voucher phần trăm.'
  } else if (values.maxDiscountAmount && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
    errors.maxDiscountAmount = 'Giảm tối đa phải lớn hơn 0.'
  }

  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    errors.minOrderAmount = 'Đơn tối thiểu phải lớn hơn hoặc bằng 0.'
  }

  if (values.usageLimitTotal && (!Number.isInteger(usageLimitTotal) || usageLimitTotal <= 0)) {
    errors.usageLimitTotal = 'Tổng lượt dùng phải là số nguyên dương.'
  }

  if (!Number.isInteger(usageLimitPerUser) || usageLimitPerUser <= 0) {
    errors.usageLimitPerUser = 'Mỗi user phải là số nguyên dương.'
  }

  if (
    Number.isFinite(usageLimitTotal) &&
    Number.isInteger(usageLimitPerUser) &&
    usageLimitPerUser > usageLimitTotal
  ) {
    errors.usageLimitPerUser = 'Mỗi user không được vượt quá tổng lượt dùng.'
  }

  if (!validFrom) {
    errors.validFrom = 'Chọn thời gian bắt đầu hợp lệ.'
  }

  if (!validTo) {
    errors.validTo = 'Chọn thời gian kết thúc hợp lệ.'
  }

  if (validFrom && validTo && validTo <= validFrom) {
    errors.validTo = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
  }

  if (values.status === 'active' && validTo && validTo < now) {
    errors.status = 'Voucher đã hết hạn không thể tạo ở trạng thái Active.'
  }

  if (validFrom && promotionValidFrom && validFrom < promotionValidFrom) {
    errors.validFrom = 'Thời gian voucher phải nằm trong thời gian promotion.'
  }

  if (validTo && promotionValidTo && validTo > promotionValidTo) {
    errors.validTo = 'Thời gian voucher phải nằm trong thời gian promotion.'
  }

  return errors
}

function buildVoucherCreatePayload(values, promotion) {
  return {
    code: values.code.trim().toUpperCase(),
    discount_type: values.discountType,
    discount_value: Number(values.discountValue),
    max_discount_amount:
      values.discountType === 'percent' && values.maxDiscountAmount !== ''
        ? Number(values.maxDiscountAmount)
        : null,
    min_order_amount: Number(values.minOrderAmount || 0),
    promotion_id: promotion.id,
    status: values.status,
    usage_limit_per_user: Number(values.usageLimitPerUser || 1),
    usage_limit_total: values.usageLimitTotal === '' ? null : Number(values.usageLimitTotal),
    valid_from: toIsoDateTime(values.validFrom),
    valid_to: toIsoDateTime(values.validTo),
  }
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M8 4v14m0 0 3-3m-3 3-3-3m8-9h6m-6 6h4m-4 6h2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m5 19 4.2-1 9.3-9.3a2.1 2.1 0 0 0-3-3L6.2 15 5 19Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M7.8 4h8.4L20 7.8v8.4L16.2 20H7.8L4 16.2V7.8L7.8 4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M8 12h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function ActivateIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M8 5v14l11-7-11-7Z" fill="currentColor" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M4 11.4V5h6.4l8.9 8.9a2.4 2.4 0 0 1 0 3.4l-2 2a2.4 2.4 0 0 1-3.4 0L4 11.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M8 8h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  )
}

function VoucherIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M9 9h.01M15 15h.01M15 9l-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function getVoucherStatusMeta(status) {
  const statusMap = {
    active: { label: 'Active', tone: 'success' },
    disabled: { label: 'Disabled', tone: 'neutral' },
    expired: { label: 'Expired', tone: 'neutral' },
    used_up: { label: 'Used up', tone: 'warning' },
  }

  return statusMap[status] ?? {
    label: status || 'Unknown',
    tone: 'neutral',
  }
}

function getVoucherDiscountTypeLabel(type) {
  if (type === 'fixed_amount') {
    return 'Giảm tiền cố định'
  }

  if (type === 'percent') {
    return 'Giảm theo phần trăm'
  }

  return type || 'Chưa cập nhật'
}

function getVoucherDiscountValueLabel(voucher = {}) {
  if (voucher.discount_type === 'percent') {
    return `${Number(voucher.discount_value || 0)}%`
  }

  return formatMoney(voucher.discount_value)
}

function getVoucherUsageLabel(voucher = {}) {
  const usedCount = Number(voucher.used_count || 0)

  if (voucher.usage_limit_total == null) {
    return `${usedCount} lượt / không giới hạn`
  }

  return `${usedCount}/${Number(voucher.usage_limit_total)} lượt`
}

function getVoucherPerUserLabel(value) {
  if (value == null) {
    return 'Không giới hạn'
  }

  return `${Number(value)} lượt`
}

function mapPromotionVoucher(voucher = {}, fallbackPromotion = null) {
  return {
    code: voucher.code || 'VOUCHER',
    discountTypeLabel: getVoucherDiscountTypeLabel(voucher.discount_type),
    discountValueLabel: getVoucherDiscountValueLabel(voucher),
    id: voucher.id,
    maxDiscountLabel: voucher.max_discount_amount == null ? '' : formatMoney(voucher.max_discount_amount),
    minOrderLabel: formatMoney(voucher.min_order_amount),
    perUserLabel: getVoucherPerUserLabel(voucher.usage_limit_per_user),
    promotionName: voucher.promotion?.name || fallbackPromotion?.name || 'Chưa cập nhật',
    raw: voucher,
    status: voucher.status || 'disabled',
    usageLabel: getVoucherUsageLabel(voucher),
    validRangeLabel: formatDateRange(voucher.valid_from, voucher.valid_to),
  }
}

function formatDate(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return dateFormatter.format(date)
}

function formatDateRange(from, to) {
  return `${formatDate(from)} - ${formatDate(to)}`
}

function formatVoucherCount(count) {
  return `${Number(count || 0)} mã`
}

function getFooterText({ pagination, promotions, resultRange, searchQuery }) {
  if (!pagination.total) {
    return 'Chưa có chương trình khuyến mãi để hiển thị'
  }

  if (searchQuery.trim()) {
    return `Tìm thấy ${promotions.length} trong trang ${pagination.page}; tổng ${pagination.total} chương trình`
  }

  return `Hiển thị ${resultRange.start}-${resultRange.end} trong tổng ${pagination.total} chương trình`
}

function PromotionSelect({ ariaLabel, disabled = false, icon, onChange, options, value }) {
  return (
    <label className="admin-promotions-page__select-shell">
      <span aria-hidden="true" className="admin-promotions-page__select-icon">
        {icon}
      </span>
      <AdminSelect
        aria-label={ariaLabel}
        className="admin-promotions-page__select"
        disabled={disabled}
        options={options}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function PromotionFormModal({
  actionLoading,
  closeForm,
  formErrors,
  formState,
  formValues,
  submitPromotionForm,
  updateFormField,
}) {
  const isEditMode = formState.mode === 'edit'
  const statusMeta = getAdminPromotionStatusMeta(formValues.status)
  const title = isEditMode ? 'Chỉnh sửa chương trình khuyến mãi' : 'Thêm chương trình khuyến mãi'
  const description = 'Cập nhật thông tin promotion theo contract: tên, mô tả, trạng thái, thời gian và loại dịch vụ áp dụng.'

  return (
    <div
      aria-describedby="admin-promotion-form-description"
      aria-labelledby="admin-promotion-form-title"
      aria-modal="true"
      className="admin-promotions-modal"
      role="dialog"
      onClick={closeForm}
    >
      <div className="admin-promotions-modal__dialog" onClick={(event) => event.stopPropagation()}>
        <form
          className="admin-promotions-page__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            submitPromotionForm()
          }}
        >
          <AdminFormPanel
            className="admin-promotions-page__form-card"
            title={title}
            subtitle={description}
            actions={
              <button
                aria-label="Đóng popup khuyến mãi"
                className="admin-promotions-modal__close"
                disabled={actionLoading}
                type="button"
                onClick={closeForm}
              >
                <CloseIcon />
              </button>
            }
          >
            <span className="admin-promotions-modal__sr" id="admin-promotion-form-title">
              {title}
            </span>
            <span className="admin-promotions-modal__sr" id="admin-promotion-form-description">
              {description}
            </span>
            <div className="admin-promotions-page__form-grid">
              <AdminField error={formErrors.name} htmlFor="promotion-name" label="Tên chương trình" required>
                <AdminInput
                  id="promotion-name"
                  invalid={Boolean(formErrors.name)}
                  value={formValues.name}
                  onChange={(event) => updateFormField('name', event.target.value)}
                />
              </AdminField>

              <AdminField error={formErrors.status} htmlFor="promotion-status" label="Trạng thái" required>
                {isEditMode ? (
                  <AdminInput id="promotion-status" readOnly value={statusMeta.label} />
                ) : (
                  <AdminSelect
                    id="promotion-status"
                    invalid={Boolean(formErrors.status)}
                    options={ADMIN_PROMOTION_FORM_STATUS_OPTIONS}
                    value={formValues.status}
                    onChange={(event) => updateFormField('status', event.target.value)}
                  />
                )}
              </AdminField>

              <AdminField error={formErrors.validFrom} htmlFor="promotion-valid-from" label="Bắt đầu" required>
                <AdminInput
                  id="promotion-valid-from"
                  invalid={Boolean(formErrors.validFrom)}
                  type="datetime-local"
                  value={formValues.validFrom}
                  onChange={(event) => updateFormField('validFrom', event.target.value)}
                />
              </AdminField>

              <AdminField error={formErrors.validTo} htmlFor="promotion-valid-to" label="Kết thúc" required>
                <AdminInput
                  id="promotion-valid-to"
                  invalid={Boolean(formErrors.validTo)}
                  type="datetime-local"
                  value={formValues.validTo}
                  onChange={(event) => updateFormField('validTo', event.target.value)}
                />
              </AdminField>

              <AdminField htmlFor="promotion-target" label="Loại dịch vụ áp dụng">
                <AdminSelect
                  id="promotion-target"
                  options={ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS}
                  value={formValues.targetServiceType}
                  onChange={(event) => updateFormField('targetServiceType', event.target.value)}
                />
              </AdminField>
            </div>

            <AdminField htmlFor="promotion-description" label="Mô tả">
              <AdminTextarea
                id="promotion-description"
                placeholder="Nhập mô tả ngắn về ưu đãi, điều kiện áp dụng hoặc ghi chú vận hành..."
                value={formValues.description}
                onChange={(event) => updateFormField('description', event.target.value)}
              />
            </AdminField>

            <div className="admin-promotions-page__form-actions">
              <AdminButton disabled={actionLoading} type="button" variant="secondary" onClick={closeForm}>
                Hủy
              </AdminButton>
              <AdminButton loading={actionLoading} type="submit" variant="primary">
                {isEditMode ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
              </AdminButton>
            </div>
          </AdminFormPanel>
        </form>
      </div>
    </div>
  )
}

function VoucherStatusBadge({ status }) {
  const meta = getVoucherStatusMeta(status)

  return (
    <span className={`admin-promotion-voucher__status admin-promotion-voucher__status--${meta.tone}`}>
      {meta.label}
    </span>
  )
}

function PromotionVoucherModal({
  actionId,
  canManageVouchers,
  createErrors,
  createLoading,
  createOpen,
  createValues,
  error,
  loading,
  meta,
  onChangeCreateField,
  onClose,
  onCloseCreate,
  onOpenCreate,
  onReload,
  onStatusAction,
  onSubmitCreate,
  promotion,
  vouchers,
}) {
  if (!promotion) {
    return null
  }

  return (
    <div
      aria-describedby="admin-promotion-voucher-description"
      aria-labelledby="admin-promotion-voucher-title"
      aria-modal="true"
      className="admin-promotions-modal admin-promotions-modal--wide"
      role="dialog"
      onClick={onClose}
    >
      <div className="admin-promotions-modal__dialog" onClick={(event) => event.stopPropagation()}>
        <div className="admin-promotion-voucher-modal">
          <header className="admin-promotion-voucher-modal__header">
            <div>
              <p className="admin-promotion-voucher-modal__eyebrow">Voucher</p>
              <h2 id="admin-promotion-voucher-title">Voucher của {promotion.name}</h2>
              <p id="admin-promotion-voucher-description">
                Các mã giảm giá thuộc promotion này, đúng field của Voucher API.
              </p>
            </div>
            <div className="admin-promotion-voucher-modal__header-actions">
              {canManageVouchers ? (
                <AdminButton
                  disabled={loading || createLoading}
                  icon={<PlusIcon />}
                  size="sm"
                  type="button"
                  variant={createOpen ? 'secondary' : 'primary'}
                  onClick={createOpen ? onCloseCreate : onOpenCreate}
                >
                  {createOpen ? 'Đóng form' : 'Thêm voucher'}
                </AdminButton>
              ) : null}
              <button
                aria-label="Đóng popup voucher"
                className="admin-promotions-modal__close"
                type="button"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          <div className="admin-promotion-voucher-modal__summary">
            <span>Mã khuyến mãi: <strong>{promotion.code}</strong></span>
            <span>Thời gian: <strong>{formatDateRange(promotion.startDate, promotion.endDate)}</strong></span>
            <span>Số voucher: <strong>{formatVoucherCount(meta.total || vouchers.length)}</strong></span>
          </div>

          {createOpen ? (
            <form
              className="admin-promotion-voucher-create"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                onSubmitCreate()
              }}
            >
              <div className="admin-promotion-voucher-create__header">
                <div>
                  <h3>Thêm voucher</h3>
                  <p>Gửi đúng body của POST /admin/vouchers theo promotion đang chọn.</p>
                </div>
                <VoucherStatusBadge status={createValues.status} />
              </div>

              <div className="admin-promotion-voucher-create__grid">
                <AdminField error={createErrors.code} htmlFor="voucher-code" label="Code" required>
                  <AdminInput
                    id="voucher-code"
                    invalid={Boolean(createErrors.code)}
                    value={createValues.code}
                    onChange={(event) => onChangeCreateField('code', event.target.value.toUpperCase())}
                  />
                </AdminField>

                <AdminField error={createErrors.status} htmlFor="voucher-status" label="Trạng thái" required>
                  <AdminSelect
                    id="voucher-status"
                    invalid={Boolean(createErrors.status)}
                    options={VOUCHER_STATUS_OPTIONS}
                    value={createValues.status}
                    onChange={(event) => onChangeCreateField('status', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.discountType} htmlFor="voucher-discount-type" label="Loại giảm" required>
                  <AdminSelect
                    id="voucher-discount-type"
                    invalid={Boolean(createErrors.discountType)}
                    options={VOUCHER_DISCOUNT_TYPE_OPTIONS}
                    value={createValues.discountType}
                    onChange={(event) => onChangeCreateField('discountType', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.discountValue} htmlFor="voucher-discount-value" label="Giá trị" required>
                  <AdminInput
                    id="voucher-discount-value"
                    invalid={Boolean(createErrors.discountValue)}
                    min="0"
                    step={createValues.discountType === 'percent' ? '1' : '1000'}
                    type="number"
                    value={createValues.discountValue}
                    onChange={(event) => onChangeCreateField('discountValue', event.target.value)}
                  />
                </AdminField>

                <AdminField
                  error={createErrors.maxDiscountAmount}
                  helper={createValues.discountType === 'percent' ? 'Tùy chọn cho voucher phần trăm.' : 'Không áp dụng cho giảm tiền cố định.'}
                  htmlFor="voucher-max-discount"
                  label="Giảm tối đa"
                >
                  <AdminInput
                    disabled={createValues.discountType !== 'percent'}
                    id="voucher-max-discount"
                    invalid={Boolean(createErrors.maxDiscountAmount)}
                    min="0"
                    step="1000"
                    type="number"
                    value={createValues.maxDiscountAmount}
                    onChange={(event) => onChangeCreateField('maxDiscountAmount', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.minOrderAmount} htmlFor="voucher-min-order" label="Đơn tối thiểu">
                  <AdminInput
                    id="voucher-min-order"
                    invalid={Boolean(createErrors.minOrderAmount)}
                    min="0"
                    step="1000"
                    type="number"
                    value={createValues.minOrderAmount}
                    onChange={(event) => onChangeCreateField('minOrderAmount', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.usageLimitTotal} htmlFor="voucher-usage-total" label="Tổng lượt dùng">
                  <AdminInput
                    id="voucher-usage-total"
                    invalid={Boolean(createErrors.usageLimitTotal)}
                    min="1"
                    step="1"
                    type="number"
                    value={createValues.usageLimitTotal}
                    onChange={(event) => onChangeCreateField('usageLimitTotal', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.usageLimitPerUser} htmlFor="voucher-usage-per-user" label="Mỗi user" required>
                  <AdminInput
                    id="voucher-usage-per-user"
                    invalid={Boolean(createErrors.usageLimitPerUser)}
                    min="1"
                    step="1"
                    type="number"
                    value={createValues.usageLimitPerUser}
                    onChange={(event) => onChangeCreateField('usageLimitPerUser', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.validFrom} htmlFor="voucher-valid-from" label="Bắt đầu" required>
                  <AdminInput
                    id="voucher-valid-from"
                    invalid={Boolean(createErrors.validFrom)}
                    type="datetime-local"
                    value={createValues.validFrom}
                    onChange={(event) => onChangeCreateField('validFrom', event.target.value)}
                  />
                </AdminField>

                <AdminField error={createErrors.validTo} htmlFor="voucher-valid-to" label="Kết thúc" required>
                  <AdminInput
                    id="voucher-valid-to"
                    invalid={Boolean(createErrors.validTo)}
                    type="datetime-local"
                    value={createValues.validTo}
                    onChange={(event) => onChangeCreateField('validTo', event.target.value)}
                  />
                </AdminField>
              </div>

              <div className="admin-promotion-voucher-create__actions">
                <AdminButton disabled={createLoading} type="button" variant="secondary" onClick={onCloseCreate}>
                  Hủy
                </AdminButton>
                <AdminButton loading={createLoading} type="submit" variant="primary">
                  Tạo voucher
                </AdminButton>
              </div>
            </form>
          ) : null}

          {error ? (
            <AdminErrorState
              title="Không thể xử lý voucher"
              description={error}
              action={
                <AdminButton loading={loading} variant="secondary" onClick={onReload}>
                  Thử lại
                </AdminButton>
              }
            />
          ) : null}

          {loading ? <AdminLoadingBlock rows={4} /> : null}

          {!loading && !error && vouchers.length === 0 ? (
            <AdminEmptyState
              title="Chưa có voucher"
              description="Promotion này chưa có mã giảm giá nào được backend trả về."
            />
          ) : null}

          {!loading && !error && vouchers.length > 0 ? (
            <div className="admin-promotion-voucher-modal__list" aria-label="Danh sách voucher của promotion">
              {vouchers.map((voucher) => {
                const isActive = voucher.status === 'active'
                const canToggle = canManageVouchers && ['active', 'disabled'].includes(voucher.status)

                return (
                  <article className="admin-promotion-voucher-card" key={voucher.id || voucher.code}>
                    <div className="admin-promotion-voucher-card__top">
                      <div>
                        <p>Code</p>
                        <h3>{voucher.code}</h3>
                      </div>
                      <VoucherStatusBadge status={voucher.status} />
                    </div>

                    <dl className="admin-promotion-voucher-card__details">
                      <div>
                        <dt>Thuộc promotion</dt>
                        <dd>{voucher.promotionName}</dd>
                      </div>
                      <div>
                        <dt>Loại giảm</dt>
                        <dd>{voucher.discountTypeLabel}</dd>
                      </div>
                      <div>
                        <dt>Giá trị</dt>
                        <dd>{voucher.discountValueLabel}</dd>
                      </div>
                      {voucher.maxDiscountLabel ? (
                        <div>
                          <dt>Giảm tối đa</dt>
                          <dd>{voucher.maxDiscountLabel}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Đơn tối thiểu</dt>
                        <dd>{voucher.minOrderLabel}</dd>
                      </div>
                      <div>
                        <dt>Đã dùng</dt>
                        <dd>{voucher.usageLabel}</dd>
                      </div>
                      <div>
                        <dt>Mỗi user</dt>
                        <dd>{voucher.perUserLabel}</dd>
                      </div>
                      <div>
                        <dt>Thời hạn</dt>
                        <dd>{voucher.validRangeLabel}</dd>
                      </div>
                    </dl>

                    <div className="admin-promotion-voucher-card__actions">
                      <AdminButton
                        disabled={!canToggle}
                        loading={actionId === voucher.id}
                        size="sm"
                        variant={isActive ? 'secondary' : 'primary'}
                        onClick={() => onStatusAction(voucher, isActive ? 'disabled' : 'active')}
                      >
                        {isActive ? 'Tắt voucher' : 'Kích hoạt'}
                      </AdminButton>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AdminPromotionsPage() {
  const { currentPermissions, currentRole } = useOutletContext()
  const canReadVouchers = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.vouchersRead,
    currentPermissions,
  )
  const canManageVouchers = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.vouchersWrite,
    currentPermissions,
  )
  const {
    actionLoading,
    closeForm,
    error,
    feedback,
    formErrors,
    formState,
    formValues,
    loading,
    openCreateForm,
    openEditForm,
    overview,
    pageNumbers,
    pagination,
    promotions,
    reloadPromotions,
    resetFilters,
    resultRange,
    runStatusAction,
    searchQuery,
    setCurrentPage,
    setSearchQuery,
    setSortOrder,
    setStatusFilter,
    sortOrder,
    statusFilter,
    submitPromotionForm,
    updateFormField,
  } = useAdminPromotions()
  const [voucherModalPromotion, setVoucherModalPromotion] = useState(null)
  const [voucherItems, setVoucherItems] = useState([])
  const [voucherMeta, setVoucherMeta] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
  })
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState('')
  const [voucherActionId, setVoucherActionId] = useState('')
  const [voucherReloadKey, setVoucherReloadKey] = useState(0)
  const [voucherCreateOpen, setVoucherCreateOpen] = useState(false)
  const [voucherCreateValues, setVoucherCreateValues] = useState(createInitialVoucherFormValues())
  const [voucherCreateErrors, setVoucherCreateErrors] = useState({})
  const [voucherCreateLoading, setVoucherCreateLoading] = useState(false)

  useEffect(() => {
    if (!voucherModalPromotion || !canReadVouchers) {
      return undefined
    }

    let isActive = true

    async function loadPromotionVouchers() {
      setVoucherLoading(true)
      setVoucherError('')

      try {
        const response = await getAdminPromotionVouchers(voucherModalPromotion.id, {
          limit: VOUCHER_MODAL_LIMIT,
          page: 1,
        })

        if (!isActive) {
          return
        }

        if (!response?.success) {
          throw new Error(response?.message || 'Không thể tải danh sách voucher.')
        }

        const responsePromotion = response.data?.promotion
        const fallbackPromotion = {
          ...voucherModalPromotion,
          name: responsePromotion?.name || voucherModalPromotion.name,
        }
        const nextVouchers = Array.isArray(response.data?.vouchers)
          ? response.data.vouchers.map((voucher) => mapPromotionVoucher(voucher, fallbackPromotion))
          : []

        setVoucherItems(nextVouchers)
        setVoucherMeta({
          page: Number(response.meta?.page || 1),
          total: Number(response.meta?.total || nextVouchers.length),
          total_pages: Number(response.meta?.total_pages || 1),
        })
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setVoucherItems([])
        setVoucherMeta({
          page: 1,
          total: 0,
          total_pages: 1,
        })
        setVoucherError(loadError?.message || 'Không thể tải voucher lúc này.')
      } finally {
        if (isActive) {
          setVoucherLoading(false)
        }
      }
    }

    loadPromotionVouchers()

    return () => {
      isActive = false
    }
  }, [canReadVouchers, voucherModalPromotion, voucherReloadKey])

  function openVoucherModal(promotion) {
    setVoucherModalPromotion(promotion)
    setVoucherItems([])
    setVoucherError('')
    setVoucherCreateOpen(false)
    setVoucherCreateValues(createInitialVoucherFormValues(promotion))
    setVoucherCreateErrors({})
    setVoucherMeta({
      page: 1,
      total: 0,
      total_pages: 1,
    })
  }

  function closeVoucherModal() {
    setVoucherModalPromotion(null)
    setVoucherItems([])
    setVoucherError('')
    setVoucherCreateOpen(false)
    setVoucherCreateValues(createInitialVoucherFormValues())
    setVoucherCreateErrors({})
    setVoucherCreateLoading(false)
  }

  function openVoucherCreateForm() {
    setVoucherCreateValues(createInitialVoucherFormValues(voucherModalPromotion))
    setVoucherCreateErrors({})
    setVoucherError('')
    setVoucherCreateOpen(true)
  }

  function closeVoucherCreateForm() {
    setVoucherCreateOpen(false)
    setVoucherCreateErrors({})
    setVoucherCreateValues(createInitialVoucherFormValues(voucherModalPromotion))
  }

  function updateVoucherCreateField(field, value) {
    setVoucherCreateValues((currentValues) => ({
      ...currentValues,
      [field]: value,
      ...(field === 'discountType' && value !== 'percent' ? { maxDiscountAmount: '' } : {}),
    }))
    setVoucherCreateErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
      ...(field === 'discountType' ? { maxDiscountAmount: '' } : {}),
    }))
  }

  async function submitVoucherCreateForm() {
    if (!voucherModalPromotion?.id || voucherCreateLoading) {
      return
    }

    const validationErrors = validateVoucherCreateForm(voucherCreateValues, voucherModalPromotion)
    setVoucherCreateErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setVoucherCreateLoading(true)
    setVoucherError('')

    try {
      const response = await createAdminVoucher(
        buildVoucherCreatePayload(voucherCreateValues, voucherModalPromotion),
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tạo voucher.')
      }

      setVoucherCreateOpen(false)
      setVoucherCreateValues(createInitialVoucherFormValues(voucherModalPromotion))
      setVoucherCreateErrors({})
      setVoucherReloadKey((currentKey) => currentKey + 1)
      reloadPromotions()
    } catch (createError) {
      setVoucherError(createError?.message || 'Không thể tạo voucher lúc này.')
    } finally {
      setVoucherCreateLoading(false)
    }
  }

  async function runVoucherStatusAction(voucher, nextStatus) {
    if (!voucher?.id || !nextStatus) {
      return
    }

    setVoucherActionId(voucher.id)
    setVoucherError('')

    try {
      const response = await changeAdminVoucherStatus(voucher.id, { status: nextStatus })

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể cập nhật trạng thái voucher.')
      }

      setVoucherReloadKey((currentKey) => currentKey + 1)
      reloadPromotions()
    } catch (actionError) {
      setVoucherError(actionError?.message || 'Không thể cập nhật trạng thái voucher.')
    } finally {
      setVoucherActionId('')
    }
  }

  return (
    <main className="admin-ops-page admin-promotions-page">
      <AdminPageHeader
        className="admin-promotions-page__header"
        title="Quản lý Khuyến mãi"
        subtitle="Quản lý các chương trình khuyến mãi hiện hành và đã lên lịch."
      />

      <div className="admin-promotions-page__top-row">
        <aside className="admin-promotions-page__overview" aria-label="Tổng quan Khuyến mãi">
          <h2>
            <span aria-hidden="true">
              <TagIcon />
            </span>
            Tổng quan Khuyến mãi
          </h2>
          <div className="admin-promotions-page__stats">
            {overview.map((stat) => (
              <article className="admin-promotions-page__stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong className={`admin-promotions-page__stat-value admin-promotions-page__stat-value--${stat.tone}`}>
                  {stat.value}
                </strong>
              </article>
            ))}
          </div>
        </aside>

        <AdminButton
          className="admin-promotions-page__create"
          disabled={loading || actionLoading}
          icon={<PlusIcon />}
          variant="primary"
          onClick={openCreateForm}
        >
          Thêm Khuyến mãi Mới
        </AdminButton>
      </div>

      {formState.isOpen ? (
        <PromotionFormModal
          actionLoading={actionLoading}
          closeForm={closeForm}
          formErrors={formErrors}
          formState={formState}
          formValues={formValues}
          submitPromotionForm={submitPromotionForm}
          updateFormField={updateFormField}
        />
      ) : null}

      {voucherModalPromotion ? (
        <PromotionVoucherModal
          actionId={voucherActionId}
          canManageVouchers={canManageVouchers}
          createErrors={voucherCreateErrors}
          createLoading={voucherCreateLoading}
          createOpen={voucherCreateOpen}
          createValues={voucherCreateValues}
          error={voucherError}
          loading={voucherLoading}
          meta={voucherMeta}
          promotion={voucherModalPromotion}
          vouchers={voucherItems}
          onChangeCreateField={updateVoucherCreateField}
          onClose={closeVoucherModal}
          onCloseCreate={closeVoucherCreateForm}
          onOpenCreate={openVoucherCreateForm}
          onReload={() => setVoucherReloadKey((currentKey) => currentKey + 1)}
          onStatusAction={runVoucherStatusAction}
          onSubmitCreate={submitVoucherCreateForm}
        />
      ) : null}

      {error ? (
        <AdminErrorState
          title="Không thể tải dữ liệu khuyến mãi"
          description={error}
          action={
            <AdminButton loading={loading} variant="secondary" onClick={reloadPromotions}>
              Thử lại
            </AdminButton>
          }
        />
      ) : null}

      <section className="admin-promotions-page__workspace" aria-label="Không gian quản lý khuyến mãi">
        <div className="admin-promotions-page__main">
          <div className="admin-promotions-page__toolbar" aria-label="Bộ lọc khuyến mãi">
            <AdminSearchInput
              className="admin-promotions-page__search"
              disabled={loading}
              placeholder="Tìm kiếm chương trình khuyến mãi..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <PromotionSelect
              ariaLabel="Lọc khuyến mãi"
              disabled={loading}
              icon={<FilterIcon />}
              options={ADMIN_PROMOTION_STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <PromotionSelect
              ariaLabel="Sắp xếp khuyến mãi"
              disabled={loading}
              icon={<SortIcon />}
              options={ADMIN_PROMOTION_SORT_OPTIONS}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>

          {feedback.message ? (
            <p className={`admin-promotions-page__feedback admin-promotions-page__feedback--${feedback.tone}`} role="status">
              {feedback.message}
            </p>
          ) : null}

          {loading ? (
            <AdminCard className="admin-promotions-page__loading" padding="lg">
              <AdminLoadingBlock rows={4} />
            </AdminCard>
          ) : promotions.length > 0 ? (
            <div className="admin-promotions-page__list" aria-label="Danh sách khuyến mãi">
              {promotions.map((promotion) => {
                const status = getAdminPromotionStatusMeta(promotion.status)
                const statusAction = getAdminPromotionStatusAction(promotion)
                const isTerminal = [
                  ADMIN_PROMOTION_STATUSES.cancelled,
                  ADMIN_PROMOTION_STATUSES.expired,
                ].includes(promotion.status)

                return (
                  <AdminCard
                    className={`admin-promotion-card admin-promotion-card--${status.className}`}
                    key={promotion.id}
                    padding="lg"
                  >
                    <div className="admin-promotion-card__voucher">
                      <strong>{promotion.code}</strong>
                      <span>Mã khuyến mãi</span>
                    </div>
                    <div className="admin-promotion-card__content">
                      <span className={`admin-promotion-card__status admin-promotion-card__status--${status.className}`}>
                        {status.label}
                      </span>
                      <h2>{promotion.name}</h2>
                      <dl className="admin-promotion-card__details">
                        <div>
                          <dt>Mô tả:</dt>
                          <dd>{promotion.description}</dd>
                        </div>
                        <div>
                          <dt>Loại dịch vụ áp dụng:</dt>
                          <dd>{promotion.targetServiceLabel}</dd>
                        </div>
                        <div>
                          <dt>Thời gian:</dt>
                          <dd>{formatDateRange(promotion.startDate, promotion.endDate)}</dd>
                        </div>
                        <div>
                          <dt>Trạng thái:</dt>
                          <dd>{status.label}</dd>
                        </div>
                        <div>
                          <dt>Số voucher:</dt>
                          <dd>{formatVoucherCount(promotion.voucherCount)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="admin-promotion-card__actions">
                      <AdminButton
                        className="admin-promotion-card__edit"
                        disabled={actionLoading || isTerminal}
                        icon={<EditIcon />}
                        size="sm"
                        variant={promotion.status === ADMIN_PROMOTION_STATUSES.draft ? 'secondary' : 'primary'}
                        onClick={() => openEditForm(promotion)}
                      >
                        Sửa
                      </AdminButton>
                      <AdminButton
                        className="admin-promotion-card__voucher-button"
                        disabled={!canReadVouchers}
                        icon={<VoucherIcon />}
                        size="sm"
                        title={canReadVouchers ? 'Quản lý voucher' : 'Thiếu quyền xem voucher'}
                        variant="secondary"
                        onClick={() => openVoucherModal(promotion)}
                      >
                        Voucher
                      </AdminButton>
                      {statusAction ? (
                        <AdminButton
                          className="admin-promotion-card__end"
                          disabled={actionLoading}
                          icon={statusAction.nextStatus === ADMIN_PROMOTION_STATUSES.active ? <ActivateIcon /> : <StopIcon />}
                          loading={actionLoading}
                          size="sm"
                          variant="secondary"
                          onClick={() => runStatusAction(promotion, statusAction.nextStatus)}
                        >
                          {statusAction.label}
                        </AdminButton>
                      ) : null}
                    </div>
                  </AdminCard>
                )
              })}
            </div>
          ) : (
            <AdminEmptyState
              className="admin-promotions-page__empty"
              title="Không có khuyến mãi phù hợp"
              description="Thử đổi trạng thái, từ khóa hoặc cách sắp xếp."
              action={
                <AdminButton variant="secondary" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </AdminButton>
              }
            />
          )}

          <div className="admin-promotions-page__footer">
            <p>
              {getFooterText({
                pagination,
                promotions,
                resultRange,
                searchQuery,
              })}
            </p>
            <AdminPagination
              className="admin-promotions-page__pagination"
              currentPage={pagination.page}
              labels={{ previous: '‹', next: '›' }}
              pages={pageNumbers}
              totalPages={pagination.total_pages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

export default AdminPromotionsPage
