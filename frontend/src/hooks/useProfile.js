import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  PROFILE_ACTIONS,
  PROFILE_HISTORY_FILTERS,
} from '../constants/profile.js'
import { ROLES } from '../constants/roles.js'
import {
  buildProfileActionPayload,
  getCustomerProfile,
} from '../repositories/profileRepository.js'
import { buildProfileViewModel } from '../mappers/profileMappers.js'

function preserveAuthPath(pathname, authState) {
  if (authState !== ROLES.customer) {
    return pathname
  }

  return pathname.includes('?') ? `${pathname}&auth=customer` : `${pathname}?auth=customer`
}

export default function useProfile() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomerPreview = authState === ROLES.customer

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

  function goLogin() {
    navigate('/login')
  }

  function goHome() {
    navigate(preserveAuthPath('/', authState))
  }

  async function handleActionRoute(action, target, fallbackMessage) {
    const response = await buildProfileActionPayload(action, target)
    const nextRoute = response.data?.route

    if (nextRoute) {
      navigate(preserveAuthPath(nextRoute, authState))
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

    setSelectedBookingHistoryFilter((currentFilter) =>
      currentFilter === nextFilter ? null : nextFilter,
    )
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
      openBookingHistoryItem,
      openFavoriteDestination,
      openProfileShortcut,
      openUpcomingTripPrimary,
      openUpcomingTripSecondary,
      preserveAuthQuery: (pathname) => preserveAuthPath(pathname, authState),
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
