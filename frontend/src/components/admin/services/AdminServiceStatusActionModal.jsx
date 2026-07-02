import { useState } from 'react'

const actionContentMap = {
  submit_review: {
    eyebrow: 'Submit review mock',
    title: 'Gửi duyệt dịch vụ',
    description:
      'Xác nhận chuyển dịch vụ từ bản nháp sang trạng thái chờ duyệt trên local state.',
    confirmLabel: 'Xác nhận gửi duyệt',
  },
  approve: {
    eyebrow: 'Approve mock',
    title: 'Duyệt dịch vụ',
    description:
      'Trạng thái sẽ chuyển sang active. Có thể thêm ghi chú nội bộ trước khi tích hợp API thật.',
    confirmLabel: 'Xác nhận duyệt',
  },
  reject: {
    eyebrow: 'Reject mock',
    title: 'Từ chối dịch vụ',
    description: 'Trạng thái sẽ chuyển về draft. Vui lòng nhập lý do để QA flow rõ ràng hơn.',
    confirmLabel: 'Xác nhận từ chối',
  },
  hide: {
    eyebrow: 'Hide mock',
    title: 'Ẩn dịch vụ',
    description: 'Dịch vụ active sẽ được chuyển sang hidden trên local state.',
    confirmLabel: 'Xác nhận ẩn',
  },
  restore: {
    eyebrow: 'Restore mock',
    title: 'Khôi phục dịch vụ',
    description:
      'Khôi phục dịch vụ hidden hoặc archived. Mặc định sẽ trả về active để bám workflow mock.',
    confirmLabel: 'Xác nhận khôi phục',
  },
  delete: {
    eyebrow: 'Soft delete mock',
    title: 'Xóa mềm dịch vụ',
    description:
      'Dịch vụ sẽ được chuyển sang deleted và vẫn giữ lại trong danh sách để phù hợp soft delete.',
    confirmLabel: 'Xác nhận xóa mềm',
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

function AdminServiceStatusActionModal({ actionKey, onClose, onConfirm, service }) {
  const [formValues, setFormValues] = useState(() => getInitialFormValues())
  const [errorMessage, setErrorMessage] = useState('')

  const content = actionContentMap[actionKey]

  if (!content || !service) {
    return null
  }

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
    <div aria-modal="true" className="admin-service-action-modal" role="dialog" onClick={onClose}>
      <div
        className="admin-service-action-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-service-action-modal__header">
          <div>
            <p className="admin-service-action-modal__eyebrow">{content.eyebrow}</p>
            <h2 className="admin-service-action-modal__title">{content.title}</h2>
            <p className="admin-service-action-modal__subtitle">{content.description}</p>
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
          <div className="admin-service-action-modal__service">
            <span className="admin-service-action-modal__service-code">{service.service_code}</span>
            <strong className="admin-service-action-modal__service-title">{service.title}</strong>
            <span className="admin-service-action-modal__service-status">
              Trạng thái hiện tại: {service.status}
            </span>
          </div>

          {actionKey === 'approve' ? (
            <label className="admin-service-action-modal__field">
              <span className="admin-service-action-modal__label">note</span>
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
              <span className="admin-service-action-modal__label">reason</span>
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
              <span className="admin-service-action-modal__label">target_status</span>
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
            className="admin-service-action-modal__button admin-service-action-modal__button--primary"
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
