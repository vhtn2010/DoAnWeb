import { useState } from 'react'

const SETTINGS_TABS = Object.freeze([
  'Thiết lập chung',
  'Cấu hình Website',
  'Cấu hình Email',
  'Lịch Backup',
  'Quản lý API',
  'Bảo mật',
])

function SettingIcon({ type }) {
  if (type === 'region') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M12 21s7-5.2 7-11.2A7 7 0 0 0 5 9.8C5 15.8 12 21 12 21Z" />
        <path d="M12 12.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4.5 20V8.8L12 4l7.5 4.8V20" />
      <path d="M8.2 20v-7.3h7.6V20" />
      <path d="M9.1 10h.01M14.9 10h.01" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0])
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [feedback, setFeedback] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback('Cấu hình hệ thống đã được cập nhật trong mock frontend.')
  }

  function handleMaintenanceToggle() {
    setMaintenanceEnabled((currentValue) => !currentValue)
    setFeedback((currentValue) => (
      currentValue === 'Chế độ bảo trì đã được thay đổi trong mock frontend.'
        ? ''
        : 'Chế độ bảo trì đã được thay đổi trong mock frontend.'
    ))
  }

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-page__header">
        <h1>Cấu hình hệ thống</h1>
        <p>Quản lý các thiết lập và cấu hình hệ thống Nét Việt Travel</p>
      </header>

      <nav className="admin-settings-page__tabs" aria-label="Nhóm cấu hình hệ thống">
        {SETTINGS_TABS.map((tab) => (
          <button
            aria-current={activeTab === tab ? 'page' : undefined}
            className={activeTab === tab ? 'is-active' : ''}
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <form className="admin-settings-page__workspace" onSubmit={handleSubmit}>
        <div className="admin-settings-page__main-column">
          <section className="admin-settings-page__panel admin-settings-page__panel--company" aria-labelledby="settings-company-title">
            <div className="admin-settings-page__section-title">
              <span className="admin-settings-page__section-icon">
                <SettingIcon />
              </span>
              <h2 id="settings-company-title">Thông tin công ty</h2>
            </div>

            <div className="admin-settings-page__form-grid">
              <label className="admin-settings-page__field" htmlFor="settings-company-name">
                <span>Tên công ty</span>
                <input id="settings-company-name" defaultValue="Nét Việt Travel" />
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-tax-code">
                <span>Mã số thuế</span>
                <input id="settings-tax-code" defaultValue="0101234567" />
              </label>
              <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-address">
                <span>Địa chỉ trụ sở</span>
                <input id="settings-address" defaultValue="Nét Việt, Quận 1, TP. Hồ Chí Minh" />
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-email">
                <span>Email liên hệ</span>
                <input id="settings-email" defaultValue="hellonetviet@gmail.com" type="email" />
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-hotline">
                <span>Hotline</span>
                <input id="settings-hotline" defaultValue="1900 888 999" />
              </label>
            </div>
          </section>

          <section className="admin-settings-page__panel admin-settings-page__panel--region" aria-labelledby="settings-region-title">
            <div className="admin-settings-page__section-title">
              <span className="admin-settings-page__section-icon">
                <SettingIcon type="region" />
              </span>
              <h2 id="settings-region-title">Cấu hình khu vực</h2>
            </div>

            <div className="admin-settings-page__form-grid">
              <label className="admin-settings-page__field" htmlFor="settings-language">
                <span>Ngôn ngữ mặc định</span>
                <span className="admin-settings-page__select">
                  <select id="settings-language" defaultValue="vi-VN">
                    <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                    <option value="en-US">English (en-US)</option>
                  </select>
                  <ChevronIcon />
                </span>
              </label>
              <label className="admin-settings-page__field admin-settings-page__field--tall" htmlFor="settings-timezone">
                <span>Múi giờ</span>
                <span className="admin-settings-page__select">
                  <select id="settings-timezone" defaultValue="asia-bangkok">
                    <option value="asia-bangkok">(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                    <option value="utc">(GMT+00:00) Coordinated Universal Time</option>
                  </select>
                  <ChevronIcon />
                </span>
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-currency">
                <span>Đồng tiền cơ sở</span>
                <span className="admin-settings-page__select">
                  <select id="settings-currency" defaultValue="vnd">
                    <option value="vnd">VND - Việt Nam Đồng</option>
                    <option value="usd">USD - US Dollar</option>
                  </select>
                  <ChevronIcon />
                </span>
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-date-format">
                <span>Định dạng ngày</span>
                <span className="admin-settings-page__select">
                  <select id="settings-date-format" defaultValue="dd-mm-yyyy">
                    <option value="dd-mm-yyyy">DD/MM/YYYY</option>
                    <option value="yyyy-mm-dd">YYYY/MM/DD</option>
                  </select>
                  <ChevronIcon />
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="admin-settings-page__panel admin-settings-page__status-panel" aria-labelledby="settings-status-title">
          <h2 id="settings-status-title">Trạng thái hệ thống</h2>
          <div className="admin-settings-page__status-list">
            <div className="admin-settings-page__status-item">
              <span>Phiên bản</span>
              <strong className="admin-settings-page__version">v2.4.1</strong>
            </div>
            <div className="admin-settings-page__status-item">
              <span>Bảo trì</span>
              <button
                aria-checked={maintenanceEnabled}
                aria-label="Bật tắt chế độ bảo trì"
                className="admin-settings-page__switch"
                role="switch"
                type="button"
                onClick={handleMaintenanceToggle}
              >
                <span />
              </button>
            </div>
            <div className="admin-settings-page__status-item">
              <span>Log lỗi API</span>
            </div>
          </div>

          <button className="admin-settings-page__save" type="submit">
            Lưu cấu hình
          </button>
        </aside>

        {feedback ? <p className="admin-settings-page__feedback" role="status">{feedback}</p> : null}
      </form>
    </main>
  )
}

export default AdminSettingsPage
