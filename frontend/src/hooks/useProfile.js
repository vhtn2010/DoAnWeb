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
          setBookingHistory([])
          setTravelUtilities([])
          setSupportLinks([])
          setError(response.message ?? 'Không thể tải thông tin tài khoản lúc này.')
          return
        }

        setProfile(response.data.profile ?? null)
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
        bookingHistory,
        selectedBookingHistoryFilter,
        travelUtilities,
        supportLinks,
      }),
    [
      bookingHistory,
      profile,
      selectedBookingHistoryFilter,
      supportLinks,
      travelUtilities,
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

  return {
    actions: {
      goHome,
      goLogin,
      openBookingHistoryItem,
      openProfileShortcut,
      preserveAuthQuery: (pathname) => preserveAuthPath(pathname, authState),
      retry,
      selectBookingHistoryFilter,
    },
    bookingHistory,
    error,
    feedback,
    isCustomerPreview,
    loading,
    profile,
    supportLinks,
    travelUtilities,
    viewModel,
  }
}
