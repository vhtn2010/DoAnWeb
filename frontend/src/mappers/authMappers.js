import {
  FORGOT_PASSWORD_FORM_DEFAULT_VALUES,
  LOGIN_FORM_DEFAULT_VALUES,
  REGISTER_FORM_DEFAULT_VALUES,
} from '../constants/auth.js'

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function createLoginFormValues() {
  return {
    ...LOGIN_FORM_DEFAULT_VALUES,
  }
}

export function createRegisterFormValues() {
  return {
    ...REGISTER_FORM_DEFAULT_VALUES,
  }
}

export function createForgotPasswordFormValues() {
  return {
    ...FORGOT_PASSWORD_FORM_DEFAULT_VALUES,
  }
}

export function buildLoginPayload(formValues = {}) {
  return {
    email: normalizeText(formValues.email).toLowerCase(),
    password: String(formValues.password ?? ''),
  }
}

export function validateLoginPayload(formValues = {}) {
  const errors = {}
  const normalizedEmail = normalizeText(formValues.email)

  if (!normalizedEmail) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = 'Email chưa đúng định dạng.'
  }

  if (!String(formValues.password ?? '').trim()) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  }

  return errors
}

export function buildRegisterPayload(formValues = {}) {
  const payload = {
    full_name: normalizeText(formValues.full_name),
    email: normalizeText(formValues.email).toLowerCase(),
    password: String(formValues.password ?? ''),
  }

  const phone = normalizeText(formValues.phone)

  if (phone) {
    payload.phone = phone
  }

  return payload
}

export function validateRegisterPayload(formValues = {}) {
  const errors = {}
  const normalizedEmail = normalizeText(formValues.email)

  if (!normalizeText(formValues.full_name)) {
    errors.full_name = 'Vui lòng nhập họ và tên.'
  }

  if (!normalizedEmail) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = 'Email chưa đúng định dạng.'
  }

  if ('phone' in formValues && !normalizeText(formValues.phone)) {
    delete errors.phone
  }

  if (!String(formValues.password ?? '').trim()) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  }

  if (!String(formValues.confirm_password ?? '').trim()) {
    errors.confirm_password = 'Vui lòng nhập lại mật khẩu.'
  } else if (formValues.password !== formValues.confirm_password) {
    errors.confirm_password = 'Mật khẩu xác nhận chưa khớp.'
  }

  if (!formValues.accepted_terms) {
    errors.accepted_terms = 'Bạn cần đồng ý với điều khoản để tiếp tục.'
  }

  return errors
}

export function buildPasswordResetRequestPayload(formValues = {}) {
  return {
    email: normalizeText(formValues.email).toLowerCase(),
  }
}

export function validatePasswordResetRequestPayload(formValues = {}) {
  const errors = {}
  const normalizedEmail = normalizeText(formValues.email)

  if (!normalizedEmail) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = 'Email chưa đúng định dạng.'
  }

  return errors
}

export function buildResetPasswordPayload(formValues = {}) {
  return {
    new_password: String(formValues.new_password ?? ''),
    token: normalizeText(formValues.otp_code),
  }
}

export function validateResetPasswordPayload(formValues = {}) {
  const errors = {}

  if (!normalizeText(formValues.otp_code)) {
    errors.otp_code = 'Vui lòng nhập token đặt lại mật khẩu.'
  }

  if (!String(formValues.new_password ?? '').trim()) {
    errors.new_password = 'Vui lòng nhập mật khẩu mới.'
  }

  if (!String(formValues.confirm_password ?? '').trim()) {
    errors.confirm_password = 'Vui lòng nhập lại mật khẩu mới.'
  } else if (formValues.new_password !== formValues.confirm_password) {
    errors.confirm_password = 'Mật khẩu xác nhận chưa khớp.'
  }

  if (!formValues.accepted_terms) {
    errors.accepted_terms = 'Bạn cần đồng ý với điều khoản để tiếp tục.'
  }

  return errors
}

export function mapApiValidationErrors(details = []) {
  if (!Array.isArray(details)) {
    return {}
  }

  return details.reduce((fieldErrors, detail) => {
    if (detail?.field && detail?.message) {
      return {
        ...fieldErrors,
        [detail.field]: detail.message,
      }
    }

    return fieldErrors
  }, {})
}
