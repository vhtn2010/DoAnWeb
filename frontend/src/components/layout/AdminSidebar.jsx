import { NavLink } from 'react-router-dom'
import './adminLayout.css'

function SidebarIcon({ children }) {
  return (
    <span aria-hidden="true" className="admin-sidebar__icon">
      {children}
    </span>
  )
}

const menuSections = [
  {
    heading: 'Chức năng',
    items: [
      {
        label: 'Báo cáo Doanh thu',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M4 16V9m6 7V4m6 12v-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Quản lý Đơn hàng',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M5 5h10l-1 10H6L5 5Zm2-2h6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Quản lý Dịch vụ',
        to: '/admin/services',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M4 5.5h12M4 10h12M4 14.5h7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
            <circle cx="14.5" cy="14.5" fill="currentColor" r="1.5" />
          </svg>
        ),
      },
      {
        label: 'Lịch sử Giao dịch',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M10 4.5V10l3 1.8M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Yêu cầu Hoàn tiền',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M6 6h8m-8 4h5m-4 6h6a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="m10 10 2 2 4-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Quản lý Khuyến mãi',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="m4 10 6-6 2.5 2.5L6.5 12.5 4 10Zm7.5-3.5 2-2a2.12 2.12 0 1 1 3 3l-2 2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M8 12 4.5 15.5A1.77 1.77 0 0 0 7 18l3.5-3.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Quản lý Người dùng',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="14" cy="8" r="2" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M3.5 15a3.5 3.5 0 0 1 7 0m1.5-.5c.33-1.28 1.35-2.3 2.63-2.63"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Phân quyền truy cập',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M3.5 15a3.5 3.5 0 0 1 7 0M14.5 6.5v5m-2.5-2.5h5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Quản lý hạ tầng',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M4 15.5h12M6 15.5V9.8a1 1 0 0 1 .3-.7l3-2.8a1 1 0 0 1 1.4 0l3 2.8a1 1 0 0 1 .3.7v5.7M8 15.5v-3h4v3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Cấu hình hệ thống',
        href: '#',
        icon: (
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
        ),
      },
      {
        label: 'Phê duyệt Dịch vụ',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M6 4.5h8A1.5 1.5 0 0 1 15.5 6v8A1.5 1.5 0 0 1 14 15.5H6A1.5 1.5 0 0 1 4.5 14V6A1.5 1.5 0 0 1 6 4.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m7.5 10 1.6 1.6 3.4-3.7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        label: 'Hỗ trợ khách hàng',
        href: '#',
        icon: (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M6 8.5a4 4 0 1 1 8 0c0 1.8-.93 2.68-2.02 3.35-.95.58-1.48 1.02-1.48 2.15"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
            <circle cx="10" cy="16" fill="currentColor" r="1.2" />
          </svg>
        ),
      },
    ],
  },
]

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <img
          alt="Nét Việt Admin"
          className="admin-sidebar__logo"
          src="/assets/template/brand/admin-logo.png"
        />
        <p className="admin-sidebar__system">Hệ thống quản lý admin</p>
      </div>

      <NavLink
        className={({ isActive }) =>
          `admin-sidebar__item${isActive ? ' admin-sidebar__item--active' : ''}`
        }
        end
        to="/admin"
      >
        <SidebarIcon>
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
            <path
              d="M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3.5v-4.5h-5V18H4a1 1 0 0 1-1-1v-6.5Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </SidebarIcon>
        <span>Tổng quan</span>
      </NavLink>

      {menuSections.map((section) => (
        <section className="admin-sidebar__section" key={section.heading}>
          <p className="admin-sidebar__heading">{section.heading}</p>
          <nav className="admin-sidebar__nav">
            {section.items.map((item) => {
              if (item.to) {
                return (
                  <NavLink
                    className={({ isActive }) =>
                      `admin-sidebar__item${isActive ? ' admin-sidebar__item--active' : ''}`
                    }
                    end={item.to === '/admin'}
                    key={item.label}
                    to={item.to}
                  >
                    <SidebarIcon>{item.icon}</SidebarIcon>
                    <span>{item.label}</span>
                  </NavLink>
                )
              }

              return (
                <a
                  className="admin-sidebar__item"
                  href={item.href}
                  key={item.label}
                  onClick={(event) => event.preventDefault()}
                >
                  <SidebarIcon>{item.icon}</SidebarIcon>
                  <span>{item.label}</span>
                </a>
              )
            })}
          </nav>
        </section>
      ))}

      <div className="admin-sidebar__spacer" />

      <div className="admin-sidebar__account">
        <div className="admin-sidebar__account-row admin-sidebar__account-row--neutral">
          <SidebarIcon>
            <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
              <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M4.5 16a5.5 5.5 0 0 1 11 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </SidebarIcon>
          <span>Hồ sơ</span>
        </div>
        <div className="admin-sidebar__account-row admin-sidebar__account-row--danger">
          <SidebarIcon>
            <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
              <path
                d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v7A1.5 1.5 0 0 0 5.5 15H8m3-3 3-2-3-2m3 2H8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </SidebarIcon>
          <span>Đăng xuất</span>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar
