import { useEffect, useState } from 'react'
import { PublicButton, PublicNotice } from '../public/ui/index.js'
import { uploadAvatarAsset } from '../../adapters/api/uploadApiAdapter.js'
import { updateCurrentAvatar } from '../../repositories/profileRepository.js'

function getInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (!words.length) {
    return 'NV'
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function PencilIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M12.4 4.1a1.8 1.8 0 0 1 2.55 0l.95.95a1.8 1.8 0 0 1 0 2.55L8.4 15.1 4.5 15.5l.4-3.9 7.5-7.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m11.5 5 3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M5 5 15 15M15 5 5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M10 12.2V4.5m0 0-3 3M10 4.5l3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 12.8v1.2A2.5 2.5 0 0 0 7 16.5h6a2.5 2.5 0 0 0 2.5-2.5v-1.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

export default function ProfileAvatarEditor({
  avatarUrl = '',
  displayName = '',
  onProfileUpdated,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarFileName, setAvatarFileName] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarFeedback, setAvatarFeedback] = useState({
    message: '',
    tone: 'info',
  })
  const [avatarPreview, setAvatarPreview] = useState({
    isObjectUrl: false,
    url: '',
  })

  useEffect(() => {
    if (!avatarPreview.isObjectUrl || !avatarPreview.url) {
      return undefined
    }

    const previewUrl = avatarPreview.url

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [avatarPreview])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, avatarLoading])

  function resetAvatarSelection() {
    setAvatarFile(null)
    setAvatarFileName('')
    setAvatarPreview({
      isObjectUrl: false,
      url: '',
    })
  }

  function openModal() {
    setIsOpen(true)
    setAvatarFeedback({
      message: '',
      tone: 'info',
    })
  }

  function closeModal() {
    if (avatarLoading) {
      return
    }

    resetAvatarSelection()
    setAvatarFeedback({
      message: '',
      tone: 'info',
    })
    setIsOpen(false)
  }

  function handleAvatarChange(event) {
    const nextFile = event.target.files?.[0]

    if (!nextFile) {
      return
    }

    if (!nextFile.type.startsWith('image/')) {
      setAvatarFeedback({
        message: 'Vui lòng chọn đúng tệp ảnh để cập nhật avatar.',
        tone: 'error',
      })
      event.target.value = ''
      return
    }

    setAvatarFile(nextFile)
    setAvatarFileName(nextFile.name)
    setAvatarPreview({
      isObjectUrl: true,
      url: URL.createObjectURL(nextFile),
    })
    setAvatarFeedback({
      message: '',
      tone: 'info',
    })
    event.target.value = ''
  }

  async function handleAvatarConfirm() {
    if (!avatarFile) {
      setAvatarFeedback({
        message: 'Vui lòng chọn ảnh đại diện trước khi xác nhận.',
        tone: 'error',
      })
      return
    }

    setAvatarLoading(true)
    setAvatarFeedback({
      message: 'Đang tải ảnh lên và cập nhật avatar...',
      tone: 'info',
    })

    try {
      const uploadResponse = await uploadAvatarAsset(avatarFile)
      const avatarAssetUrl = uploadResponse.data?.asset_url ?? uploadResponse.data?.secure_url

      if (!avatarAssetUrl) {
        throw new Error('Không nhận được URL avatar hợp lệ sau khi tải ảnh lên.')
      }

      const response = await updateCurrentAvatar({
        avatar_url: avatarAssetUrl,
      })

      resetAvatarSelection()
      setAvatarFeedback({
        message: response?.message || 'Ảnh đại diện đã được cập nhật thành công.',
        tone: 'success',
      })
      onProfileUpdated?.(response?.data)
      setIsOpen(false)
    } catch (error) {
      setAvatarFeedback({
        message: error?.message || 'Không thể cập nhật ảnh đại diện lúc này.',
        tone: 'error',
      })
    } finally {
      setAvatarLoading(false)
    }
  }

  const previewUrl = avatarPreview.url || avatarUrl || ''
  const previewFallback = getInitials(displayName)

  return (
    <>
      <div className="profile-hero__avatar-shell">
        {avatarUrl ? (
          <img
            alt={displayName}
            className="profile-hero__avatar-image"
            src={avatarUrl}
          />
        ) : (
          <span className="profile-hero__avatar" aria-hidden="true">
            {previewFallback}
          </span>
        )}

        <button
          aria-label="Đổi ảnh đại diện"
          className="profile-hero__avatar-edit-button"
          type="button"
          onClick={openModal}
        >
          <PencilIcon />
        </button>
      </div>

      {isOpen ? (
        <div className="profile-avatar-modal__backdrop" role="presentation" onClick={closeModal}>
          <div
            aria-labelledby="profile-avatar-modal-title"
            aria-modal="true"
            className="profile-avatar-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="profile-avatar-modal__header">
              <div className="profile-avatar-modal__heading">
                <p className="profile-avatar-modal__eyebrow">Ảnh đại diện</p>
                <h2 id="profile-avatar-modal-title">Đổi ảnh đại diện</h2>
                <p>Chọn ảnh mới, xem trước ngay trong popup rồi xác nhận để cập nhật hồ sơ.</p>
              </div>

              <button
                aria-label="Đóng popup đổi ảnh đại diện"
                className="profile-avatar-modal__close-button"
                type="button"
                onClick={closeModal}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="profile-avatar-modal__body">
              <section className="profile-avatar-modal__preview-panel" aria-label="Xem trước avatar">
                <div className="profile-avatar-modal__preview-frame">
                  {previewUrl ? (
                    <img alt={displayName} src={previewUrl} />
                  ) : (
                    <span className="profile-avatar-modal__preview-fallback" aria-hidden="true">
                      {previewFallback}
                    </span>
                  )}
                </div>

                <div className="profile-avatar-modal__preview-meta">
                  <strong>{displayName || 'Ảnh đại diện'}</strong>
                  <span>{avatarFileName || 'Ảnh hiện tại của bạn'}</span>
                </div>
              </section>

              <section className="profile-avatar-modal__control-panel">
                <PublicNotice tone="info">
                  Ảnh chỉ được cập nhật vào tài khoản sau khi bạn bấm xác nhận.
                </PublicNotice>

                <label className="public-ui-button public-ui-button--ghost public-ui-button--md profile-avatar-modal__file-button">
                  <input
                    accept="image/*"
                    disabled={avatarLoading}
                    hidden
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <span className="profile-avatar-modal__file-button-icon" aria-hidden="true">
                    <UploadIcon />
                  </span>
                  {avatarLoading ? 'Đang tải avatar...' : 'Chọn ảnh mới'}
                </label>

                <div className="profile-avatar-modal__file-meta">
                  <span>{avatarFile ? 'Đã có ảnh mới sẵn sàng xác nhận' : 'Chưa chọn ảnh mới'}</span>
                  {avatarFileName ? <strong>{avatarFileName}</strong> : null}
                </div>

                {avatarFeedback.message ? (
                  <PublicNotice
                    className="profile-avatar-modal__feedback"
                    role="status"
                    tone={avatarFeedback.tone === 'error' ? 'info' : avatarFeedback.tone}
                  >
                    {avatarFeedback.message}
                  </PublicNotice>
                ) : null}

                <div className="profile-avatar-modal__actions">
                  <PublicButton
                    disabled={avatarLoading}
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                  >
                    Hủy
                  </PublicButton>

                  <PublicButton
                    disabled={!avatarFile}
                    loading={avatarLoading}
                    type="button"
                    variant="primary"
                    onClick={handleAvatarConfirm}
                  >
                    Xác nhận cập nhật avatar
                  </PublicButton>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
