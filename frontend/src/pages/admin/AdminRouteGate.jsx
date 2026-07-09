import { Navigate, useLocation, useOutletContext } from 'react-router-dom'
import { AdminErrorState } from '../../components/admin/ui/index.js'
import {
  ADMIN_ROUTES,
  canViewAdminRoute,
  getAdminDefaultPath,
} from '../../constants/adminRoutes.js'

function AdminRouteGate({ children, routeId }) {
  const { currentPermissions, currentRole } = useOutletContext()
  const location = useLocation()
  const route = ADMIN_ROUTES[routeId]

  if (!route || !canViewAdminRoute(currentRole, route, currentPermissions)) {
    const fallbackPath = getAdminDefaultPath(currentRole, currentPermissions)

    if (fallbackPath && fallbackPath !== location.pathname) {
      return <Navigate replace to={fallbackPath} />
    }

    return (
      <AdminErrorState
        title="Không đủ quyền truy cập"
        description="Tài khoản hiện tại chưa có permission phù hợp để mở màn hình admin này."
      />
    )
  }

  return children
}

export default AdminRouteGate
