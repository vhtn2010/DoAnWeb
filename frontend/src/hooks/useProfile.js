import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PROFILE_ACTIONS } from '../constants/profile.js'
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
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setProfile(null)
        setFavoriteDestinations([])
        setUpcomingTrip(null)
        setBookingHistory([])
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
      }),
    [bookingHistory, favoriteDestinations, profile, upcomingTrip],
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

  async function openUpcomingTrip(actionType = 'primary') {
    if (!upcomingTrip) {
      return
    }

    if (actionType === 'secondary') {
      await handleActionRoute(
        PROFILE_ACTIONS.upcoming_trip_secondary,
        {
          ...upcomingTrip,
          detail_path: upcomingTrip.secondary_path ?? '/flights',
        },
        'Thông tin vé máy bay sẽ được hoàn thiện ở phiên bản tích hợp.',
      )
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.upcoming_trip_primary,
      upcomingTrip,
      'Chi tiết chuyến đi sẽ được bổ sung ở phiên bản tích hợp.',
    )
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

  async function openFavoriteDestination(destination) {
    if (!destination) {
      return
    }

    await handleActionRoute(
      PROFILE_ACTIONS.favorite_destination,
      destination,
      'Điểm đến yêu thích sẽ được liên kết chi tiết ở phiên bản tích hợp.',
    )
  }

  return {
    actions: {
      goHome,
      goLogin,
      openBookingHistoryItem,
      openFavoriteDestination,
      openUpcomingTrip,
      preserveAuthQuery: (pathname) => preserveAuthPath(pathname, authState),
      retry,
    },
    bookingHistory,
    error,
    favoriteDestinations,
    feedback,
    isCustomerPreview,
    loading,
    profile,
    upcomingTrip,
    viewModel,
  }
}
