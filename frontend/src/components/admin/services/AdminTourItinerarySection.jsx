import {
  createEmptyAdminTourAction,
  createEmptyAdminTourDay,
} from '../../../mappers/adminServiceMappers.js'

function normalizeItineraryDays(itinerary = []) {
  return Array.isArray(itinerary) ? itinerary : []
}

function updateDayAt(itinerary, dayIndex, updater) {
  return normalizeItineraryDays(itinerary).map((day, index) =>
    index === dayIndex ? updater(day, index) : day,
  )
}

function updateActionAt(itinerary, dayIndex, actionIndex, updater) {
  return updateDayAt(itinerary, dayIndex, (day) => ({
    ...day,
    actions: Array.isArray(day.actions)
      ? day.actions.map((action, index) =>
          index === actionIndex ? updater(action, index) : action,
        )
      : [],
  }))
}

function ActionIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path
        d="M6 12h12M12 6v12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path
        d="M6.5 4.5v3M17.5 4.5v3M4.5 9h15M5 6.5h14v13H5v-13Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SectionTitle({ children, icon }) {
  return (
    <div className="admin-service-modal__figma-section-title">
      <span className="admin-service-modal__figma-section-icon">{icon}</span>
      <h3>{children}</h3>
    </div>
  )
}

function buildDayPlaceholder(dayNumber) {
  return createEmptyAdminTourDay(dayNumber)
}

export default function AdminTourItinerarySection({
  error = '',
  itinerary = [],
  onChange,
}) {
  const safeItinerary = normalizeItineraryDays(itinerary)

  function addDay() {
    onChange?.([
      ...safeItinerary,
      buildDayPlaceholder(safeItinerary.length + 1),
    ])
  }

  function removeDay(dayIndex) {
    const nextDays = safeItinerary
      .filter((_, index) => index !== dayIndex)
      .map((day, index) => ({
        ...day,
        day_number: index + 1,
      }))

    onChange?.(nextDays.length > 0 ? nextDays : [buildDayPlaceholder(1)])
  }

  function updateDayField(dayIndex, field, value) {
    onChange?.(
      updateDayAt(safeItinerary, dayIndex, (day) => ({
        ...day,
        [field]: value,
      })),
    )
  }

  function addAction(dayIndex) {
    onChange?.(
      updateDayAt(safeItinerary, dayIndex, (day) => ({
        ...day,
        actions: [...(Array.isArray(day.actions) ? day.actions : []), createEmptyAdminTourAction()],
      })),
    )
  }

  function removeAction(dayIndex, actionIndex) {
    onChange?.(
      updateDayAt(safeItinerary, dayIndex, (day) => {
        const nextActions = Array.isArray(day.actions)
          ? day.actions.filter((_, index) => index !== actionIndex)
          : []

        return {
          ...day,
          actions: nextActions.length > 0 ? nextActions : [createEmptyAdminTourAction()],
        }
      }),
    )
  }

  function updateActionField(dayIndex, actionIndex, field, value) {
    onChange?.(
      updateActionAt(safeItinerary, dayIndex, actionIndex, (action) => ({
        ...action,
        [field]: value,
      })),
    )
  }

  return (
    <section className="admin-service-modal__section admin-service-modal__timeline-section">
      <div className="admin-service-modal__timeline-header">
        <SectionTitle icon={<CalendarIcon />}>Lịch trình chi tiết (Đối với tour du lịch)</SectionTitle>
        <button className="admin-service-modal__add-day" type="button" onClick={addDay}>
          <span aria-hidden="true">+</span>
          Thêm ngày
        </button>
      </div>

      <div className="admin-service-modal__timeline">
        <span className="admin-service-modal__timeline-line" aria-hidden="true" />

        {safeItinerary.map((day, dayIndex) => (
          <article
            className={`admin-service-modal__day${
              Array.isArray(day.actions) && day.actions.some((action) => action.title || action.description)
                ? ' admin-service-modal__day--active'
                : ''
            }`}
            key={day.id ?? `tour-day-${dayIndex + 1}`}
          >
            <span className="admin-service-modal__day-number">{dayIndex + 1}</span>

            <div className="admin-service-modal__day-card">
              <div className="admin-service-modal__day-header">
                <input
                  aria-label={`Tiêu đề ngày ${dayIndex + 1}`}
                  className="admin-service-modal__day-title"
                  placeholder={`Tiêu đề ngày ${dayIndex + 1}`}
                  type="text"
                  value={day.title ?? ''}
                  onChange={(event) => updateDayField(dayIndex, 'title', event.target.value)}
                />

                <button
                  className="admin-service-modal__ghost-action admin-service-modal__ghost-action--danger"
                  type="button"
                  onClick={() => removeDay(dayIndex)}
                >
                  Xóa ngày
                </button>
              </div>

              <textarea
                aria-label={`Ghi chú chung ngày ${dayIndex + 1}`}
                className="admin-service-modal__day-note"
                placeholder="Ghi chú chung của ngày này..."
                rows="2"
                value={day.summary ?? ''}
                onChange={(event) => updateDayField(dayIndex, 'summary', event.target.value)}
              />

              <div className="admin-service-modal__action-list">
                {(Array.isArray(day.actions) ? day.actions : []).map((action, actionIndex) => (
                  <div
                    className="admin-service-modal__action-card"
                    key={action.id ?? `tour-day-${dayIndex + 1}-action-${actionIndex + 1}`}
                  >
                    <div className="admin-service-modal__action-header">
                      <span className="admin-service-modal__action-order">
                        Hoạt động {actionIndex + 1}
                      </span>
                      <button
                        className="admin-service-modal__ghost-action admin-service-modal__ghost-action--danger"
                        type="button"
                        onClick={() => removeAction(dayIndex, actionIndex)}
                      >
                        Xóa
                      </button>
                    </div>

                    <div className="admin-service-modal__day-row">
                      <input
                        aria-label={`Tên hoạt động ${actionIndex + 1} ngày ${dayIndex + 1}`}
                        className="admin-service-modal__day-input"
                        placeholder="Tên hoạt động"
                        type="text"
                        value={action.title ?? ''}
                        onChange={(event) =>
                          updateActionField(dayIndex, actionIndex, 'title', event.target.value)
                        }
                      />
                      <input
                        aria-label={`Thời gian hoạt động ${actionIndex + 1} ngày ${dayIndex + 1}`}
                        className="admin-service-modal__day-time"
                        placeholder="08:00"
                        type="text"
                        value={action.time ?? ''}
                        onChange={(event) =>
                          updateActionField(dayIndex, actionIndex, 'time', event.target.value)
                        }
                      />
                    </div>

                    <textarea
                      aria-label={`Mô tả hoạt động ${actionIndex + 1} ngày ${dayIndex + 1}`}
                      className="admin-service-modal__day-textarea"
                      placeholder="Mô tả chi tiết hoạt động..."
                      rows="3"
                      value={action.description ?? ''}
                      onChange={(event) =>
                        updateActionField(dayIndex, actionIndex, 'description', event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>

              <button
                className="admin-service-modal__ghost-action"
                type="button"
                onClick={() => addAction(dayIndex)}
              >
                <span className="admin-service-modal__ghost-action-icon">
                  <ActionIcon />
                </span>
                Thêm hoạt động
              </button>
            </div>
          </article>
        ))}
      </div>

      {error ? <span className="admin-service-modal__field-error">{error}</span> : null}
    </section>
  )
}
