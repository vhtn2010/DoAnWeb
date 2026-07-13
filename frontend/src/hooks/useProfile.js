import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PROFILE_ACTIONS,
  PROFILE_HISTORY_FILTERS,
} from '../constants/profile.js'
import usePublicSession from './usePublicSession.js'
import {
  buildProfileActionPayload,
  getCustomerProfile,
} from '../repositories/profileRepository.js'
import { logout } from '../repositories/authRepository.js'
import { buildProfileViewModel } from '../mappers/profileMappers.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

export default function useProfile() {
  const navigate = useNavigate()
  const { authState, isCustomer, isCustomerPreview } = usePublicSession()

  const [profile, setProfile] = useState(null)
  const [favoriteDestinations, setFavoriteDestinations] = useState([])
  const [upcomingTrip, setUpcomingTrip] = useState(null)
  const [bookingHistory, setBookingHistory] = useState([])
  const [travelUtilities, setTravelUtilities] = useState([])
  const [supportLinks, setSupportLinks] = useState([])
  const [selectedBookingHistoryFilter, setSelectedBookingHistoryFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadProfile() {
      setLoading(true)
      setError('')
      setFeedback('')

      try {
        const response = await getCustomerProfile({ authState })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          setProfile(null)
          setFavoriteDestinations([])
          setUpcomingTrip(null)
          setBookingHistory([])
          setTravelUtilities([])
          setSupportLinks([])
          setError(response.message ?? 'Không thể tải thông tin tài khoản lúc này.')
          return
        }

        setProfile(response.data.profile ?? null)
        setFavoriteDestinations(
          Array.isArray(response.data.favorite_destinations)
            ? response.data.favorite_destinations
            : [],
        )
        setUpcomingTrip(response.data.upcoming_trip ?? null)
        setBookingHistory(
          Array.isArray(response.data.booking_history) ? response.data.booking_history : [],
        )
        setTravelUtilities(
          Array.isArray(response.data.travel_utilities) ? response.data.travel_utilities : [],
        )
        setSupportLinks(
          Array.isArray(response.data.support_links) ? response.data.support_links : [],
        )
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setProfile(null)
        setFavoriteDestinations([])
        setUpcomingTrip(null)
        setBookingHistory([])
        setTravelUtilities([])
        setSupportLinks([])
        setError(loadError?.message ?? 'Không thể tải thông tin tài khoản lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  }, [authState, reloadToken])

  const viewModel = useMemo(
    () =>
      buildProfileViewModel({
        profile,
        favoriteDestinations,
        upcomingTrip,
        bookingHistory,
        selectedBookingHistoryFilter,
        travelUtilities,
        supportLinks,
      }),
    [
      bookingHistory,
      favoriteDestinations,
      profile,
      selectedBookingHistoryFilter,
      supportLinks,
      travelUtilities,
      upcomingTrip,
    ],
  )

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function applyProfileUpdate(nextProfile) {
    if (!nextProfile || typeof nextProfile !== 'object') {
      retry()
      return
    }

    setProfile((currentProfile) => ({
      ...(currentProfile ?? {}),
      ...nextProfile,
    }))
  }

  function goLogin() {
    navigate('/login')
  }

  function goHome() {
    navigate(buildPublicAuthPath('/', isCustomer))
  }

  function goProfile() {
    navigate(buildPublicAuthPath('/profile', isCustomer))
  }

  function openBookingHistoryPage() {
    navigate(buildPublicAuthPath('/profile/orders', isCustomer))
  }

  async function logoutAction() {
    try {
      await logout()
    } catch {
      // The auth adapter still clears the local session if the request fails.
    } finally {
      window.location.assign('/')
    }
  }

  async function handleActionRoute(action, target, fallbackMessage) {
    const response = await buildProfileActionPayload(action, target)
    const nextRoute = response.data?.route

    if (nextRoute) {
      navigate(buildPublicAuthPath(nextRoute, isCustomer), {
        state: response.data?.route_state ?? undefined,
      })
      return
    }

    setFeedback(response.message ?? fallbackMessage)
  }

  async function openBookingHistoryItem(item) {
    if (!item) {
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.booking_history,
      item,
      'Chi tiết lịch sử đặt chỗ sẽ được bổ sung ở phiên bản tích hợp.',
    )
  }

  function selectBookingHistoryFilter(filterId) {
    const nextFilter = Object.values(PROFILE_HISTORY_FILTERS).includes(filterId)
      ? filterId
      : null

    setSelectedBookingHistoryFilter(nextFilter)
  }

  async function openProfileShortcut(item) {
    if (!item) {
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.quick_link,
      item,
      'Nội dung này sẽ được hoàn thiện ở phiên bản tích hợp.',
    )
  }

  async function openFavoriteDestination(destination) {
    if (!destination) {
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.favorite_destination,
      destination,
      'Điểm đến yêu thích này sẽ được mở ở phiên bản tích hợp.',
    )
  }

  async function openUpcomingTripPrimary(trip = upcomingTrip) {
    if (!trip) {
      setSelectedBookingHistoryFilter(PROFILE_HISTORY_FILTERS.upcoming)
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.upcoming_trip_primary,
      trip,
      'Lịch trình gần nhất sẽ được mở đầy đủ ở phiên bản tích hợp.',
    )
  }

  async function openUpcomingTripSecondary(trip = upcomingTrip) {
    if (!trip) {
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.upcoming_trip_secondary,
      trip,
      'Nội dung liên quan cho chuyến đi này sẽ được hoàn thiện ở phiên bản tích hợp.',
    )
  }

  return {
    actions: {
      goHome,
      goLogin,
      goProfile,
      logout: logoutAction,
      applyProfileUpdate,
      openBookingHistoryPage,
      openBookingHistoryItem,
      openFavoriteDestination,
      openProfileShortcut,
      openUpcomingTripPrimary,
      openUpcomingTripSecondary,
      preserveAuthQuery: (pathname) => buildPublicAuthPath(pathname, isCustomer),
      retry,
      selectBookingHistoryFilter,
    },
    bookingHistory,
    error,
    favoriteDestinations,
    feedback,
    isCustomerPreview,
    loading,
    profile,
    supportLinks,
    travelUtilities,
    upcomingTrip,
    viewModel,
  }
}
