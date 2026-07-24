import {
  ADMIN_CABIN_CLASS_OPTIONS,
  ADMIN_SERVICE_FORM_STATUS_OPTIONS,
  ADMIN_SEAT_CLASS_OPTIONS,
  ADMIN_TRANSPORT_TYPE_OPTIONS,
} from '../../../constants/adminServices.js'
import { SERVICE_STATUSES } from '../../../constants/serviceStatuses.js'
import { TOUR_CATEGORY_FILTER_OPTIONS } from '../../../constants/tours.js'

const detailFieldLabels = {
  room_types: 'Các loại phòng',
  name: 'Tên phòng',
  bed_type: 'Loại giường',
  max_adults: 'Người lớn tối đa',
  max_children: 'Trẻ em tối đa',
  total_rooms: 'Tổng số phòng',
  available_rooms: 'Phòng còn trống',
  base_price: 'Giá mỗi đêm',
  status: 'Trạng thái',
  departure_location: 'Điểm khởi hành',
  destination_location: 'Điểm đến chi tiết',
  tour_category: 'Loại hình tour',
  duration_days: 'Số ngày',
  duration_nights: 'Số đêm',
  transport_type: 'Phương tiện',
  max_group_size: 'Sức chứa tối đa',
  departure_schedule: 'Lịch khởi hành',
  itinerary: 'Lịch trình',
  included_services: 'Dịch vụ bao gồm',
  excluded_services: 'Dịch vụ không bao gồm',
  terms: 'Điều khoản',
  star_rating: 'Hạng sao',
  address: 'Địa chỉ',
  checkin_time: 'Giờ nhận phòng',
  checkout_time: 'Giờ trả phòng',
  amenities: 'Tiện ích',
  hotel_policy: 'Chính sách khách sạn',
  airline_name: 'Hãng bay',
  flight_number: 'Số hiệu chuyến bay',
  departure_airport: 'Sân bay đi',
  arrival_airport: 'Sân bay đến',
  departure_at: 'Thời gian khởi hành',
  arrival_at: 'Thời gian đến',
  cabin_class: 'Hạng vé',
  seats_total: 'Tổng số chỗ',
  seats_available: 'Số chỗ còn lại',
  fare_price: 'Giá vé',
  train_number: 'Số tàu',
  departure_station: 'Ga đi',
  arrival_station: 'Ga đến',
  seat_class: 'Hạng ghế',
  combo_items: 'Danh sách hạng mục combo',
}

function createEmptyHotelRoom() {
  return {
    id: '',
    name: '',
    bed_type: '',
    max_adults: '2',
    max_children: '0',
    total_rooms: '1',
    available_rooms: '1',
    base_price: '',
    description: '',
    status: SERVICE_STATUSES.active,
  }
}

function formatDetailLabel(label) {
  return detailFieldLabels[label] ?? label
}

function FieldShell({ children, error, label }) {
  return (
    <label className="admin-service-modal__field">
      <span className="admin-service-modal__field-label">{formatDetailLabel(label)}</span>
      {children}
      {error ? <span className="admin-service-modal__field-error">{error}</span> : null}
    </label>
  )
}

