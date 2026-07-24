export const AUTH_RESET_CODE_EXPIRES_IN_SECONDS = 300

export const AUTH_SOCIAL_PROVIDERS = Object.freeze({
  google: 'Google',
  facebook: 'Facebook',
})

export const LOGIN_FORM_DEFAULT_VALUES = Object.freeze({
  email: '',
  password: '',
})

export const REGISTER_FORM_DEFAULT_VALUES = Object.freeze({
  full_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  password: '',
  confirm_password: '',
  accepted_terms: false,
})

export const FORGOT_PASSWORD_FORM_DEFAULT_VALUES = Object.freeze({
  email: '',
  otp_code: '',
  new_password: '',
  confirm_password: '',
  accepted_terms: false,
})
