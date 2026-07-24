import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import LoginRequiredModal from '../components/auth/LoginRequiredModal.jsx'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PublicFooter from '../components/layout/PublicFooter.jsx'
import { AddToCartToastProvider } from '../components/public/feedback/AddToCartToast.jsx'
import { CustomerSurveyProvider } from '../components/customerSurvey/CustomerSurveyProvider.jsx'
import CustomerCareMiniWidget from '../components/support/CustomerCareMiniWidget.jsx'
import { createPublicSessionState } from '../hooks/usePublicSession.js'
import { getCurrentProfile } from '../repositories/profileRepository.js'
import { subscribeAuthEvents } from '../services/apiClient.js'
import { buildLoginRedirectPath } from '../utils/loginRedirect.js'
import '../components/public/ui/publicUiKit.css'

const CUSTOMER_ONLY_ROUTE_MODAL_MAP = Object.freeze([
  {
    matcher: (pathname) => pathname === '/cart',
    modal: {
      description: 'Đăng nhập để lưu dịch vụ bạn chọn và tiếp tục đặt chỗ thuận tiện hơn.',
      eyebrow: 'Giỏ hàng',
      title: 'Vui lòng đăng nhập để có thể thêm vào giỏ hàng',
    },
  },
  {
    matcher: (pathname) => pathname === '/checkout',
    modal: {
      description:
        'Đăng nhập để giữ lại giỏ hàng, nhập thông tin hành khách và hoàn tất đặt chỗ thuận tiện hơn.',
      eyebrow: 'Thanh toán',
      title: 'Vui lòng đăng nhập để tiếp tục bước đặt chỗ',
    },
  },
  {
    matcher: (pathname) =>
      pathname === '/booking-confirmation' ||
      pathname.startsWith('/booking-confirmation/'),
    modal: {
      description:
        'Đăng nhập để xem chi tiết đơn đặt chỗ, kiểm tra dịch vụ đã chọn và tiếp tục sang bước thanh toán.',
      eyebrow: 'Đơn đặt chỗ',
      title: 'Vui lòng đăng nhập để xem đơn đặt chỗ của bạn',
    },
  },
  {
    matcher: (pathname) =>
      pathname === '/payment-confirmation' ||
      pathname.startsWith('/payment-confirmation/'),
    modal: {
      description:
        'Đăng nhập để giữ lại thông tin đơn hàng, chọn phương thức phù hợp và hoàn tất thanh toán thuận tiện hơn.',
      eyebrow: 'Thanh toán',
      title: 'Vui lòng đăng nhập để tiếp tục thanh toán',
    },
  },
  {
    matcher: (pathname) =>
      pathname === '/payment-success' || pathname.startsWith('/payment-success/'),
    modal: {
      description:
        'Đăng nhập để xem kết quả thanh toán, tải chứng từ và theo dõi bước tiếp theo của đơn hàng.',
      eyebrow: 'Thanh toán',
      title: 'Vui lòng đăng nhập để xem kết quả thanh toán',
    },
  },
  {
    matcher: (pathname) => pathname.startsWith('/payment-transfer/'),
    modal: {
      description:
        'Đăng nhập để xem thông tin chuyển khoản, tải bill và theo dõi trạng thái xác nhận.',
      eyebrow: 'Thanh toán',
      title: 'Vui lòng đăng nhập để tiếp tục chuyển khoản',
    },
  },
  {
    matcher: (pathname) => pathname === '/profile',
    modal: {
      description:
        'Đăng nhập để xem hồ sơ, lịch sử đơn hàng và các tiện ích cá nhân dành riêng cho tài khoản của bạn.',
      eyebrow: 'Tài khoản',
      title: 'Vui lòng đăng nhập để mở tài khoản cá nhân',
    },
  },
  {
    matcher: (pathname) => pathname === '/notifications',
    modal: {
      description:
        'Đăng nhập để theo dõi thông báo đơn hàng, thanh toán và các cập nhật hệ thống dành riêng cho bạn.',
      eyebrow: 'Hộp thư thông báo',
      title: 'Vui lòng đăng nhập để xem thông báo của bạn',
    },
  },
  {
    matcher: (pathname) => pathname === '/my-vouchers',
    modal: {
      description:
        'Đăng nhập để xem lại mã đã lưu, nhập mã bạn đang có và kiểm tra khả năng áp dụng theo giỏ hàng hiện tại.',
      eyebrow: 'Mã ưu đãi',
      title: 'Vui lòng đăng nhập để dùng mã ưu đãi của bạn',
    },
  },
  {
    matcher: (pathname) => pathname === '/departure-reminders',
    modal: {
      description:
        'Đăng nhập để theo dõi các mốc check-in, giờ ra sân bay và nhắc việc gắn với từng đơn đặt chỗ của bạn.',
      eyebrow: 'Nhắc lịch khởi hành',
      title: 'Vui lòng đăng nhập để mở nhắc lịch chuyến đi',
    },
  },
])

function resolveCustomerOnlyModal(pathname = '') {
  const matchedEntry = CUSTOMER_ONLY_ROUTE_MODAL_MAP.find((entry) => entry.matcher(pathname))

  return matchedEntry?.modal ?? null
}

