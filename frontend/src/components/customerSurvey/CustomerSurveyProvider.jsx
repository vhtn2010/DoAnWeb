import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getCurrentCustomerSurveyStatus,
  submitCurrentCustomerSurvey,
} from '../../repositories/profileRepository.js'
import { CustomerSurveyContext } from './customerSurveyContext.js'
import './customerSurvey.css'

const INITIAL_FORM = Object.freeze({
  budget_range: '',
  discovery_source: '',
  discovery_source_other: '',
  favorite_destination_other: '',
  favorite_destinations: [],
  loyalty_intent: '',
  nationality: 'Việt Nam',
  preferred_contact_channel: '',
  residence_location: '',
  travel_form_other: '',
  travel_forms: [],
  travel_style_other: '',
  travel_styles: [],
})

const OPTION_GROUPS = Object.freeze({
  budget_range: [
    { label: 'Dưới 3 triệu đồng', value: 'under_3m' },
    { label: '3 - 5 triệu đồng', value: '3m_5m' },
    { label: '5 - 10 triệu đồng', value: '5m_10m' },
    { label: '10 - 20 triệu đồng', value: '10m_20m' },
    { label: 'Trên 20 triệu đồng', value: 'over_20m' },
    { label: 'Chưa xác định', value: 'not_sure' },
  ],
  discovery_source: [
    { label: 'Tìm kiếm Google', value: 'search_engine' },
    { label: 'Mạng xã hội', value: 'social_media' },
    { label: 'Bạn bè/người thân giới thiệu', value: 'friends_family' },
    { label: 'Quảng cáo trực tuyến', value: 'advertising' },
    { label: 'Cộng đồng du lịch', value: 'travel_group' },
    { label: 'Từng sử dụng dịch vụ', value: 'returning_customer' },
    { label: 'Khác', value: 'other' },
  ],
  favorite_destinations: [
    { label: 'Biển đảo', value: 'beach' },
    { label: 'Núi và cao nguyên', value: 'mountain' },
    { label: 'Thành phố di sản', value: 'heritage_city' },
    { label: 'Thiên nhiên', value: 'nature' },
    { label: 'Điểm đến quốc tế', value: 'international' },
    { label: 'Resort nghỉ dưỡng', value: 'resort' },
    { label: 'Thành phố ẩm thực', value: 'food_city' },
    { label: 'Khác', value: 'other' },
  ],
  loyalty_intent: [
    { label: 'Chắc chắn sẽ tiếp tục/giới thiệu', value: 'definitely' },
    { label: 'Có khả năng cao', value: 'likely' },
    { label: 'Sẽ cân nhắc thêm', value: 'considering' },
    { label: 'Chưa chắc chắn', value: 'not_sure' },
  ],
  preferred_contact_channel: [
    { label: 'Điện thoại', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'Zalo', value: 'zalo' },
    { label: 'Messenger', value: 'messenger' },
    { label: 'Chat trên website', value: 'website_chat' },
  ],
  travel_forms: [
    { label: 'Đi một mình', value: 'solo' },
    { label: 'Cặp đôi', value: 'couple' },
    { label: 'Gia đình', value: 'family' },
    { label: 'Nhóm bạn', value: 'friends' },
    { label: 'Công ty/đoàn thể', value: 'company' },
    { label: 'Tour ghép đoàn', value: 'tour_group' },
    { label: 'Khác', value: 'other' },
  ],
  travel_styles: [
    { label: 'Nghỉ dưỡng nhẹ nhàng', value: 'relaxing' },
    { label: 'Khám phá địa phương', value: 'discovery' },
    { label: 'Văn hóa - lịch sử', value: 'culture' },
    { label: 'Thiên nhiên', value: 'nature' },
    { label: 'Cao cấp', value: 'luxury' },
    { label: 'Tiết kiệm', value: 'budget' },
    { label: 'Ẩm thực', value: 'food' },
    { label: 'Phiêu lưu', value: 'adventure' },
    { label: 'Khác', value: 'other' },
  ],
})

function LightningIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M13.2 2.8 5.8 13h5.1l-1.1 8.2 8.4-11.3h-5.4l.4-7.1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M7 7.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4 11.5H3.5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2V5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function createInitialForm() {
  return {
    ...INITIAL_FORM,
    favorite_destinations: [],
    travel_forms: [],
    travel_styles: [],
  }
}

function validateForm(form) {
  const errors = {}

  if (!form.residence_location.trim()) {
    errors.residence_location = 'Nhập tỉnh hoặc thành phố bạn đang sinh sống.'
  }

  if (!form.nationality.trim()) {
    errors.nationality = 'Nhập quốc tịch của bạn.'
  }

  for (const field of [
    'budget_range',
    'discovery_source',
    'loyalty_intent',
    'preferred_contact_channel',
  ]) {
    if (!form[field]) {
      errors[field] = 'Vui lòng chọn một phương án.'
    }
  }

  for (const field of ['favorite_destinations', 'travel_forms', 'travel_styles']) {
    if (!form[field].length) {
      errors[field] = 'Vui lòng chọn ít nhất một phương án.'
    }
  }

  if (form.discovery_source === 'other' && !form.discovery_source_other.trim()) {
    errors.discovery_source_other = 'Nhập nguồn bạn biết đến website.'
  }

  if (form.favorite_destinations.includes('other') && !form.favorite_destination_other.trim()) {
    errors.favorite_destination_other = 'Nhập điểm đến bạn yêu thích.'
  }

  if (form.travel_forms.includes('other') && !form.travel_form_other.trim()) {
    errors.travel_form_other = 'Nhập hình thức du lịch thường lựa chọn.'
  }

  if (form.travel_styles.includes('other') && !form.travel_style_other.trim()) {
    errors.travel_style_other = 'Nhập phong cách du lịch của bạn.'
  }

  return errors
}

function ChoicePill({ checked, children, name, onChange, type = 'checkbox', value }) {
  return (
    <label className={`customer-survey-choice ${checked ? 'customer-survey-choice--checked' : ''}`}>
      <input
        checked={checked}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
      />
      <span>{children}</span>
    </label>
  )
}

function FieldError({ message }) {
  return message ? <p className="customer-survey-field-error">{message}</p> : null
}

function getOptionLabels(options, values) {
  const selectedValues = Array.isArray(values) ? values : [values].filter(Boolean)
  const labels = selectedValues
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean)

  return labels.length ? labels.join(', ') : 'Chưa chọn'
}

function QuestionTextField({
  children,
  error,
  number,
  title,
}) {
  return (
    <div className={`customer-survey-question ${error ? 'customer-survey-question--error' : ''}`}>
      <div className="customer-survey-question__top">
        <span className="customer-survey-question__number">{number}</span>
        <span className="customer-survey-question__title">{title}</span>
      </div>
      {children}
      <FieldError message={error} />
    </div>
  )
}

function QuestionDropdown({
  children,
  error,
  number,
  summary,
  title,
}) {
  return (
    <details className={`customer-survey-question customer-survey-question--dropdown ${error ? 'customer-survey-question--error' : ''}`}>
      <summary className="customer-survey-question__summary">
        <span className="customer-survey-question__number">{number}</span>
        <span className="customer-survey-question__copy">
          <span className="customer-survey-question__title">{title}</span>
          <span className="customer-survey-question__value">{summary}</span>
        </span>
        <span className="customer-survey-question__chevron">
          <ChevronIcon />
        </span>
      </summary>
      <div className="customer-survey-question__panel">
        {children}
        <FieldError message={error} />
      </div>
    </details>
  )
}

function CustomerSurveyPopup({
  copyFeedback,
  error,
  form,
  formErrors,
  isOpen,
  mode,
  onClose,
  onCopy,
  onFieldChange,
  onMultiToggle,
  onSubmit,
  result,
  submitting,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const voucherCode = result?.voucher?.code || ''

  return (
    <div className="customer-survey-modal" role="presentation">
      <div className="customer-survey-modal__backdrop" onClick={onClose} />
      <section
        aria-labelledby="customer-survey-title"
        aria-modal="true"
        className="customer-survey-dialog"
        role="dialog"
      >
        <button
          aria-label="Đóng khảo sát"
          className="customer-survey-dialog__close"
          type="button"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        {mode === 'success' ? (
          <div className="customer-survey-success">
            <span className="customer-survey-success__icon" aria-hidden="true">
              <LightningIcon />
            </span>
            <p className="customer-survey-eyebrow">Hoàn tất khảo sát</p>
            <h2 id="customer-survey-title">Cảm ơn bạn đã chia sẻ</h2>
            <p>
              Voucher chào mừng đã được lưu vào ví ưu đãi của bạn. Bạn có thể dùng mã này
              khi đặt dịch vụ phù hợp.
            </p>

            <div className="customer-survey-voucher">
              <span>Mã voucher</span>
              <strong>{voucherCode || 'Đã lưu vào ví voucher'}</strong>
              {voucherCode ? (
                <button type="button" onClick={onCopy}>
                  <CopyIcon />
                  <span>Sao chép</span>
                </button>
              ) : null}
            </div>

            {copyFeedback ? (
              <p className="customer-survey-copy-feedback" role="status">
                {copyFeedback}
              </p>
            ) : null}
          </div>
        ) : (
          <form className="customer-survey-form" onSubmit={onSubmit}>
            <div className="customer-survey-dialog__header">
              <span className="customer-survey-dialog__badge">
                <LightningIcon />
                <span>Voucher dành riêng cho bạn</span>
              </span>
              <p className="customer-survey-eyebrow">Khảo sát nhận voucher</p>
              <h2 id="customer-survey-title">Hoàn tất thông tin để nhận voucher chào mừng</h2>
              <p>
                Thông tin của bạn được bảo mật và chỉ dùng để cải thiện chất lượng dịch vụ, gợi ý
                hành trình phù hợp hơn. Hoàn thành đầy đủ các câu hỏi dưới đây để nhận voucher ưu đãi
                vào ví của bạn.
              </p>
            </div>

            <div className="customer-survey-question-list">
              <QuestionTextField
                error={formErrors.residence_location}
                number="01"
                title="Bạn hiện đang sinh sống tại tỉnh/thành phố nào?"
              >
                <label className="customer-survey-field">
                  <span>Tỉnh/thành phố</span>
                  <input
                    name="residence_location"
                    type="text"
                    value={form.residence_location}
                    onChange={onFieldChange}
                  />
                </label>
              </QuestionTextField>

              <QuestionTextField
                error={formErrors.nationality}
                number="02"
                title="Quốc tịch của bạn là gì?"
              >
                <label className="customer-survey-field">
                  <span>Quốc tịch</span>
                  <input
                    name="nationality"
                    type="text"
                    value={form.nationality}
                    onChange={onFieldChange}
                  />
                </label>
              </QuestionTextField>
            </div>

            <QuestionDropdown
              error={formErrors.discovery_source || formErrors.discovery_source_other}
              number="03"
              summary={getOptionLabels(OPTION_GROUPS.discovery_source, form.discovery_source)}
              title="Bạn biết đến Net Việt qua kênh nào?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.discovery_source.map((option) => (
                  <ChoicePill
                    checked={form.discovery_source === option.value}
                    key={option.value}
                    name="discovery_source"
                    type="radio"
                    value={option.value}
                    onChange={onFieldChange}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
              {form.discovery_source === 'other' ? (
                <input
                  className="customer-survey-other-input"
                  name="discovery_source_other"
                  placeholder="Bạn biết đến Net Việt qua đâu?"
                  type="text"
                  value={form.discovery_source_other}
                  onChange={onFieldChange}
                />
              ) : null}
            </QuestionDropdown>

            <QuestionDropdown
              error={formErrors.travel_styles || formErrors.travel_style_other}
              number="04"
              summary={getOptionLabels(OPTION_GROUPS.travel_styles, form.travel_styles)}
              title="Bạn thường thích phong cách du lịch nào?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.travel_styles.map((option) => (
                  <ChoicePill
                    checked={form.travel_styles.includes(option.value)}
                    key={option.value}
                    name="travel_styles"
                    value={option.value}
                    onChange={() => onMultiToggle('travel_styles', option.value)}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
              {form.travel_styles.includes('other') ? (
                <input
                  className="customer-survey-other-input"
                  name="travel_style_other"
                  placeholder="Phong cách khác"
                  type="text"
                  value={form.travel_style_other}
                  onChange={onFieldChange}
                />
              ) : null}
            </QuestionDropdown>

            <QuestionDropdown
              error={formErrors.favorite_destinations || formErrors.favorite_destination_other}
              number="05"
              summary={getOptionLabels(OPTION_GROUPS.favorite_destinations, form.favorite_destinations)}
              title="Những điểm đến nào khiến bạn muốn lên đường nhất?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.favorite_destinations.map((option) => (
                  <ChoicePill
                    checked={form.favorite_destinations.includes(option.value)}
                    key={option.value}
                    name="favorite_destinations"
                    value={option.value}
                    onChange={() => onMultiToggle('favorite_destinations', option.value)}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
              {form.favorite_destinations.includes('other') ? (
                <input
                  className="customer-survey-other-input"
                  name="favorite_destination_other"
                  placeholder="Điểm đến khác"
                  type="text"
                  value={form.favorite_destination_other}
                  onChange={onFieldChange}
                />
              ) : null}
            </QuestionDropdown>

            <QuestionDropdown
              error={formErrors.budget_range}
              number="06"
              summary={getOptionLabels(OPTION_GROUPS.budget_range, form.budget_range)}
              title="Ngân sách quen thuộc cho một chuyến đi của bạn là khoảng bao nhiêu?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.budget_range.map((option) => (
                  <ChoicePill
                    checked={form.budget_range === option.value}
                    key={option.value}
                    name="budget_range"
                    type="radio"
                    value={option.value}
                    onChange={onFieldChange}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
            </QuestionDropdown>

            <QuestionDropdown
              error={formErrors.travel_forms || formErrors.travel_form_other}
              number="07"
              summary={getOptionLabels(OPTION_GROUPS.travel_forms, form.travel_forms)}
              title="Bạn thường đi du lịch theo hình thức nào?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.travel_forms.map((option) => (
                  <ChoicePill
                    checked={form.travel_forms.includes(option.value)}
                    key={option.value}
                    name="travel_forms"
                    value={option.value}
                    onChange={() => onMultiToggle('travel_forms', option.value)}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
              {form.travel_forms.includes('other') ? (
                <input
                  className="customer-survey-other-input"
                  name="travel_form_other"
                  placeholder="Hình thức khác"
                  type="text"
                  value={form.travel_form_other}
                  onChange={onFieldChange}
                />
              ) : null}
            </QuestionDropdown>

            <QuestionDropdown
              error={formErrors.preferred_contact_channel}
              number="08"
              summary={getOptionLabels(OPTION_GROUPS.preferred_contact_channel, form.preferred_contact_channel)}
              title="Bạn muốn Net Việt liên hệ với bạn qua kênh nào?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.preferred_contact_channel.map((option) => (
                  <ChoicePill
                    checked={form.preferred_contact_channel === option.value}
                    key={option.value}
                    name="preferred_contact_channel"
                    type="radio"
                    value={option.value}
                    onChange={onFieldChange}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
            </QuestionDropdown>

            <QuestionDropdown
              error={formErrors.loyalty_intent}
              number="09"
              summary={getOptionLabels(OPTION_GROUPS.loyalty_intent, form.loyalty_intent)}
              title="Bạn có sẵn lòng tiếp tục sử dụng hoặc giới thiệu Net Việt không?"
            >
              <div className="customer-survey-choice-grid">
                {OPTION_GROUPS.loyalty_intent.map((option) => (
                  <ChoicePill
                    checked={form.loyalty_intent === option.value}
                    key={option.value}
                    name="loyalty_intent"
                    type="radio"
                    value={option.value}
                    onChange={onFieldChange}
                  >
                    {option.label}
                  </ChoicePill>
                ))}
              </div>
            </QuestionDropdown>

            {error ? (
              <p className="customer-survey-form-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="customer-survey-actions">
              <button className="customer-survey-submit" disabled={submitting} type="submit">
                {submitting ? 'Đang lưu...' : 'Hoàn thành và nhận voucher'}
              </button>
              <button className="customer-survey-secondary" disabled={submitting} type="button" onClick={onClose}>
                Để sau
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export function CustomerSurveyProvider({
  children,
  onLoginRequired,
  publicSession,
}) {
  const isCustomer = Boolean(publicSession?.isCustomer)
  const [status, setStatus] = useState({
    data: null,
    loading: false,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState('form')
  const [form, setForm] = useState(() => createInitialForm())
  const [formErrors, setFormErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  const loadStatus = useCallback(async () => {
    if (!isCustomer) {
      setStatus({ data: null, loading: false })
      return null
    }

    setStatus((currentStatus) => ({
      ...currentStatus,
      loading: true,
    }))

    try {
      const response = await getCurrentCustomerSurveyStatus()
      const nextData = response.data ?? null

      setStatus({
        data: nextData,
        loading: false,
      })

      return nextData
    } catch {
      setStatus({
        data: null,
        loading: false,
      })
      return null
    }
  }, [isCustomer])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const completed = Boolean(status.data?.completed)

  const openSurvey = useCallback(async () => {
    if (!isCustomer) {
      onLoginRequired?.({
        description: 'Đăng nhập để hoàn thành khảo sát và nhận voucher chào mừng dành riêng cho tài khoản của bạn.',
        eyebrow: 'Voucher chào mừng',
        title: 'Vui lòng đăng nhập để nhận ưu đãi',
      })
      return
    }

    const nextStatus = status.data || await loadStatus()

    if (nextStatus?.completed) {
      setMode('success')
    } else {
      setMode('form')
    }

    setCopyFeedback('')
    setSubmitError('')
    setIsOpen(true)
  }, [isCustomer, loadStatus, onLoginRequired, status.data])

  const closeSurvey = useCallback(() => {
    setIsOpen(false)
    setCopyFeedback('')
  }, [])

  function handleFieldChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === 'discovery_source' && value !== 'other'
        ? { discovery_source_other: '' }
        : {}),
    }))
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
  }

  function handleMultiToggle(field, value) {
    setForm((currentForm) => {
      const currentValues = currentForm[field]
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]
      const otherFieldMap = {
        favorite_destinations: 'favorite_destination_other',
        travel_forms: 'travel_form_other',
        travel_styles: 'travel_style_other',
      }
      const otherField = otherFieldMap[field]

      return {
        ...currentForm,
        [field]: nextValues,
        ...(value === 'other' && otherField && !nextValues.includes('other')
          ? { [otherField]: '' }
          : {}),
      }
    })
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) {
      return
    }

    const errors = validateForm(form)

    setFormErrors(errors)
    setSubmitError('')

    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      const response = await submitCurrentCustomerSurvey(form)
      const nextData = response.data

      setStatus({
        data: nextData,
        loading: false,
      })
      setMode('success')
      setCopyFeedback('')
    } catch (error) {
      if (error?.code === 'DUPLICATE_RESOURCE') {
        const nextStatus = await loadStatus()

        if (nextStatus?.completed) {
          setMode('success')
          setSubmitError('')
          return
        }
      }

      setSubmitError(
        error?.message ||
          'Chưa thể lưu khảo sát và cấp voucher lúc này. Vui lòng thử lại sau.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyVoucher() {
    const code = status.data?.voucher?.code

    if (!code) {
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      setCopyFeedback('Đã sao chép mã voucher.')
    } catch {
      setCopyFeedback(`Mã voucher của bạn: ${code}`)
    }
  }

  const contextValue = useMemo(
    () => ({
      completed,
      isCustomer,
      isStatusLoading: status.loading,
      openSurvey,
    }),
    [completed, isCustomer, openSurvey, status.loading],
  )

  return (
    <CustomerSurveyContext.Provider value={contextValue}>
      {children}
      <CustomerSurveyPopup
        copyFeedback={copyFeedback}
        error={submitError}
        form={form}
        formErrors={formErrors}
        isOpen={isOpen}
        mode={mode}
        result={status.data}
        submitting={submitting}
        onClose={closeSurvey}
        onCopy={handleCopyVoucher}
        onFieldChange={handleFieldChange}
        onMultiToggle={handleMultiToggle}
        onSubmit={handleSubmit}
      />
    </CustomerSurveyContext.Provider>
  )
}