function TextInput({ error, label, name, onChange, type = 'text', value }) {
  return (
    <FieldShell error={error} label={label}>
      <input
        className={`admin-service-modal__input${
          error ? ' admin-service-modal__input--error' : ''
        }`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
      />
    </FieldShell>
  )
}

function TextArea({ error, label, name, onChange, rows = 4, value }) {
  return (
    <FieldShell error={error} label={label}>
      <textarea
        className={`admin-service-modal__textarea${
          error ? ' admin-service-modal__input--error' : ''
        }`}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
      />
    </FieldShell>
  )
}

function SelectInput({ error, label, name, onChange, options, value }) {
  return (
    <FieldShell error={error} label={label}>
      <select
        className={`admin-service-modal__select${
          error ? ' admin-service-modal__input--error' : ''
        }`}
        name={name}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

function HotelRoomTypesEditor({ details, errors, onDetailValueChange }) {
  const rooms = Array.isArray(details.room_types) ? details.room_types : []
  const statusOptions = ADMIN_SERVICE_FORM_STATUS_OPTIONS.filter(
    (option) => option.value !== SERVICE_STATUSES.deleted,
  )

  function updateRoom(index, fieldName, value) {
    onDetailValueChange(
      'room_types',
      rooms.map((room, roomIndex) =>
        roomIndex === index
          ? {
              ...room,
              [fieldName]: value,
            }
          : room,
      ),
    )
  }

  function addRoom() {
    onDetailValueChange('room_types', [...rooms, createEmptyHotelRoom()])
  }

  function removeRoom(index) {
    onDetailValueChange(
      'room_types',
      rooms.filter((_, roomIndex) => roomIndex !== index),
    )
  }

  return (
    <div className="admin-service-modal__hotel-rooms">
      <div className="admin-service-modal__hotel-rooms-header">
        <div>
          <h4>Các loại phòng</h4>
          <p>Thêm một hoặc nhiều hạng phòng để hiển thị trong trang chi tiết khách sạn.</p>
        </div>
        <button className="admin-service-modal__hotel-room-add" type="button" onClick={addRoom}>
          + Thêm phòng
        </button>
      </div>

      {rooms.length > 0 ? (
        <div className="admin-service-modal__hotel-room-list">
          {rooms.map((room, index) => (
            <article className="admin-service-modal__hotel-room-card" key={room.id || `room-${index}`}>
              <div className="admin-service-modal__hotel-room-card-head">
                <strong>Phòng {index + 1}</strong>
                <button type="button" onClick={() => removeRoom(index)}>
                  Xóa
                </button>
              </div>

              <div className="admin-service-modal__details-grid admin-service-modal__details-grid--rooms">
                <TextInput error={errors[`details.room_types.${index}.name`]} label="name" name="name" value={room.name ?? ''} onChange={(event) => updateRoom(index, 'name', event.target.value)} />
                <TextInput error={errors[`details.room_types.${index}.bed_type`]} label="bed_type" name="bed_type" value={room.bed_type ?? ''} onChange={(event) => updateRoom(index, 'bed_type', event.target.value)} />
                <TextInput error={errors[`details.room_types.${index}.max_adults`]} label="max_adults" name="max_adults" type="number" value={room.max_adults ?? ''} onChange={(event) => updateRoom(index, 'max_adults', event.target.value)} />
                <TextInput error={errors[`details.room_types.${index}.max_children`]} label="max_children" name="max_children" type="number" value={room.max_children ?? ''} onChange={(event) => updateRoom(index, 'max_children', event.target.value)} />
                <TextInput error={errors[`details.room_types.${index}.total_rooms`]} label="total_rooms" name="total_rooms" type="number" value={room.total_rooms ?? ''} onChange={(event) => updateRoom(index, 'total_rooms', event.target.value)} />
                <TextInput error={errors[`details.room_types.${index}.available_rooms`]} label="available_rooms" name="available_rooms" type="number" value={room.available_rooms ?? ''} onChange={(event) => updateRoom(index, 'available_rooms', event.target.value)} />
                <TextInput error={errors[`details.room_types.${index}.base_price`]} label="base_price" name="base_price" type="number" value={room.base_price ?? ''} onChange={(event) => updateRoom(index, 'base_price', event.target.value)} />
                <SelectInput error={errors[`details.room_types.${index}.status`]} label="status" name="status" options={statusOptions} value={room.status || SERVICE_STATUSES.active} onChange={(event) => updateRoom(index, 'status', event.target.value)} />
              </div>

              <TextArea error={errors[`details.room_types.${index}.description`]} label="description" name="description" rows={3} value={room.description ?? ''} onChange={(event) => updateRoom(index, 'description', event.target.value)} />
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-service-modal__room-note" role="note">
          Chưa có loại phòng nào. Hãy thêm phòng để khách sạn hiển thị đúng phần “Các loại phòng” ở trang chi tiết.
        </div>
      )}
    </div>
  )
}

function AdminServiceTypeFields({ details, errors, onDetailChange, onDetailValueChange, serviceType }) {
  if (serviceType === 'room') {
    return (
      <div className="admin-service-modal__room-note" role="note">
        Loại phòng sẽ được quản lý trong khu vực phòng khách sạn sau.
      </div>
    )
  }

  if (serviceType === 'tour') {
    return (
      <div className="admin-service-modal__details-grid">
        <TextInput error={errors['details.departure_location']} label="departure_location" name="departure_location" value={details.departure_location} onChange={onDetailChange} />
        <TextInput error={errors['details.destination_location']} label="destination_location" name="destination_location" value={details.destination_location} onChange={onDetailChange} />
        <SelectInput
          error={errors['details.tour_category']}
          label="tour_category"
          name="tour_category"
          options={TOUR_CATEGORY_FILTER_OPTIONS.map((category) => ({
            label: category,
            value: category,
          }))}
          value={details.tour_category}
          onChange={onDetailChange}
        />
        <TextInput error={errors['details.duration_days']} label="duration_days" name="duration_days" type="number" value={details.duration_days} onChange={onDetailChange} />
        <TextInput error={errors['details.duration_nights']} label="duration_nights" name="duration_nights" type="number" value={details.duration_nights} onChange={onDetailChange} />
        <SelectInput error={errors['details.transport_type']} label="transport_type" name="transport_type" options={ADMIN_TRANSPORT_TYPE_OPTIONS} value={details.transport_type} onChange={onDetailChange} />
        <TextInput error={errors['details.max_group_size']} label="max_group_size" name="max_group_size" type="number" value={details.max_group_size} onChange={onDetailChange} />
        <TextArea error={errors['details.departure_schedule']} label="departure_schedule" name="departure_schedule" rows={4} value={details.departure_schedule} onChange={onDetailChange} />
        <TextArea error={errors['details.included_services']} label="included_services" name="included_services" rows={3} value={details.included_services} onChange={onDetailChange} />
        <TextArea error={errors['details.excluded_services']} label="excluded_services" name="excluded_services" rows={3} value={details.excluded_services} onChange={onDetailChange} />
        <TextArea error={errors['details.terms']} label="terms" name="terms" rows={4} value={details.terms} onChange={onDetailChange} />
      </div>
    )
  }

  if (serviceType === 'hotel') {
    return (
      <div className="admin-service-modal__hotel-details">
        <div className="admin-service-modal__details-grid">
          <TextInput error={errors['details.star_rating']} label="star_rating" name="star_rating" type="number" value={details.star_rating} onChange={onDetailChange} />
          <TextInput error={errors['details.address']} label="address" name="address" value={details.address} onChange={onDetailChange} />
          <TextInput error={errors['details.checkin_time']} label="checkin_time" name="checkin_time" type="time" value={details.checkin_time} onChange={onDetailChange} />
          <TextInput error={errors['details.checkout_time']} label="checkout_time" name="checkout_time" type="time" value={details.checkout_time} onChange={onDetailChange} />
          <TextArea error={errors['details.amenities']} label="amenities" name="amenities" rows={4} value={details.amenities} onChange={onDetailChange} />
          <TextArea error={errors['details.hotel_policy']} label="hotel_policy" name="hotel_policy" rows={4} value={details.hotel_policy} onChange={onDetailChange} />
        </div>

        <HotelRoomTypesEditor
          details={details}
          errors={errors}
          onDetailValueChange={onDetailValueChange}
        />
      </div>
    )
  }

  if (serviceType === 'flight') {
    return (
      <div className="admin-service-modal__details-grid">
        <TextInput error={errors['details.airline_name']} label="airline_name" name="airline_name" value={details.airline_name} onChange={onDetailChange} />
        <TextInput error={errors['details.flight_number']} label="flight_number" name="flight_number" value={details.flight_number} onChange={onDetailChange} />
        <TextInput error={errors['details.departure_airport']} label="departure_airport" name="departure_airport" value={details.departure_airport} onChange={onDetailChange} />
        <TextInput error={errors['details.arrival_airport']} label="arrival_airport" name="arrival_airport" value={details.arrival_airport} onChange={onDetailChange} />
        <TextInput error={errors['details.departure_at']} label="departure_at" name="departure_at" type="datetime-local" value={details.departure_at} onChange={onDetailChange} />
        <TextInput error={errors['details.arrival_at']} label="arrival_at" name="arrival_at" type="datetime-local" value={details.arrival_at} onChange={onDetailChange} />
        <SelectInput error={errors['details.cabin_class']} label="cabin_class" name="cabin_class" options={ADMIN_CABIN_CLASS_OPTIONS} value={details.cabin_class} onChange={onDetailChange} />
        <TextInput error={errors['details.seats_total']} label="seats_total" name="seats_total" type="number" value={details.seats_total} onChange={onDetailChange} />
        <TextInput error={errors['details.seats_available']} label="seats_available" name="seats_available" type="number" value={details.seats_available} onChange={onDetailChange} />
        <TextInput error={errors['details.fare_price']} label="fare_price" name="fare_price" type="number" value={details.fare_price} onChange={onDetailChange} />
      </div>
    )
  }

  if (serviceType === 'train') {
    return (
      <div className="admin-service-modal__details-grid">
        <TextInput error={errors['details.train_number']} label="train_number" name="train_number" value={details.train_number} onChange={onDetailChange} />
        <TextInput error={errors['details.departure_station']} label="departure_station" name="departure_station" value={details.departure_station} onChange={onDetailChange} />
        <TextInput error={errors['details.arrival_station']} label="arrival_station" name="arrival_station" value={details.arrival_station} onChange={onDetailChange} />
        <TextInput error={errors['details.departure_at']} label="departure_at" name="departure_at" type="datetime-local" value={details.departure_at} onChange={onDetailChange} />
        <TextInput error={errors['details.arrival_at']} label="arrival_at" name="arrival_at" type="datetime-local" value={details.arrival_at} onChange={onDetailChange} />
        <SelectInput error={errors['details.seat_class']} label="seat_class" name="seat_class" options={ADMIN_SEAT_CLASS_OPTIONS} value={details.seat_class} onChange={onDetailChange} />
        <TextInput error={errors['details.seats_total']} label="seats_total" name="seats_total" type="number" value={details.seats_total} onChange={onDetailChange} />
        <TextInput error={errors['details.seats_available']} label="seats_available" name="seats_available" type="number" value={details.seats_available} onChange={onDetailChange} />
        <TextInput error={errors['details.fare_price']} label="fare_price" name="fare_price" type="number" value={details.fare_price} onChange={onDetailChange} />
      </div>
    )
  }

  if (serviceType === 'combo') {
    return (
      <div className="admin-service-modal__details-grid">
        <TextArea error={errors['details.combo_items']} label="combo_items" name="combo_items" rows={5} value={details.combo_items} onChange={onDetailChange} />
        <TextArea error={errors['details.terms']} label="terms" name="terms" rows={4} value={details.terms} onChange={onDetailChange} />
        <TextArea error={errors['details.included_services']} label="included_services" name="included_services" rows={3} value={details.included_services} onChange={onDetailChange} />
        <TextArea error={errors['details.excluded_services']} label="excluded_services" name="excluded_services" rows={3} value={details.excluded_services} onChange={onDetailChange} />
      </div>
    )
  }

  return null
}

export default AdminServiceTypeFields
