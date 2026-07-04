import { useEffect, useId, useState } from 'react'
import {
  formatRoleActorName,
  getAdminRoleLabel,
  getAdminServiceStatusLabel,
  getAdminServiceTypeLabel,
  getServiceStatusTransition,
} from '../../../mappers/adminServiceMappers.js'

const actionContentMap = {
  submit_review: {
    eyebrow: 'Workflow mock',
    title: 'Gửi duyệt dịch vụ',
    description:
      'Xác nhận chuyển dịch vụ từ bản nháp sang trạng thái chờ duyệt trên local state.',
    confirmLabel: 'Gửi duyệt',
    nextStatus: 'pending_review',
  },
  approve: {
    eyebrow: 'Phê duyệt dịch vụ',
    title: 'Duyệt dịch vụ',
    description:
      'Trạng thái sẽ chuyển sang active. Có thể thêm ghi chú nội bộ trước khi tích hợp API thật.',
    confirmLabel: 'Duyệt dịch vụ',
    nextStatus: 'active',
  },
  reject: {
    eyebrow: 'Phê duyệt dịch vụ',
    title: 'Từ chối dịch vụ',
    description: 'Trạng thái sẽ chuyển về draft. Vui lòng nhập lý do để QA flow rõ ràng hơn.',
    confirmLabel: 'Từ chối',
    nextStatus: 'draft',
    warningText: 'Lý do từ chối sẽ được dùng làm dữ liệu mock cho bước phản hồi nhà cung cấp.',
  },
  hide: {
    eyebrow: 'Ẩn dịch vụ',
    title: 'Ẩn dịch vụ',
    description: 'Dịch vụ active sẽ được chuyển sang hidden trên local state.',
    confirmLabel: 'Tạm ẩn',
    nextStatus: 'hidden',
    warningText: 'Dịch vụ sẽ không còn ở trạng thái hiển thị công khai sau khi tích hợp API thật.',
  },
  restore: {
    eyebrow: 'Khôi phục dịch vụ',
    title: 'Khôi phục dịch vụ',
    description:
      'Khôi phục dịch vụ hidden hoặc archived. Mặc định sẽ trả về active để bám workflow mock.',
    confirmLabel: 'Khôi phục',
  },
  delete: {
    eyebrow: 'Xóa mềm dịch vụ',
    title: 'Xóa mềm dịch vụ',
    description:
      'Dịch vụ sẽ được chuyển sang deleted và vẫn giữ lại trong danh sách để phù hợp soft delete.',
    confirmLabel: 'Xóa mềm',
    nextStatus: 'deleted',
    warningText: 'Thao tác này không hard delete nhưng sẽ chuyển trạng thái dịch vụ sang đã xóa.',
  },
}

function getInitialFormValues() {
  return {
    note: '',
    reason: '',
    target_status: 'active',
  }
}

function getValidationError(actionKey, formValues) {
  if (actionKey === 'reject' && !formValues.reason.trim()) {
    return 'Vui lòng nhập lý do từ chối.'
  }

  if (actionKey === 'delete' && !formValues.reason.trim()) {
    return 'Vui lòng nhập lý do xóa mềm.'
  }

  return ''
}

function getStatusTone(status) {
  if (status === 'active') {
    return 'active'
  }

  if (status === 'pending_review' || status === 'expired') {
    return 'pending'
  }

  if (status === 'hidden' || status === 'sold_out') {
    return 'hidden'
  }

  if (status === 'deleted') {
    return 'deleted'
  }

  return 'draft'
}