function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [_sessionVersion, setSessionVersion] = useState(0)
  const [profileHydration, setProfileHydration] = useState({
    requestedUserId: '',
    status: 'idle',
  })
  const [loginRequiredModal, setLoginRequiredModal] = useState({
    description: '',
    eyebrow: '',
    isOpen: false,
    returnPath: '',
    title: '',
  })
  const basePublicSession = createPublicSessionState()
  const currentUserId = basePublicSession.currentUser?.id ?? ''
  const currentAvatarUrl = String(basePublicSession.currentUser?.avatar_url ?? '').trim()
  const isProfileHydrating =
    profileHydration.status === 'loading' &&
    profileHydration.requestedUserId === currentUserId
  const publicSession = useMemo(
    () => ({
      ...basePublicSession,
      isProfileHydrating,
    }),
    [basePublicSession, isProfileHydrating],
  )
  const isHomePage = location.pathname === '/'

  const closeLoginRequiredModal = useCallback(() => {
    setLoginRequiredModal((currentState) => ({
      ...currentState,
      isOpen: false,
    }))
  }, [])

  const openLoginRequiredModal = useCallback((modalOptions = {}) => {
    setLoginRequiredModal({
      description:
        modalOptions.description ||
        'Đăng nhập để tiếp tục sử dụng khu vực này thuận tiện hơn.',
      eyebrow: modalOptions.eyebrow || 'Tài khoản',
      isOpen: true,
      returnPath:
        modalOptions.returnPath ||
        `${location.pathname}${location.search}${location.hash}`,
      title: modalOptions.title || 'Vui lòng đăng nhập để tiếp tục',
    })
  }, [location.hash, location.pathname, location.search])

  const handleLoginRequiredModalLogin = useCallback(() => {
    const nextLoginPath = buildLoginRedirectPath(loginRequiredModal.returnPath)

    closeLoginRequiredModal()
    navigate(nextLoginPath, {
      state: { from: loginRequiredModal.returnPath || '/' },
    })
  }, [closeLoginRequiredModal, loginRequiredModal.returnPath, navigate])

  const outletContext = {
    closeLoginRequiredModal,
    openLoginRequiredModal,
    publicSession,
  }

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(() => {
      setSessionVersion((currentVersion) => currentVersion + 1)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!basePublicSession.isCustomer) {
      setProfileHydration((currentHydration) =>
        currentHydration.requestedUserId || currentHydration.status !== 'idle'
          ? {
              requestedUserId: '',
              status: 'idle',
            }
          : currentHydration,
      )
      return
    }

    if (
      !currentUserId ||
      currentAvatarUrl ||
      profileHydration.requestedUserId === currentUserId
    ) {
      return
    }

    let isActive = true

    setProfileHydration({
      requestedUserId: currentUserId,
      status: 'loading',
    })

    getCurrentProfile()
      .catch(() => null)
      .finally(() => {
        if (!isActive) {
          return
        }

        setProfileHydration((currentHydration) =>
          currentHydration.requestedUserId === currentUserId
            ? {
                ...currentHydration,
                status: 'resolved',
              }
            : currentHydration,
        )
      })

    return () => {
      isActive = false
    }
  }, [
    basePublicSession.isCustomer,
    currentAvatarUrl,
    currentUserId,
    profileHydration.requestedUserId,
  ])

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(location.search)

    if (!nextSearchParams.has('auth')) {
      return
    }

    nextSearchParams.delete('auth')
    const nextSearch = nextSearchParams.toString()

    navigate({
      hash: location.hash,
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    }, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    if (publicSession.isCustomer || publicSession.isAuthenticated) {
      return undefined
    }

    function handleRestrictedLinkClick(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const targetElement = event.target instanceof Element ? event.target : null
      const anchor = targetElement?.closest('a[href]')

      if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') {
        return
      }

      let nextUrl

      try {
        nextUrl = new URL(anchor.href, window.location.origin)
      } catch {
        return
      }

      if (nextUrl.origin !== window.location.origin) {
        return
      }

      const modalConfig = resolveCustomerOnlyModal(nextUrl.pathname)

      if (!modalConfig) {
        return
      }

      event.preventDefault()
      openLoginRequiredModal(modalConfig)
    }

    document.addEventListener('click', handleRestrictedLinkClick, true)

    return () => {
      document.removeEventListener('click', handleRestrictedLinkClick, true)
    }
  }, [
    openLoginRequiredModal,
    publicSession.isAuthenticated,
    publicSession.isCustomer,
  ])

  return (
    <AddToCartToastProvider>
      <CustomerSurveyProvider
        publicSession={publicSession}
        onLoginRequired={openLoginRequiredModal}
      >
        <div className={`public-layout ${isHomePage ? 'public-layout--home' : ''}`}>
          <PublicHeader publicSession={publicSession} />
          <main className="public-layout__main">
            <div className="public-layout__content-shell">
              <span aria-hidden="true" className="public-layout__content-orb public-layout__content-orb--warm" />
              <span aria-hidden="true" className="public-layout__content-orb public-layout__content-orb--cool" />
              <div className="public-layout__content">
                <Outlet context={outletContext} />
              </div>
            </div>
          </main>
          <PublicFooter />
          <CustomerCareMiniWidget isCustomer={publicSession.isCustomer} />
          <LoginRequiredModal
            description={loginRequiredModal.description}
            eyebrow={loginRequiredModal.eyebrow}
            isOpen={loginRequiredModal.isOpen}
            title={loginRequiredModal.title}
            onClose={closeLoginRequiredModal}
            onLogin={handleLoginRequiredModalLogin}
          />
        </div>
      </CustomerSurveyProvider>
    </AddToCartToastProvider>
  )
}

export default PublicLayout
