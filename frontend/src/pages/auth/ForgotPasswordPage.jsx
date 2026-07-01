import { Link } from 'react-router-dom'

const styles = {
  section: {
    display: 'grid',
    gap: '24px',
  },
  header: {
    display: 'grid',
    gap: '10px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    lineHeight: 1.15,
    fontWeight: 900,
    color: 'var(--color-text)',
  },
  description: {
    margin: 0,
    color: 'var(--color-text-muted)',
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  fields: {
    display: 'grid',
    gap: '16px',
  },
  field: {
    display: 'grid',
    gap: '8px',
  },
  label: {
    color: 'var(--color-text)',
    fontWeight: 800,
    fontSize: '0.92rem',
  },
  input: {
    minHeight: 56,
    display: 'flex',
    alignItems: 'center',
    padding: '0 18px',
    borderRadius: '18px',
    border: '1px solid rgba(214, 40, 40, 0.12)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-muted)',
    boxShadow: 'var(--shadow-sm)',
  },
  button: {
    minHeight: 56,
    border: 'none',
    borderRadius: '18px',
    background: 'var(--color-brand-primary)',
    color: 'var(--color-surface)',
    fontWeight: 900,
    fontSize: '1rem',
    boxShadow: 'var(--shadow-md)',
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
  link: {
    color: 'var(--color-brand-primary)',
    fontWeight: 800,
  },
}

function ForgotPasswordPage() {
  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <h1 style={styles.title}>Quên mật khẩu</h1>
        <p style={styles.description}>
          Placeholder UI cho luồng khôi phục mật khẩu. Chúng ta sẽ nối API sau.
        </p>
      </div>

      <div style={styles.fields}>
        <div style={styles.field}>
          <span style={styles.label}>Địa chỉ Email</span>
          <div style={styles.input}>email@netviet.travel</div>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Mã xác nhận</span>
          <div style={styles.input}>123456</div>
        </div>

        <button style={styles.button} type="button">
          Gửi yêu cầu đặt lại
        </button>
      </div>

      <div style={styles.footer}>
        <span>Đã nhớ mật khẩu?</span>
        <Link style={styles.link} to="/login">
          Quay lại đăng nhập
        </Link>
      </div>
    </section>
  )
}

export default ForgotPasswordPage
