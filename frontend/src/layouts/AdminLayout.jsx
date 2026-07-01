import { Outlet } from 'react-router-dom'
import AdminSidebar from '../components/layout/AdminSidebar.jsx'
import AdminTopbar from '../components/layout/AdminTopbar.jsx'

function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-layout__main">
        <AdminTopbar />

        <div className="admin-layout__body">
          <section className="admin-layout__surface">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
