import { useLocation } from 'react-router-dom'
import './adminLayout.css'

const routeMeta = {
  '/admin': {
    title: 'Tổng quan quản trị',
    subtitle: 'Theo dõi nhanh tình trạng vận hành và những đầu mục ưu tiên trong hệ thống.',
  },
  '/admin/services': {
    title: 'Quản lý dịch vụ',
    subtitle: 'Quản lý các tour, khách sạn và dịch vụ vận chuyển trong hệ thống.',
  },
}

function AdminTopbar() {
  const location = useLocation()
  const meta = routeMeta[location.pathname] ?? routeMeta['/admin']

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__intro">
        <h1 className="admin-topbar__title">{meta.title}</h1>
        <p className="admin-topbar__subtitle">{meta.subtitle}</p>
      </div>

      <div className="admin-topbar__actions">
        <label className="admin-topbar__search">
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <circle cx="9" cy="9" r="5.5" stroke="#6b7280" strokeWidth="1.7" />
            <path
              d="m13.5 13.5 3 3"
              stroke="#6b7280"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
          <input aria-label="Tìm kiếm quản trị" placeholder="Tìm kiếm ....." type="search" />
        </label>

        <button aria-label="Thông báo" className="admin-topbar__icon-button" type="button">
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M10 3.5a3.5 3.5 0 0 0-3.5 3.5v1.2c0 .84-.24 1.67-.7 2.38L4.8 12.2c-.33.5.03 1.18.63 1.18h9.14c.6 0 .96-.68.63-1.18l-1-1.62a4.57 4.57 0 0 1-.7-2.38V7A3.5 3.5 0 0 0 10 3.5Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
            <path
              d="M8.5 15.5a1.77 1.77 0 0 0 3 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </button>

        <button aria-label="Cài đặt" className="admin-topbar__icon-button" type="button">
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M10 7.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="m16.2 10-.98.57a5.96 5.96 0 0 1-.24.58l.28 1.1a.8.8 0 0 1-.22.79l-.8.8a.8.8 0 0 1-.79.22l-1.1-.28c-.18.09-.38.17-.58.24l-.57.98a.8.8 0 0 1-.69.4H9.39a.8.8 0 0 1-.69-.4l-.57-.98a5.96 5.96 0 0 1-.58-.24l-1.1.28a.8.8 0 0 1-.79-.22l-.8-.8a.8.8 0 0 1-.22-.79l.28-1.1c-.09-.18-.17-.38-.24-.58L3.8 10a.8.8 0 0 1 0-.78l.98-.57c.07-.2.15-.4.24-.58l-.28-1.1a.8.8 0 0 1 .22-.79l.8-.8a.8.8 0 0 1 .79-.22l1.1.28c.18-.09.38-.17.58-.24l.57-.98a.8.8 0 0 1 .69-.4h1.13a.8.8 0 0 1 .69.4l.57.98c.2.07.4.15.58.24l1.1-.28a.8.8 0 0 1 .79.22l.8.8a.8.8 0 0 1 .22.79l-.28 1.1c.09.18.17.38.24.58l.98.57a.8.8 0 0 1 0 .78Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </svg>
        </button>

        <div className="admin-topbar__profile">
          <span aria-hidden="true" className="admin-topbar__profile-badge">
            <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
              <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M4.5 16a5.5 5.5 0 0 1 11 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.7"
              />
            </svg>
          </span>

          <div className="admin-topbar__profile-copy">
            <span className="admin-topbar__profile-role">Admin</span>
            <span className="admin-topbar__profile-name">Nguyễn Văn A</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminTopbar
