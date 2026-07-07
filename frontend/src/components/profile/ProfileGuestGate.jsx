function ProfileGuestGate({ message, onGoHome, onGoLogin }) {
  return (
    <section className="profile-guest-gate">
      <div className="profile-guest-gate__card">
        <span className="profile-guest-gate__eyebrow">Tài khoản cá nhân</span>
        <h1>Vui lòng đăng nhập để xem tài khoản cá nhân</h1>
        <p>{message}</p>

        <div className="profile-guest-gate__actions">
          <button className="profile-guest-gate__button" type="button" onClick={onGoLogin}>
            Đăng nhập
          </button>
          <button
            className="profile-guest-gate__button profile-guest-gate__button--secondary"
            type="button"
            onClick={onGoHome}
          >
            Quay về trang chủ
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProfileGuestGate
