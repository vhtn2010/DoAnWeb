import { Outlet, useSearchParams } from 'react-router-dom'
import AdminSidebar from '../components/layout/AdminSidebar.jsx'
import AdminTopbar from '../components/layout/AdminTopbar.jsx'
import { normalizeAdminRole } from '../utils/rolePermissions.js'

function AdminLayout() {
  const [searchParams] = useSearchParams()
  const currentRole = normalizeAdminRole(searchParams.get('role'))

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
