import { Outlet, useLocation } from 'react-router-dom'

const authMeta = {
  '/login': {
    eyebrow: 'Đăng nhập',
    title: 'Nét Việt',
    subtitle: 'Hành trình diệu kỳ',
    accent: 'Khám phá Việt Nam',
    description:
      'Cùng Nét Việt Travel chạm tới những vẻ đẹp tiềm ẩn và trải nghiệm văn hoá độc đáo khắp dải đất hình chữ S.',
  },
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
  visual: {
    position: 'relative',
    minHeight: '420px',
    overflow: 'hidden',
    background:
      'linear-gradient(180deg, rgba(5,5,5,0.92) 0%, rgba(28,22,20,0.86) 100%)',
    color: 'var(--color-surface)',
  },
  visualOverlay: {
    position: 'absolute',
    inset: 0,
    background: `
      radial-gradient(circle at 18% 22%, rgba(244,197,66,0.18), transparent 18%),
      radial-gradient(circle at 82% 14%, rgba(214,40,40,0.3), transparent 16%),
      radial-gradient(circle at 72% 78%, rgba(244,197,66,0.14), transparent 22%)
    `,
    opacity: 0.95,
  },
  accentBlockPrimary: {
    position: 'absolute',
    top: 48,
    right: 48,
    width: 42,
    height: 40,
    borderRadius: 14,
    background: 'var(--color-accent)',
  },
  accentBlockSecondary: {
    position: 'absolute',
    left: 48,
    bottom: 164,
    width: 46,
    height: 50,
    borderRadius: 16,
    background: 'var(--color-brand-primary)',
  },
  visualContent: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '48px',
  },
  visualStack: {
    width: 'min(512px, 100%)',
    display: 'grid',
    gap: '10px',
  },
  visualBrand: {
    width: 'min(240px, 56%)',
    marginBottom: '32px',
  },
  eyebrow: {
    margin: 0,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(2.6rem, 7vw, 4rem)',
    lineHeight: 1,
    fontWeight: 900,
    color: 'var(--color-surface)',
  },
  subtitle: {
    margin: 0,
    fontSize: 'clamp(2.1rem, 6vw, 3.25rem)',
    lineHeight: 1.05,
    fontWeight: 800,
    color: 'var(--color-surface)',
  },
  accent: {
    margin: 0,
    fontFamily: '"Be Vietnam", var(--font-body)',
    fontSize: 'clamp(2.4rem, 7vw, 4rem)',
    lineHeight: 1.05,
    color: 'var(--color-accent)',
  },
  description: {
    margin: '10px 0 0',
    maxWidth: 480,
    fontSize: '1.05rem',
    lineHeight: 1.7,
    color: 'rgba(255,255,255,0.82)',
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
  const meta = authMeta[location.pathname] ?? authMeta['/login']

  return (
    <div style={styles.page}>
      <section style={styles.visual}>
        <div aria-hidden="true" style={styles.visualOverlay} />
        <div aria-hidden="true" style={styles.accentBlockPrimary} />
        <div aria-hidden="true" style={styles.accentBlockSecondary} />

        <div style={styles.visualContent}>
          <div style={styles.visualStack}>
            <img
              alt="Nét Việt Travel"
              src="/assets/template/brand/logo.png"
              style={styles.visualBrand}
            />
            <p style={styles.eyebrow}>{meta.eyebrow}</p>
            <p style={styles.title}>{meta.title}</p>
            <p style={styles.subtitle}>{meta.subtitle}</p>
            <p style={styles.accent}>{meta.accent}</p>
            <p style={styles.description}>{meta.description}</p>
          </div>
        </div>
      </section>

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
