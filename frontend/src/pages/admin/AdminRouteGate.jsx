import { Navigate, useOutletContext } from 'react-router-dom'
import {
  ADMIN_ROUTES,
  canViewAdminRoute,
  getAdminDefaultPath,
} from '../../constants/adminRoutes.js'

function AdminRouteGate({ children, routeId }) {
  const { currentRole } = useOutletContext()
  const route = ADMIN_ROUTES[routeId]

  if (!route || !canViewAdminRoute(currentRole, route)) {
    return <Navigate replace to={getAdminDefaultPath(currentRole)} />
  }

  return children
}

export default AdminRouteGate
