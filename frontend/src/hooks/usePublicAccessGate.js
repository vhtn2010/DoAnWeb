import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import usePublicSession from './usePublicSession.js'
import {
  buildLoginRedirectPath,
  getReturnPath,
} from '../utils/loginRedirect.js'

const DEFAULT_MODAL_COPY = Object.freeze({
  description: 'Đăng nhập để tiếp tục sử dụng khu vực này thuận tiện hơn.',
  eyebrow: 'Tài khoản',
  title: 'Vui lòng đăng nhập để tiếp tục',
})

export default function usePublicAccessGate() {
  const location = useLocation()
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { isCustomerPreview } = usePublicSession()

  function openLoginRequiredModal(modalOptions = {}) {
    if (typeof outletContext?.openLoginRequiredModal === 'function') {
      outletContext.openLoginRequiredModal({
        ...DEFAULT_MODAL_COPY,
        ...modalOptions,
        returnPath: getReturnPath(location),
      })
      return true
    }

    return false
  }

  function navigateWithCustomerGate(path, modalOptions = {}) {
    if (isCustomerPreview) {
      navigate(path)
      return
    }

    const openedInline = openLoginRequiredModal(modalOptions)

    if (!openedInline) {
      const returnPath = getReturnPath(location)

      navigate(buildLoginRedirectPath(returnPath), {
        state: { from: returnPath },
      })
    }
  }

  return {
    navigateWithCustomerGate,
    openLoginRequiredModal,
  }
}
