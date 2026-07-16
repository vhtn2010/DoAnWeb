import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useFavorites from '../../hooks/useFavorites.js'
import { getActiveCart } from '../../repositories/cartRepository.js'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
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
    setIsMobileMenuOpen(false)
  }, [location.pathname])

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

  useEffect(() => {
    let isMounted = true

    if (!isCustomer) {
      setCartItemCount(0)
      return () => {
        isMounted = false
      }
    }

    async function loadCartItemCount() {
      try {
        const response = await getActiveCart({
          authState: publicSession?.authState,
        })

        if (!isMounted) {
          return
        }

        setCartItemCount(Array.isArray(response.data?.cart_items) ? response.data.cart_items.length : 0)
      } catch {
        if (isMounted) {
          setCartItemCount(0)
        }
      }
    }

    loadCartItemCount()

    return () => {
      isMounted = false
    }
  }, [isCustomer, location.pathname, publicSession?.authState, publicSession?.currentUser?.id])

  return (
    <header className="public-header">
      <div className={`public-header__shell${isMobileMenuOpen ? ' public-header__shell--menu-open' : ''}`}>
        <PublicHeaderBrand to={buildHeaderPath('/')} />
        <button
          aria-controls="public-header-menu"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          className="public-header__menu-toggle"
          type="button"
          onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <PublicHeaderNav
          bookingLinkClassName={bookingLinkClassName}
          buildHeaderPath={buildHeaderPath}
          id="public-header-menu"
          isFlightPreview={isFlightPreview}
          isTicketActive={isTicketActive}
          isTrainPreview={isTrainPreview}
        />
        <PublicHeaderActions
          customerCartPath={customerCartPath}
          cartItemCount={cartItemCount}
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
          isProfileHydrating={Boolean(publicSession?.isProfileHydrating)}
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