function AdminServiceStatusActionModal({
  actionKey,
  currentRole,
  onClose,
  onConfirm,
  service,
}) {
  const [formValues, setFormValues] = useState(() => getInitialFormValues())
  const [errorMessage, setErrorMessage] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const content = actionContentMap[actionKey]

  useEffect(() => {
    setFormValues(getInitialFormValues())
    setErrorMessage('')
  }, [actionKey, service])

  useEffect(() => {
    if (!content || !service) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [content, onClose, service])

  if (!content || !service) {
    return null
  }

  const nextStatus = getServiceStatusTransition(actionKey, service.status, formValues.target_status)
  const currentStatusLabel = getAdminServiceStatusLabel(service.status)
  const nextStatusLabel = getAdminServiceStatusLabel(nextStatus)
  const actorRoleLabel = getAdminRoleLabel(currentRole)
  const actorName = formatRoleActorName(currentRole)
  const serviceTypeLabel = getAdminServiceTypeLabel(service.service_type)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))

    if (errorMessage) {
      setErrorMessage('')
    }
  }

  const handleSubmit = () => {
    const nextErrorMessage = getValidationError(actionKey, formValues)

    if (nextErrorMessage) {
      setErrorMessage(nextErrorMessage)
      return
    }

    onConfirm({
      note: formValues.note.trim(),
      reason: formValues.reason.trim(),
      target_status: formValues.target_status,
    })
  }

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="admin-service-action-modal"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="admin-service-action-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-service-action-modal__header">
          <div className="admin-service-action-modal__header-copy">
            <p className="admin-service-action-modal__eyebrow">{content.eyebrow}</p>
            <h2 className="admin-service-action-modal__title" id={titleId}>
              {content.title}
            </h2>
            <p className="admin-service-action-modal__subtitle" id={descriptionId}>
              {content.description}
            </p>
          </div>

          <button
            aria-label="Đóng xác nhận thao tác dịch vụ"
            className="admin-service-action-modal__close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="admin-service-action-modal__body">
          <section className="admin-service-action-modal__service-card">
            <div className="admin-service-action-modal__service-preview">
              {service.image_url ? (
                <img
                  alt={service.title}
                  className="admin-service-action-modal__service-image"
                  src={service.image_url}
                />
              ) : (
                <div className="admin-service-action-modal__service-placeholder">Chưa có ảnh</div>
              )}
            </div>

            <div className="admin-service-action-modal__service-copy">
              <div className="admin-service-action-modal__service-head">
                <span className="admin-service-action-modal__service-code">{service.service_code}</span>
                <span className="admin-service-action-modal__service-type">{serviceTypeLabel}</span>
              </div>
              <strong className="admin-service-action-modal__service-title">{service.title}</strong>
              <p className="admin-service-action-modal__service-summary">
                {service.short_description}
              </p>

              <dl className="admin-service-action-modal__service-meta">
                <div>
                  <dt>Đối tác</dt>
                  <dd>{service.provider_name}</dd>
                </div>
                <div>
                  <dt>Địa điểm</dt>
                  <dd>{service.location_text}</dd>
                </div>
                <div>
                  <dt>Vai trò thao tác</dt>
                  <dd>{actorRoleLabel}</dd>
                </div>
                <div>
                  <dt>Người thao tác mock</dt>
                  <dd>{actorName}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-service-action-modal__transition-card">
            <div className="admin-service-action-modal__transition-flow">
              <div className="admin-service-action-modal__transition-state">
                <span className="admin-service-action-modal__transition-label">Trạng thái hiện tại</span>
                <span
                  className={`admin-service-action-modal__status-badge admin-service-action-modal__status-badge--${getStatusTone(service.status)}`}
                >
                  {currentStatusLabel}
                </span>
              </div>

              <span className="admin-service-action-modal__transition-arrow" aria-hidden="true">
                →
              </span>

              <div className="admin-service-action-modal__transition-state">
                <span className="admin-service-action-modal__transition-label">Sau thao tác</span>
                <span
                  className={`admin-service-action-modal__status-badge admin-service-action-modal__status-badge--${getStatusTone(nextStatus)}`}
                >
                  {nextStatusLabel}
                </span>
              </div>
            </div>

            {content.warningText ? (
              <p className="admin-service-action-modal__warning" role="status">
                {content.warningText}
              </p>
            ) : null}
          </section>

          {actionKey === 'approve' ? (
            <label className="admin-service-action-modal__field">
              <span className="admin-service-action-modal__label">Ghi chú nội bộ</span>
              <textarea
                className="admin-service-action-modal__textarea"
                name="note"
                rows="4"
                value={formValues.note}
                onChange={handleChange}
              />
            </label>
          ) : null}

          {actionKey === 'reject' || actionKey === 'hide' || actionKey === 'delete' ? (
            <label className="admin-service-action-modal__field">
              <span className="admin-service-action-modal__label">
                {actionKey === 'hide' ? 'Lý do / ghi chú' : 'Lý do xử lý'}
              </span>
              <textarea
                className={`admin-service-action-modal__textarea${
                  errorMessage ? ' admin-service-action-modal__textarea--error' : ''
                }`}
                name="reason"
                rows="4"
                value={formValues.reason}
                onChange={handleChange}
              />
            </label>
          ) : null}

          {actionKey === 'restore' ? (
            <label className="admin-service-action-modal__field">
              <span className="admin-service-action-modal__label">Trạng thái khôi phục</span>
              <select
                className="admin-service-action-modal__select"
                name="target_status"
                value={formValues.target_status}
                onChange={handleChange}
              >
                <option value="active">active</option>
                <option value="draft">draft</option>
              </select>
            </label>
          ) : null}

          {errorMessage ? (
            <p className="admin-service-action-modal__error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="admin-service-action-modal__footer">
          <button
            className="admin-service-action-modal__button admin-service-action-modal__button--ghost"
            type="button"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className={`admin-service-action-modal__button ${
              actionKey === 'reject' || actionKey === 'delete'
                ? 'admin-service-action-modal__button--danger'
                : 'admin-service-action-modal__button--primary'
            }`}
            type="button"
            onClick={handleSubmit}
          >
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminServiceStatusActionModal
