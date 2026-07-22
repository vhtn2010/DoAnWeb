import { useEffect, useId } from 'react'
import { AdminButton, AdminStatusBadge } from '../ui/index.js'
import { getAdminUserStatusMeta } from '../../../mappers/adminUserMappers.js'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  )
}

function ReasonActionIcon({ tone = 'neutral', actionType = '' }) {
  if (actionType === 'delete') {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path
          d="M5 7h14M10 11v6m4-6v6M7 7l1 13h8l1-13M9 7V4h6v3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  if (tone === 'success') {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path
          d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A8.5 8.5 0 0 0 12 3.5Zm-1.2 11.1 4.8-4.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 3.5a7 7 0 0 1 7 7V14l1.5 2.8a1 1 0 0 1-.9 1.5H4.4a1 1 0 0 1-.9-1.5L5 14V10.5a7 7 0 0 1 7-7Zm0 16.3a2.2 2.2 0 0 0 2.1-1.5H9.9A2.2 2.2 0 0 0 12 19.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function getToneLabel(actionType, tone) {
  if (actionType === 'delete') {
    return 'Xóa mềm'
  }

  if (tone === 'success') {
    return 'Khôi phục'
  }

  return 'Bảo mật'
}

export default function AdminUserReasonModal({
  isSubmitting = false,
  modal,
  onChangeReason,
  onClose,
  onConfirm,
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!modal?.isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isSubmitting, modal?.isOpen, onClose])

  if (!modal?.isOpen || !modal.user) {
    return null
  }

  const user = modal.user
  const currentStatusMeta = getAdminUserStatusMeta(modal.currentStatusLabel || user.status)
  const nextStatusMeta = getAdminUserStatusMeta(
    modal.nextStatus === 'deleted' ? 'deleted' : modal.nextStatus,
  )
  const confirmTone = modal.tone === 'danger' ? 'danger' : 'primary'
  const toneLabel = getToneLabel(modal.actionType, modal.tone)

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="admin-users-page__modal-backdrop admin-users-page__reason-backdrop"
      role="dialog"
      onClick={onClose}
    >
      <section
        className={`admin-users-page__reason-modal admin-users-page__reason-modal--${modal.tone}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Đóng hộp thoại"
          className="admin-users-page__reason-modal-close"
          disabled={isSubmitting}
          type="button"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <header className="admin-users-page__reason-modal-header">
          <span
            className={`admin-users-page__reason-modal-icon admin-users-page__reason-modal-icon--${modal.tone}`}
            aria-hidden="true"
          >
            <ReasonActionIcon actionType={modal.actionType} tone={modal.tone} />
          </span>

          <div className="admin-users-page__reason-modal-heading">
            <p className="admin-users-page__reason-modal-eyebrow">{toneLabel}</p>
            <h2 id={titleId}>{modal.title}</h2>
            <p id={descriptionId}>{modal.subtitle}</p>
          </div>
        </header>

        <div className="admin-users-page__reason-modal-body">
          <section className="admin-users-page__reason-modal-summary">
            <div className="admin-users-page__reason-modal-user">
              <span className="admin-users-page__reason-modal-avatar">
                {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : user.initials}
              </span>
              <div className="admin-users-page__reason-modal-user-copy">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>

            <dl className="admin-users-page__reason-modal-meta">
              <div>
                <dt>Vai trò</dt>
                <dd>{user.roleLabel}</dd>
              </div>
              <div>
                <dt>Hiện tại</dt>
                <dd>
                  <AdminStatusBadge tone={currentStatusMeta.tone}>{currentStatusMeta.label}</AdminStatusBadge>
                </dd>
              </div>
              <div>
                <dt>Sau thao tác</dt>
                <dd>
                  <AdminStatusBadge tone={nextStatusMeta.tone}>{modal.nextStatusLabel}</AdminStatusBadge>
                </dd>
              </div>
              <div>
                <dt>Mã hiển thị</dt>
                <dd>#{user.displayId}</dd>
              </div>
            </dl>

            <p className="admin-users-page__reason-modal-warning">{modal.warningText}</p>
          </section>

          <section className="admin-users-page__reason-modal-form">
            <div className="admin-users-page__reason-modal-chips" aria-label="Lý do gợi ý">
              {modal.quickReasons.map((reason) => (
                <button
                  className="admin-users-page__reason-chip"
                  key={reason}
                  type="button"
                  onClick={() => onChangeReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>

            <label className="admin-users-page__reason-field">
              <span>Lý do</span>
              <textarea
                aria-invalid={Boolean(modal.errorMessage) || undefined}
                className={modal.errorMessage ? 'admin-users-page__reason-textarea admin-users-page__reason-textarea--error' : 'admin-users-page__reason-textarea'}
                rows="6"
                value={modal.reason}
                onChange={(event) => onChangeReason(event.target.value)}
              />
            </label>

            <div className="admin-users-page__reason-footer-note">
              <span>Thông tin này sẽ được lưu vào lịch sử thao tác.</span>
            </div>

            {modal.errorMessage ? (
              <p className="admin-users-page__reason-error" role="alert">
                {modal.errorMessage}
              </p>
            ) : null}
          </section>
        </div>

        <footer className="admin-users-page__reason-modal-footer">
          <AdminButton disabled={isSubmitting} variant="secondary" onClick={onClose}>
            Hủy
          </AdminButton>
          <AdminButton
            loading={isSubmitting}
            variant={confirmTone}
            onClick={onConfirm}
          >
            {modal.confirmLabel}
          </AdminButton>
        </footer>
      </section>
    </div>
  )
}
