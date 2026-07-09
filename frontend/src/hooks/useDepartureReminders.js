import { useMemo, useState } from 'react'

export default function useDepartureReminders({
  defaultChannels,
  journeys: initialJourneys = [],
} = {}) {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [channels, setChannels] = useState(defaultChannels)
  const [journeys, setJourneys] = useState(initialJourneys)

  const filteredJourneys = useMemo(() => {
    return journeys.filter((journey) => {
      if (selectedFilter === 'all') {
        return true
      }

      return journey.status === selectedFilter
    })
  }, [journeys, selectedFilter])

  const enabledJourneys = journeys.filter((journey) => journey.status === 'enabled')
  const activeReminderCount = journeys.reduce((totalCount, journey) => {
    return totalCount + journey.reminders.filter((reminder) => reminder.enabled).length
  }, 0)
  const nextReminder = journeys
    .flatMap((journey) =>
      journey.reminders
        .filter((reminder) => reminder.enabled)
        .map((reminder) => ({
          ...reminder,
          journeyTitle: journey.title,
        })),
    )[0]

  function handleChannelToggle(channelId) {
    setChannels((currentChannels) => ({
      ...currentChannels,
      [channelId]: !currentChannels[channelId],
    }))
  }

  function handleJourneyStatusToggle(journeyId) {
    setJourneys((currentJourneys) =>
      currentJourneys.map((journey) => {
        if (journey.id !== journeyId) {
          return journey
        }

        const nextStatus = journey.status === 'enabled' ? 'paused' : 'enabled'

        return {
          ...journey,
          status: nextStatus,
          status_label: nextStatus === 'enabled' ? 'Đang bật' : 'Tạm tắt',
          reminders: journey.reminders.map((reminder) => ({
            ...reminder,
            enabled: nextStatus === 'enabled',
          })),
        }
      }),
    )
  }

  function handleReminderToggle(journeyId, reminderId) {
    setJourneys((currentJourneys) =>
      currentJourneys.map((journey) => {
        if (journey.id !== journeyId) {
          return journey
        }

        const nextReminders = journey.reminders.map((reminder) =>
          reminder.id === reminderId
            ? { ...reminder, enabled: !reminder.enabled }
            : reminder,
        )
        const hasEnabledReminder = nextReminders.some((reminder) => reminder.enabled)

        return {
          ...journey,
          status: hasEnabledReminder ? 'enabled' : 'paused',
          status_label: hasEnabledReminder ? 'Đang bật' : 'Tạm tắt',
          reminders: nextReminders,
        }
      }),
    )
  }

  return {
    activeReminderCount,
    channels,
    enabledJourneys,
    filteredJourneys,
    handleChannelToggle,
    handleJourneyStatusToggle,
    handleReminderToggle,
    nextReminder,
    selectedFilter,
    setSelectedFilter,
  }
}
