import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HOME_FILTER_GROUPS,
  HOME_SEARCH_FIELD_OPTIONS,
  HOME_SORT_OPTIONS,
  HOME_WEEKDAY_LABELS,
} from '../constants/homeFigma.js'
import usePublicSession from './usePublicSession.js'
import {
  addMonths,
  compareDates,
  createHomePageViewState,
  formatCompactDateRangeDisplay,
  formatDateDisplay,
  formatMonthLabel,
  getMonthDays,
  isSameDay,
} from '../mappers/homeFigmaMappers.js'
import {
  buildHomeSearchParams,
  getHomePageData,
  getHomePageFallbackData,
} from '../repositories/homeRepository.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import {
  buildPublicAuthPath,
  getPublicAuthQueryValue,
} from '../utils/publicNavigation.js'

export default function useHomePage() {
  const navigate = useNavigate()
  const { authState, isCustomer } = usePublicSession()
  const searchCardRef = useRef(null)
  const fallbackHomeState = createHomePageViewState(getHomePageFallbackData().data)

  const [homeData, setHomeData] = useState(fallbackHomeState)
  const [searchState, setSearchState] = useState(fallbackHomeState.searchDefaults)
  const [calendarSelection, setCalendarSelection] = useState({
    startDate: fallbackHomeState.searchDefaults.startDate,
    endDate: fallbackHomeState.searchDefaults.endDate,
  })
  const [openMenu, setOpenMenu] = useState(null)
  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      new Date(
        fallbackHomeState.searchDefaults.startDate.getFullYear(),
        fallbackHomeState.searchDefaults.startDate.getMonth(),
        1,
      ),
  )
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchCardRef.current?.contains(event.target)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  const loadHomePage = useEffectEvent(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await getHomePageData({
        auth_state: authState,
      })
      const nextHomeState = createHomePageViewState(response.data)

      setHomeData(nextHomeState)
      setSearchState(nextHomeState.searchDefaults)
      setCalendarSelection({
        startDate: nextHomeState.searchDefaults.startDate,
        endDate: nextHomeState.searchDefaults.endDate,
      })
      setVisibleMonth(
        new Date(
          nextHomeState.searchDefaults.startDate.getFullYear(),
          nextHomeState.searchDefaults.startDate.getMonth(),
          1,
        ),
      )
    } catch (error) {
      setHomeData(fallbackHomeState)
      setSearchState(fallbackHomeState.searchDefaults)
      setCalendarSelection({
        startDate: fallbackHomeState.searchDefaults.startDate,
        endDate: fallbackHomeState.searchDefaults.endDate,
      })
      setVisibleMonth(
        new Date(
          fallbackHomeState.searchDefaults.startDate.getFullYear(),
          fallbackHomeState.searchDefaults.startDate.getMonth(),
          1,
        ),
      )
      setErrorMessage(error?.message ?? 'Không thể tải trang chủ lúc này.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    loadHomePage()
  }, [])

  function toggleMenu(menuKey) {
    setOpenMenu((currentMenu) => (currentMenu === menuKey ? null : menuKey))
  }

  function handleFieldSelect(fieldKey, value) {
    setSearchState((currentState) => ({
      ...currentState,
      [fieldKey]: value,
    }))
    setFeedbackMessage('')
    setOpenMenu(null)
  }

  function handleDateFieldToggle() {
    if (openMenu === 'date') {
      setOpenMenu(null)
      return
    }

    setCalendarSelection({
      startDate: searchState.startDate,
      endDate: searchState.endDate,
    })
    setVisibleMonth(
      new Date(searchState.startDate.getFullYear(), searchState.startDate.getMonth(), 1),
    )
    setOpenMenu('date')
  }

  function handleDateSelect(date) {
    let nextSelection

    if (!calendarSelection.startDate || calendarSelection.endDate) {
      nextSelection = {
        startDate: date,
        endDate: null,
      }
      setCalendarSelection(nextSelection)
      return
    }

    if (compareDates(date, calendarSelection.startDate) < 0) {
      nextSelection = {
        startDate: date,
        endDate: null,
      }
      setCalendarSelection(nextSelection)
      return
    }

    nextSelection = {
      startDate: calendarSelection.startDate,
      endDate: date,
    }

    setCalendarSelection(nextSelection)
    setSearchState((currentState) => ({
      ...currentState,
      startDate: nextSelection.startDate,
      endDate: nextSelection.endDate,
    }))
    setFeedbackMessage('')
    setOpenMenu(null)
  }

  function handleFilterSelect(filterKey, value) {
    setSearchState((currentState) => ({
      ...currentState,
      filters: {
        ...currentState.filters,
        [filterKey]: currentState.filters[filterKey] === value ? '' : value,
      },
    }))
    setFeedbackMessage('')
    setOpenMenu(null)
  }

  function handleSortSelect(value) {
    setSearchState((currentState) => ({
      ...currentState,
      sort: value,
    }))
    setFeedbackMessage('')
    setOpenMenu(null)
  }

  function handleSearch() {
    if (!searchState.startDate || !searchState.endDate) {
      setFeedbackMessage('Vui lòng chọn đầy đủ ngày đi và ngày về.')
      return
    }

    const params = buildHomeSearchParams(searchState, {
      auth: getPublicAuthQueryValue(isCustomer),
    })

    setFeedbackMessage('')
    setOpenMenu(null)
    navigate(`/services?${params.toString()}`)
  }

  function handleRetry() {
    loadHomePage()
  }

  function showPreviousMonth() {
    setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))
  }

  function showNextMonth() {
    setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))
  }

  const displayedDateRange = formatCompactDateRangeDisplay(
    searchState.startDate,
    searchState.endDate,
  )
  const calendarPreview = calendarSelection.endDate
    ? formatCompactDateRangeDisplay(calendarSelection.startDate, calendarSelection.endDate)
    : calendarSelection.startDate
      ? `${formatDateDisplay(calendarSelection.startDate)} - Chọn ngày về`
      : displayedDateRange
  const visibleMonths = [visibleMonth, addMonths(visibleMonth, 1)]
  const serviceListPath = buildPublicAuthPath('/services', isCustomer)
  const heroCtaPath = buildPublicAuthPath(homeData.hero.cta_path, isCustomer)
  const searchFieldOptions = HOME_SEARCH_FIELD_OPTIONS.map((field) => ({
    ...field,
    options: homeData.provinces,
  }))

  return {
    calendarSelection,
    calendarPreview,
    compareDates,
    destinations: homeData.destinations,
    displayedDateRange,
    errorMessage,
    feedbackMessage,
    flashSaleMeta: homeData.flashSaleMeta,
    flashSaleServices: homeData.flashSaleServices,
    formatCurrency: formatCurrencyVND,
    formatMonthLabel,
    featuredServices: homeData.featuredServices,
    getMonthDays,
    handleDateFieldToggle,
    handleDateSelect,
    handleFieldSelect,
    handleFilterSelect,
    handleRetry,
    handleSearch,
    handleSortSelect,
    hero: homeData.hero,
    heroCtaPath,
    isSameDay,
    loading,
    openMenu,
    searchCardRef,
    searchFieldOptions,
    searchState,
    serviceListPath,
    showNextMonth,
    showPreviousMonth,
    sortOptions: HOME_SORT_OPTIONS,
    toggleMenu,
    provinceOptions: homeData.provinces,
    valueProps: homeData.valueProps,
    visibleMonths,
    weekdayLabels: HOME_WEEKDAY_LABELS,
    filterGroups: HOME_FILTER_GROUPS,
  }
}
