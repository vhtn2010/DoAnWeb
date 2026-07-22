import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { subscribeAuthEvents } from '../services/apiClient.js'
import { getAuthSession } from '../services/authSession.js'
import { getAuthRedirectPath } from '../utils/loginRedirect.js'

const authMeta = {
  '/register': {
    eyebrow: 'Đăng ký',
    title: 'Nét Việt',
    subtitle: 'Bắt đầu hành trình',
    accent: 'Khám phá Việt Nam',
    description:
      'Tạo tài khoản để lưu hành trình yêu thích, theo dõi dịch vụ và sẵn sàng cho những chuyến đi tiếp theo.',
  },
  '/forgot-password': {
    eyebrow: 'Hỗ trợ tài khoản',
    title: 'Nét Việt',
    subtitle: 'Khôi phục truy cập',
    accent: 'Khám phá Việt Nam',
    description:
      'Đặt lại quyền truy cập một cách nhanh chóng để tiếp tục đồng hành cùng những trải nghiệm du lịch đậm bản sắc Việt.',
  },
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    background: 'var(--color-background)',
  },
  panel: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    padding: '40px 20px',
    background: `
      radial-gradient(circle at top right, rgba(244,197,66,0.12), transparent 24%),
      radial-gradient(circle at bottom left, rgba(214,40,40,0.08), transparent 22%),
      linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(253,253,253,1) 100%)
    `,
  },
  card: {
    width: 'min(460px, 100%)',
    borderRadius: '40px',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 28px 60px rgba(20, 15, 14, 0.12)',
    padding: '32px',
    border: '1px solid rgba(214, 40, 40, 0.08)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
  },
  cardLogo: {
    width: 72,
    height: 'auto',
    objectFit: 'contain',
  },
  cardMeta: {
    display: 'grid',
    gap: '4px',
  },
  cardTitle: {
    margin: 0,
    fontWeight: 900,
    color: 'var(--color-text)',
  },
  cardHint: {
    margin: 0,
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
}

function AuthLayout() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [authSession, setAuthSession] = useState(() => getAuthSession())
  const isLoginPage = location.pathname === '/login'
  const isRegisterPage = location.pathname === '/register'
  const isRegisterShellPage = ['/register', '/verify-email'].includes(location.pathname)
  const isForgotPasswordPage = ['/forgot-password', '/reset-password'].includes(location.pathname)

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(() => {
      setAuthSession(getAuthSession())
    })

    return unsubscribe
  }, [])

  if ((isLoginPage || isRegisterPage) && authSession.isAuthenticated) {
    return (
      <Navigate
        replace
        to={getAuthRedirectPath({
          location,
          searchParams,
          user: authSession.user,
        })}
      />
    )
  }

  if (isForgotPasswordPage) {
    return (
      <div className="auth-forgot-shell">
        <section className="auth-forgot-shell__panel">
          <Outlet />
        </section>
      </div>
    )
  }

  if (isRegisterShellPage) {
    const meta = authMeta[location.pathname] ?? authMeta['/register']

    return (
      <div className="auth-register-shell">
        <section className="auth-register-shell__panel">
          <Outlet context={{ meta }} />
        </section>
      </div>
    )
  }

  if (isLoginPage) {
    return (
      <div className="auth-login-shell">
        <section className="auth-login-visual">
          <div aria-hidden="true" className="auth-login-visual__overlay" />
          <div aria-hidden="true" className="auth-login-visual__accent auth-login-visual__accent--top" />
          <div
            aria-hidden="true"
            className="auth-login-visual__accent auth-login-visual__accent--bottom"
          />

          <div className="auth-login-visual__content">
            <div className="auth-login-visual__stack">
              <h1 className="auth-login-visual__headline">
                <span className="auth-login-visual__headline-line auth-login-visual__headline-line--hero">
                  <span>Nét </span>
                  <span className="auth-login-visual__headline-accent">Việt</span>
                </span>
                <span className="auth-login-visual__headline-line auth-login-visual__headline-line--subtitle">
                  Hành trình diệu kỳ
                </span>
                <span className="auth-login-visual__headline-line auth-login-visual__headline-line--accent auth-login-visual__headline-accent">
                  Khám phá Việt Nam
                </span>
              </h1>
              <p className="auth-login-visual__description">
                Cùng Nét Việt Travel chạm tới những vẻ đẹp tiềm ẩn và trải nghiệm văn hoá
                độc đáo khắp dải đất hình chữ S.
              </p>
            </div>
          </div>
        </section>

        <section className="auth-login-panel">
          <div className="auth-login-panel__card">
            <Outlet />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <section style={styles.panel}>
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <img
              alt="Nét Việt Travel"
              src="/assets/template/brand/logo.png"
              style={styles.cardLogo}
            />
            <div style={styles.cardMeta}>
              <p style={styles.cardTitle}>Nét Việt Travel</p>
              <p style={styles.cardHint}>Không gian placeholder theo Figma auth</p>
            </div>
          </div>

          <Outlet />
        </div>
      </section>
    </div>
  )
}

export default AuthLayout
