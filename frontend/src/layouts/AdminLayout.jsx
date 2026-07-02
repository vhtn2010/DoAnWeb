import { Outlet, useSearchParams } from 'react-router-dom'
import AdminSidebar from '../components/layout/AdminSidebar.jsx'
import AdminTopbar from '../components/layout/AdminTopbar.jsx'

const allowedAdminRoles = ['staff', 'admin', 'system_admin']

function normalizeAdminPreviewRole(value) {
  return allowedAdminRoles.includes(value) ? value : 'system_admin'
}

function AdminLayout() {
  const [searchParams] = useSearchParams()
  const currentRole = normalizeAdminPreviewRole(searchParams.get('role'))

  return (
    <div className="admin-layout">
      <AdminSidebar currentRole={currentRole} />

      <div className="admin-layout__main">
        <AdminTopbar currentRole={currentRole} />

        <div className="admin-layout__body">
          <section className="admin-layout__surface">
            <Outlet context={{ currentRole }} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
