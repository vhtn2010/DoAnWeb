import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useFavorites from '../../hooks/useFavorites.js'
import { getUnreadNotificationCount } from '../../repositories/notificationRepository.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'
import {
  PublicHeaderActions,
  PublicHeaderBrand,
  PublicHeaderNav,
} from '../public/layout/index.js'

function PublicHeader({ publicSession }) {
  const location = useLocation()
  const isCustomer = Boolean(publicSession?.isCustomer)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const { favoriteCount } = useFavorites({
    currentUser: publicSession?.currentUser ?? null,
  })
  const buildHeaderPath = (path) => buildPublicAuthPath(path, isCustomer)

  const customerCartPath = buildHeaderPath('/cart')
  const favoritePath = buildHeaderPath('/favorites')
  const notificationPath = buildHeaderPath('/notifications')
  const customerProfilePath = buildHeaderPath('/profile')
  const isCartPreview = location.pathname === '/cart'
  const isCheckoutPreview = location.pathname === '/checkout'
  const isFavoritePreview = location.pathname === '/favorites'
  const isHotelPreview = location.pathname.startsWith('/hotels')
  const isNotificationPreview = location.pathname === '/notifications'
  const isProfilePreview = location.pathname === '/profile'
  const isTicketActive =
    location.pathname.startsWith('/flights') || location.pathname.startsWith('/trains')
  const isFlightPreview = location.pathname.startsWith('/flights')
  const isTrainPreview = location.pathname.startsWith('/trains')
  const bookingLinkClassName = `public-header__link${
    isTicketActive ? ' public-header__link--active' : ''
  }`

  useEffect(() => {
    let isMounted = true

    if (!isCustomer) {
      setUnreadNotificationCount(0)
      return () => {
        isMounted = false
      }
    }

    async function loadUnreadNotificationCount() {
      try {
        const response = await getUnreadNotificationCount()

        if (!isMounted) {
          return
        }

        setUnreadNotificationCount(Number(response.data?.unread_count ?? 0))
      } catch {
        if (isMounted) {
          setUnreadNotificationCount(0)
        }
      }
    }

    loadUnreadNotificationCount()

    return () => {
      isMounted = false
    }
  }, [isCustomer, location.pathname, publicSession?.currentUser?.id])

  return (
    <header className="public-header">
      <div className="public-header__shell">
        <PublicHeaderBrand to={buildHeaderPath('/')} />
        <PublicHeaderNav
          bookingLinkClassName={bookingLinkClassName}
          buildHeaderPath={buildHeaderPath}
          isFlightPreview={isFlightPreview}
          isTicketActive={isTicketActive}
          isTrainPreview={isTrainPreview}
        />
        <PublicHeaderActions
          customerCartPath={customerCartPath}
          currentUser={publicSession?.currentUser ?? null}
          customerProfilePath={customerProfilePath}
          favoriteCount={favoriteCount}
          favoritePath={favoritePath}
          isCartPreview={isCartPreview}
          isCheckoutPreview={isCheckoutPreview}
          isCustomer={isCustomer}
          isFavoritePreview={isFavoritePreview}
          isHotelPreview={isHotelPreview}
          isNotificationPreview={isNotificationPreview}
          isProfilePreview={isProfilePreview}
          isTicketActive={isTicketActive}
          notificationCount={unreadNotificationCount}
          notificationPath={notificationPath}
        />
      </div>
    </header>
  )
}

export default PublicHeader
