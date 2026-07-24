> Nét Việt Travel — Full API Contract v2  
> MVP REST API | Payment: Direct/Manual only | Không tích hợp ví điện tử ở giai đoạn này

# NÉT VIỆT TRAVEL

## FULL API CONTRACT v2

*REST API cho Express.js/Node.js + Supabase PostgreSQL*

Ngày cập nhật: 28/06/2026

# 1. Quy ước chung

| Thành phần | Quy ước |
| --- | --- |
| Base URL | /api/ |
| Authentication | Authorization: Bearer &lt;access_token&gt; |
| Content-Type | application/json; charset=utf-8 |
| Idempotency-Key | Bắt buộc với checkout, tạo payment, confirm payment, refund để tránh tạo trùng. |
| Time format | ISO 8601/TIMESTAMPTZ, ví dụ 2026-07-20T07:00:00+07:00 |
| Currency | VND, amount dùng NUMERIC(14,2), response có thể trả number. |
| Soft delete | Không xóa vật lý bảng nghiệp vụ quan trọng; dùng deleted_at/status=deleted. |
| Pagination | page, limit, total, total_pages, has_next. |
| Sorting | sort=price_asc, price_desc, newest, oldest, popular. |

**Response envelope**

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5,
    "has_next": true
  }
}
```

**Error envelope**

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Email is invalid"
      }
    ]
  }
}
```

**Role viết tắt**

| Role | Ý nghĩa |
| --- | --- |
| PUBLIC | Chưa đăng nhập |
| CUSTOMER | Khách hàng |
| STAFF | Nhân viên vận hành |
| ADMIN | Quản trị viên nghiệp vụ |
| SYSTEM_ADMIN | Quản trị hệ thống, toàn quyền |

# 2. Enum và trạng thái nghiệp vụ

| Enum | Giá trị |
| --- | --- |
| user_status | pending_verification, active, locked, suspended, disabled, deleted |
| service_type | tour, hotel, room, flight, train, combo |
| service_status | draft, pending_review, active, hidden, sold_out, expired, archived, deleted |
| transport_type | bus, flight, train, car, ship, mixed |
| cabin_class | economy, premium_economy, business, first |
| transport_schedule_status | open, full, cancelled, departed, completed |
| seat_class | hard_seat, soft_seat, sleeper, vip |
| cart_status | active, converted, abandoned, expired |
| booking_status | pending_payment, payment_processing, paid, confirmed, in_progress, completed, cancel_requested, cancelled, refund_pending, partially_refunded, refunded, failed, expired |
| booking_item_status | pending, confirmed, cancelled, completed, refunded, failed |
| discount_type | percent, fixed_amount |
| payment_provider | direct, vnpay, momo, visa, mastercard, bank_transfer |
| payment_method | e_wallet, card, qr, bank_transfer, cash_at_office, manual_bank_transfer, staff_collect |
| payment_status | initiated, pending, processing, success, failed, cancelled, expired, partially_refunded, refunded, reconciled |
| refund_status | requested, approved, rejected, processing, success, failed, cancelled |
| promotion_status | draft, active, paused, expired, cancelled |
| voucher_status | active, disabled, used_up, expired |
| support_ticket_status | open, assigned, waiting_customer, waiting_staff, resolved, closed, spam |
| support_ticket_priority | low, normal, high, urgent |
| sender_type | customer, staff, admin, system |
| notification_type | booking_status, support_reply, promotion, payment, system |
| notification_status | queued, sent, delivered, read, failed |
| email_status | queued, sent, delivered, opened, bounced, spam_reported, failed |
| direct_payment_method | cash_at_office, manual_bank_transfer, staff_collect |

**Booking status transitions bắt buộc**

| Từ trạng thái | Được chuyển sang |
| --- | --- |
| pending_payment | paid, expired, cancelled, failed |
| paid | confirmed, refund_pending, cancelled |
| confirmed | in_progress, completed, cancel_requested, cancelled |
| in_progress | completed, cancel_requested |
| cancel_requested | cancelled, confirmed, refund_pending |
| refund_pending | partially_refunded, refunded, cancelled |
| partially_refunded | refunded, completed |
| completed | refund_pending nếu chính sách cho phép |

**Payment/Refund transitions bắt buộc**

| Luồng | Transition hợp lệ |
| --- | --- |
| Direct payment | pending -&gt; success \| failed \| cancelled \| expired |
| Direct payment reconciliation | success -&gt; reconciled |
| Refund | requested -&gt; approved \| rejected \| cancelled |
| Refund processing | approved -&gt; processing -&gt; success \| failed |

# 3. Danh sách đầy đủ API theo module

**Tổng số endpoint trong bản v2: 207 endpoints.**

## 0. Health, Version và System

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /health | PUBLIC | None | Kiểm tra app còn sống |
| GET | /health/live | PUBLIC | None | Liveness probe cho Docker/Render |
| GET | /health/ready | PUBLIC | None | Kiểm tra DB, Cloudinary, SendGrid |
| GET | /version | PUBLIC | None | Trả version API/build/runtime |

## 1. Auth API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /auth/register | PUBLIC | email, password, full_name, phone? | Tạo customer, status=pending_verification |
| POST | /auth/verify-email | PUBLIC | token | Kích hoạt email, status=active |
| POST | /auth/resend-verification | PUBLIC | email | Gửi lại email xác thực |
| POST | /auth/login | PUBLIC | email, password | Trả access_token, refresh_token, permissions |
| POST | /auth/refresh-token | PUBLIC | refresh_token | Cấp access token mới |
| POST | /auth/logout | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | refresh_token? | Thu hồi refresh token / ghi log |
| POST | /auth/forgot-password | PUBLIC | email | Gửi email reset password |
| POST | /auth/reset-password | PUBLIC | token, new_password | Đặt lại mật khẩu |
| POST | /auth/change-email/request | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | new_email | Gửi email xác nhận đổi email |
| POST | /auth/change-email/confirm | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | token | Xác nhận đổi email |

## 2. Profile / Me API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /me | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | None | Lấy hồ sơ hiện tại |
| PATCH | /me | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | full_name?, phone?, avatar_url? | Cập nhật hồ sơ |
| PATCH | /me/password | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | current_password, new_password | Đổi mật khẩu khi đã đăng nhập |
| PATCH | /me/avatar | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | avatar_url | Cập nhật ảnh đại diện Cloudinary |
| GET | /me/logs?page&limit | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | Query pagination | Xem lịch sử hoạt động của mình |
| GET | /me/vouchers | CUSTOMER | None | Xem voucher đã lưu hoặc đã sử dụng |
| POST | /me/vouchers | CUSTOMER | code | Lưu voucher hợp lệ vào tài khoản; thao tác lặp lại là idempotent |
| GET | /me/customer-survey | CUSTOMER | None | Kiểm tra khách hàng đã hoàn thành khảo sát nhận voucher chào mừng chưa |
| POST | /me/customer-survey | CUSTOMER | residence_location, nationality, discovery_source, travel_styles[], favorite_destinations[], budget_range, travel_forms[], preferred_contact_channel, loyalty_intent | Lưu khảo sát khách hàng và cấp một voucher riêng từ chương trình KM-4E6BF0BA trong cùng transaction |
| POST | /me/account-deactivation-request | CUSTOMER | reason | Khách yêu cầu vô hiệu hóa tài khoản |

## 3. Admin User & RBAC API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /admin/users?q&role&status&page&limit | ADMIN \| SYSTEM_ADMIN | Query filters | Danh sách user |
| POST | /admin/users | ADMIN \| SYSTEM_ADMIN | email, password, full_name, phone?, role_code | Tạo staff/admin theo quyền |
| GET | /admin/users/{user_id} | ADMIN \| SYSTEM_ADMIN | None | Chi tiết user |
| PATCH | /admin/users/{user_id} | ADMIN \| SYSTEM_ADMIN | full_name?, phone?, avatar_url? | Admin sửa thông tin cơ bản |
| DELETE | /admin/users/{user_id} | ADMIN \| SYSTEM_ADMIN | reason | Soft delete, không xóa system protected |
| PATCH | /admin/users/{user_id}/status | ADMIN \| SYSTEM_ADMIN | status, reason? | locked/suspended/disabled/active/deleted |
| PATCH | /admin/users/{user_id}/role | SYSTEM_ADMIN | role_code | Đổi role chính |
| POST | /admin/users/{user_id}/resend-verification-email | ADMIN \| SYSTEM_ADMIN | None | Gửi lại email xác thực |
| GET | /admin/users/{user_id}/logs?page&limit | ADMIN \| SYSTEM_ADMIN | Query pagination | Lịch sử hoạt động user |
| GET | /admin/roles | ADMIN \| SYSTEM_ADMIN | None | Danh sách role |
| POST | /admin/roles | SYSTEM_ADMIN | code, name, description?, level | Tạo role |
| GET | /admin/roles/{role_id} | ADMIN \| SYSTEM_ADMIN | None | Chi tiết role |
| PATCH | /admin/roles/{role_id} | SYSTEM_ADMIN | name?, description?, level? | Không sửa role hệ thống nếu bị khóa |
| DELETE | /admin/roles/{role_id} | SYSTEM_ADMIN | reason | Không xóa system role |
| GET | /admin/permissions | ADMIN \| SYSTEM_ADMIN | module?, resource? | Danh sách permission |
| PUT | /admin/roles/{role_id}/permissions | SYSTEM_ADMIN | permission_codes[] | Replace toàn bộ quyền của role |

## 4. Public Search, Lookup & Service API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /lookups/enums | PUBLIC | None | Trả enum public: service_type, cabin_class, seat_class... |
| GET | /locations/popular | PUBLIC | type?, limit? | Địa điểm phổ biến để filter |
| GET | /services/filter-options | PUBLIC | None | Metadata filter cho frontend |
| GET | /services/featured?type&limit | PUBLIC | Query | Dịch vụ nổi bật active |
| GET | /services?type&q&location&min_price&max_price&sort&page&limit | PUBLIC | Query filters | Search/list active services |
| GET | /services/{slug} | PUBLIC | None | Chi tiết dịch vụ active |
| GET | /services/{service_id}/images | PUBLIC | None | Ảnh dịch vụ |
| POST | /services/{service_id}/availability | PUBLIC \| CUSTOMER | service_type, reference_id?, start_at?, end_at?, quantity | Kiểm tra còn chỗ/phòng/ghế |
| GET | /services/{hotel_service_id}/rooms | PUBLIC | checkin?, checkout?, adults?, children? | Danh sách phòng khách sạn |
| GET | /services/flights/search?from&to&departure_date&cabin_class | PUBLIC | Query | Tìm vé máy bay |
| GET | /services/trains/search?from&to&departure_date&seat_class | PUBLIC | Query | Tìm vé tàu |
| GET | /services/combos | PUBLIC | location?, min_price?, max_price? | Danh sách combo active |
| GET | /services/combos/{slug} | PUBLIC | None | Chi tiết combo |

## 5. Admin Service Management API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /admin/services?type&status&q&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List toàn bộ dịch vụ theo quyền |
| POST | /admin/services | STAFF \| ADMIN \| SYSTEM_ADMIN | service_type, title, price, details | Tạo tour/hotel/flight/train/combo |
| GET | /admin/services/{service_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết admin gồm draft/hidden |
| PATCH | /admin/services/{service_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields cần sửa | Cập nhật service + details |
| DELETE | /admin/services/{service_id} | ADMIN \| SYSTEM_ADMIN | reason | Soft delete: status=deleted, deleted_at=now |
| POST | /admin/services/{service_id}/submit-review | STAFF \| ADMIN \| SYSTEM_ADMIN | None | draft -&gt; pending_review |
| POST | /admin/services/{service_id}/approve | ADMIN \| SYSTEM_ADMIN | note? | pending_review -&gt; active |
| POST | /admin/services/{service_id}/reject | ADMIN \| SYSTEM_ADMIN | reason | pending_review -&gt; draft/hidden |
| POST | /admin/services/{service_id}/hide | ADMIN \| SYSTEM_ADMIN | reason | active -&gt; hidden |
| POST | /admin/services/{service_id}/restore | ADMIN \| SYSTEM_ADMIN | target_status | hidden/archived -&gt; active/draft |
| PATCH | /admin/services/{service_id}/status | ADMIN \| SYSTEM_ADMIN | status, reason? | Quản lý trạng thái dịch vụ |
| PATCH | /admin/services/{service_id}/inventory | STAFF \| ADMIN \| SYSTEM_ADMIN | reference_id?, available_quantity | Cập nhật slot/phòng/ghế còn lại |
| POST | /admin/services/{service_id}/images | STAFF \| ADMIN \| SYSTEM_ADMIN | image_url, cloudinary_public_id?, alt_text?, sort_order?, is_primary? | Thêm ảnh |
| PATCH | /admin/services/{service_id}/images/{image_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | alt_text?, sort_order?, is_primary? | Sửa ảnh |
| DELETE | /admin/services/{service_id}/images/{image_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Xóa ảnh DB/Cloudinary tùy policy |
| PUT | /admin/services/{service_id}/images/reorder | STAFF \| ADMIN \| SYSTEM_ADMIN | image_orders[] | Sắp xếp ảnh |
| GET | /admin/hotels/{hotel_service_id}/rooms | STAFF \| ADMIN \| SYSTEM_ADMIN | status? | List room types |
| POST | /admin/hotels/{hotel_service_id}/rooms | STAFF \| ADMIN \| SYSTEM_ADMIN | name, bed_type, max_adults, total_rooms, price... | Tạo room type |
| PATCH | /admin/rooms/{room_type_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields cần sửa | Cập nhật phòng |
| DELETE | /admin/rooms/{room_type_id} | ADMIN \| SYSTEM_ADMIN | reason | Soft delete/hidden room |
| POST | /admin/services/{service_id}/flight-details | STAFF \| ADMIN \| SYSTEM_ADMIN | flight_number, airports, times, seats, fare | Tạo flight detail |
| PATCH | /admin/flight-details/{flight_detail_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields cần sửa | Cập nhật flight |
| DELETE | /admin/flight-details/{flight_detail_id} | ADMIN \| SYSTEM_ADMIN | reason | Hủy/ẩn chuyến bay |
| POST | /admin/services/{service_id}/train-details | STAFF \| ADMIN \| SYSTEM_ADMIN | train_number, stations, times, seats, fare | Tạo train detail |
| PATCH | /admin/train-details/{train_detail_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields cần sửa | Cập nhật train |
| DELETE | /admin/train-details/{train_detail_id} | ADMIN \| SYSTEM_ADMIN | reason | Hủy/ẩn chuyến tàu |
| POST | /admin/services/combos | STAFF \| ADMIN \| SYSTEM_ADMIN | service fields + combo_items[] | Tạo combo, lưu combo_items trong metadata |
| PATCH | /admin/services/combos/{service_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields + combo_items[] | Cập nhật combo |

## 6. Cart API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /cart | CUSTOMER | None | Lấy giỏ active |
| GET | /cart/summary | CUSTOMER | voucher_code? | Tính tổng tiền giỏ |
| POST | /cart/items | CUSTOMER | service_id, service_type, reference_id?, start_at?, end_at?, quantity, options? | Thêm item |
| PATCH | /cart/items/{cart_item_id} | CUSTOMER | quantity?, start_at?, end_at?, options? | Sửa item |
| DELETE | /cart/items/{cart_item_id} | CUSTOMER | None | Xóa item |
| DELETE | /cart/items | CUSTOMER | None | Xóa toàn bộ item |
| POST | /cart/validate | CUSTOMER | voucher_code? | Kiểm tra giá, availability, voucher |
| POST | /cart/apply-voucher | CUSTOMER | code | Áp dụng voucher vào giỏ |
| DELETE | /cart/voucher | CUSTOMER | None | Gỡ voucher đang áp dụng |
| POST | /cart/merge | CUSTOMER | guest_items[] | Tùy chọn: merge giỏ guest sau login |

## 7. Customer Booking API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /bookings/checkout | CUSTOMER | cart_id, contact info, voucher_code?, travellers[], note? | Tạo booking từ cart |
| GET | /bookings?status&page&limit | CUSTOMER | Query | Danh sách booking của mình |
| GET | /bookings/{booking_id} | CUSTOMER | None | Chi tiết booking của mình |
| GET | /bookings/{booking_id}/items | CUSTOMER | None | Chi tiết dịch vụ trong booking |
| GET | /bookings/{booking_id}/status-history | CUSTOMER | None | Lịch sử trạng thái |
| POST | /bookings/{booking_id}/cancel-request | CUSTOMER | reason | Yêu cầu hủy booking |
| GET | /bookings/{booking_id}/invoice | CUSTOMER | None | Thông tin hóa đơn/biên nhận nội bộ |
| GET | /bookings/{booking_id}/download-summary | CUSTOMER | None | Xuất file PDF/tóm tắt booking nếu có |
| PATCH | /bookings/{booking_id}/contact | CUSTOMER | contact_name?, contact_phone?, note? | Chỉ khi booking chưa confirmed |

## 8. Admin Booking API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /admin/bookings?status&from&to&q&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List toàn bộ booking |
| GET | /admin/bookings/{booking_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết booking |
| GET | /admin/bookings/{booking_id}/status-history | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Lịch sử trạng thái |
| PATCH | /admin/bookings/{booking_id}/status | STAFF \| ADMIN \| SYSTEM_ADMIN | status, reason | Cập nhật trạng thái có kiểm tra transition |
| POST | /admin/bookings/{booking_id}/confirm | STAFF \| ADMIN \| SYSTEM_ADMIN | reason? | paid -&gt; confirmed |
| POST | /admin/bookings/{booking_id}/cancel | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Admin hủy booking |
| POST | /admin/bookings/{booking_id}/expire | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Quá hạn thanh toán/giữ chỗ |
| POST | /admin/bookings/{booking_id}/complete | STAFF \| ADMIN \| SYSTEM_ADMIN | reason? | in_progress -&gt; completed |
| PATCH | /admin/booking-items/{booking_item_id}/status | STAFF \| ADMIN \| SYSTEM_ADMIN | status, reason? | Cập nhật từng dòng dịch vụ |
| PATCH | /admin/booking-items/{booking_item_id}/traveller-info | STAFF \| ADMIN \| SYSTEM_ADMIN | traveller_info | Sửa thông tin hành khách khi cần |
| POST | /admin/bookings/{booking_id}/resend-confirmation-email | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Gửi lại email xác nhận |

## 9. Direct Payment API — Thanh toán trực tiếp

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /payment-methods/direct | PUBLIC \| CUSTOMER | None | Thông tin văn phòng/ngân hàng để thanh toán trực tiếp |
| POST | /bookings/{booking_id}/direct-payments | CUSTOMER | payment_method, payer_name, payer_phone?, note? | Tạo payment provider=direct, status=pending |
| GET | /bookings/{booking_id}/payments | CUSTOMER | None | Payments của booking của mình |
| GET | /payments/{payment_id} | CUSTOMER | None | Chi tiết payment của mình |
| POST | /payments/{payment_id}/cancel | CUSTOMER | reason | Chỉ pending mới được hủy |
| POST | /payments/{payment_id}/proof | CUSTOMER | proof_image_url, transfer_note?, bank_transaction_code? | Upload chứng từ chuyển khoản thủ công |
| GET | /payments/{payment_id}/proof | CUSTOMER | None | Xem chứng từ của mình |
| GET | /admin/payments?provider&method&status&from&to&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List giao dịch |
| GET | /admin/payments/{payment_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết giao dịch |
| GET | /admin/payments/{payment_id}/proof | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Xem chứng từ khách upload |
| POST | /admin/payments/{payment_id}/confirm | STAFF \| ADMIN \| SYSTEM_ADMIN | received_amount, received_at, collector_note?, next_booking_status | Xác nhận đã nhận tiền |
| POST | /admin/payments/{payment_id}/reject | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Từ chối xác nhận tiền |
| POST | /admin/payments/{payment_id}/expire | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Đánh dấu hết hạn |
| POST | /admin/payments/{payment_id}/mark-reconciled | ADMIN \| SYSTEM_ADMIN | note? | Đối soát nội bộ |
| PATCH | /admin/payments/{payment_id}/note | STAFF \| ADMIN \| SYSTEM_ADMIN | note | Ghi chú nội bộ vào raw_response/metadata |

## 9.1 Tour review API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /bookings/{booking_id}/complete | CUSTOMER | None | Khách xác nhận hoàn thành sau khi tour kết thúc |
| POST | /bookings/{booking_id}/reviews | CUSTOMER | booking_item_id, rating, comment | Một đánh giá cho mỗi booking item tour |
| GET | /services/{service_id}/reviews | PUBLIC | page?, limit? | Danh sách và điểm trung bình đánh giá công khai |

### 9.2 Tour comment API

| Method | Endpoint | Role | Input | Mô tả |
| --- | --- | --- | --- | --- |
| GET | /services/{service_id}/comments | PUBLIC | page?, limit? | Đọc bình luận thảo luận, không ảnh hưởng điểm đánh giá |
| POST | /services/{service_id}/comments | PUBLIC/OPTIONAL AUTH | content, display_name nếu là khách vãng lai | Mọi người đều có thể bình luận, không yêu cầu booking |

## 10. Manual Refund API — Hoàn tiền thủ công

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /bookings/{booking_id}/refunds | CUSTOMER | payment_id, amount, reason | Khách yêu cầu hoàn tiền |
| GET | /bookings/{booking_id}/refunds | CUSTOMER | None | Refunds thuộc booking của mình |
| GET | /refunds/{refund_id} | CUSTOMER | None | Chi tiết refund của mình |
| POST | /refunds/{refund_id}/cancel | CUSTOMER | reason | Hủy yêu cầu nếu requested |
| GET | /admin/refunds?status&from&to&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List refund |
| GET | /admin/refunds/{refund_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết refund |
| POST | /admin/refunds/{refund_id}/approve | ADMIN \| SYSTEM_ADMIN | approved_amount, note? | Duyệt hoàn tiền |
| POST | /admin/refunds/{refund_id}/reject | ADMIN \| SYSTEM_ADMIN | reason | Từ chối hoàn tiền |
| POST | /admin/refunds/{refund_id}/mark-processing | STAFF \| ADMIN \| SYSTEM_ADMIN | note? | Đang xử lý hoàn tiền ngoài hệ thống |
| POST | /admin/refunds/{refund_id}/mark-success | STAFF \| ADMIN \| SYSTEM_ADMIN | processed_at, provider_refund_id?, note? | Đã hoàn tiền thủ công |
| POST | /admin/refunds/{refund_id}/mark-failed | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Hoàn tiền thất bại |
| PATCH | /admin/refunds/{refund_id}/note | STAFF \| ADMIN \| SYSTEM_ADMIN | note | Ghi chú nội bộ |

## 11. Promotion API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /promotions?service_type&active_only | PUBLIC | Query | Promotion đang hiển thị |
| GET | /promotions/{promotion_id} | PUBLIC | None | Chi tiết promotion active |
| GET | /admin/promotions?status&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List admin, gồm voucher_count và active_voucher_count |
| POST | /admin/promotions | STAFF \| ADMIN \| SYSTEM_ADMIN | name, description?, status, valid_from, valid_to, target_service_type? | Tạo promotion |
| GET | /admin/promotions/{promotion_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết admin |
| PATCH | /admin/promotions/{promotion_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields cần sửa | Cập nhật promotion |
| DELETE | /admin/promotions/{promotion_id} | ADMIN \| SYSTEM_ADMIN | reason | Hủy/xóa mềm promotion |
| PATCH | /admin/promotions/{promotion_id}/status | STAFF \| ADMIN \| SYSTEM_ADMIN | status | draft/active/paused/expired/cancelled |
| GET | /admin/promotions/{promotion_id}/vouchers | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Voucher thuộc promotion |

## 12. Voucher API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /vouchers/validate | CUSTOMER | code, cart_id? | Kiểm tra voucher với cart |
| POST | /cart/apply-voucher | CUSTOMER | code | Áp dụng voucher |
| DELETE | /cart/voucher | CUSTOMER | None | Gỡ voucher |
| GET | /admin/vouchers?status&q&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List voucher |
| POST | /admin/vouchers | STAFF \| ADMIN \| SYSTEM_ADMIN | promotion_id, code, discount_type, discount_value, max_discount_amount?, min_order_amount?, usage_limit_total?, usage_limit_per_user?, valid_from, valid_to, status? | Tạo voucher |
| GET | /admin/vouchers/{voucher_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết voucher |
| PATCH | /admin/vouchers/{voucher_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | fields cần sửa | Cập nhật voucher |
| DELETE | /admin/vouchers/{voucher_id} | ADMIN \| SYSTEM_ADMIN | reason | Xóa mềm/disable |
| PATCH | /admin/vouchers/{voucher_id}/status | STAFF \| ADMIN \| SYSTEM_ADMIN | status | active/disabled/used_up/expired |
| POST | /admin/vouchers/{voucher_id}/duplicate | STAFF \| ADMIN \| SYSTEM_ADMIN | new_code, valid_from?, valid_to? | Nhân bản voucher |

## 13. Support API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /support/tickets | PUBLIC \| CUSTOMER | booking_id?, service_id?, customer info, subject, message | Khách gửi ticket |
| GET | /support/tickets?status&page&limit | CUSTOMER | Query | Ticket của mình |
| GET | /support/tickets/{ticket_id} | CUSTOMER | None | Chi tiết ticket của mình |
| POST | /support/tickets/{ticket_id}/replies | CUSTOMER | message | Khách phản hồi |
| POST | /support/tickets/{ticket_id}/close | CUSTOMER | reason? | Khách đóng ticket |
| GET | /admin/support/tickets?status&priority&assigned_to&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | List ticket admin |
| GET | /admin/support/tickets/{ticket_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết ticket admin |
| PATCH | /admin/support/tickets/{ticket_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | status?, priority?, assigned_to? | Cập nhật ticket |
| POST | /admin/support/tickets/{ticket_id}/assign | STAFF \| ADMIN \| SYSTEM_ADMIN | assigned_to | Phân công nhân viên |
| POST | /admin/support/tickets/{ticket_id}/replies | STAFF \| ADMIN \| SYSTEM_ADMIN | message, is_internal_note | Nhân viên/admin trả lời |
| POST | /admin/support/tickets/{ticket_id}/close | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Đóng ticket |
| POST | /admin/support/tickets/{ticket_id}/reopen | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Mở lại ticket |
| POST | /admin/support/tickets/{ticket_id}/mark-spam | STAFF \| ADMIN \| SYSTEM_ADMIN | reason | Đánh dấu spam |

## 14. Notification API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /notifications?status&type&page&limit | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | Query | Thông báo của user hiện tại |
| GET | /notifications/unread-count | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | None | Đếm chưa đọc |
| GET | /notifications/{notification_id} | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết thông báo |
| PATCH | /notifications/{notification_id}/read | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | None | Đánh dấu đã đọc |
| PATCH | /notifications/bulk-read | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | notification_ids[] | Đánh dấu nhiều thông báo đã đọc |
| PATCH | /notifications/read-all | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | None | Đọc tất cả |
| DELETE | /notifications/{notification_id} | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | None | Ẩn/xóa khỏi phía user |
| GET | /admin/notifications?type&status&page&limit | ADMIN \| SYSTEM_ADMIN | Query | List thông báo hệ thống |
| POST | /admin/notifications/broadcast | ADMIN \| SYSTEM_ADMIN | title, body, type, target | Gửi broadcast |
| POST | /admin/notifications/users/{user_id} | ADMIN \| SYSTEM_ADMIN | title, body, type, related_entity? | Gửi cho 1 user |
| PATCH | /admin/notifications/{notification_id}/status | ADMIN \| SYSTEM_ADMIN | status | queued/sent/delivered/read/failed |

## 15. Mail API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /admin/email-logs?status&to_email&template_code&page&limit | STAFF \| ADMIN \| SYSTEM_ADMIN | Query filters | Lịch sử gửi email |
| GET | /admin/email-logs/{email_log_id} | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Chi tiết email log |
| POST | /admin/email-logs/{email_log_id}/resend | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Gửi lại email từ log |
| POST | /admin/bookings/{booking_id}/resend-confirmation-email | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Gửi lại email booking |
| POST | /admin/users/{user_id}/resend-verification-email | ADMIN \| SYSTEM_ADMIN | None | Gửi lại xác thực tài khoản |
| POST | /admin/support/tickets/{ticket_id}/send-email | STAFF \| ADMIN \| SYSTEM_ADMIN | subject, message | Gửi email hỗ trợ thủ công |
| GET | /admin/mail/templates | STAFF \| ADMIN \| SYSTEM_ADMIN | None | Danh sách template code cố định |
| GET | /admin/mail/stats?from&to | ADMIN \| SYSTEM_ADMIN | Query | Thống kê sent/delivered/opened/bounced |

## 16. Upload & Cloudinary API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| POST | /uploads/signature | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | folder, resource_type | Lấy chữ ký upload Cloudinary |
| POST | /uploads/complete | CUSTOMER \| STAFF \| ADMIN \| SYSTEM_ADMIN | asset_url, public_id, resource_type, purpose | Xác nhận upload thành công nếu cần ghi log |
| DELETE | /uploads/cloudinary | STAFF \| ADMIN \| SYSTEM_ADMIN | public_id, resource_type | Xóa asset Cloudinary |
| GET | /admin/uploads/usage | ADMIN \| SYSTEM_ADMIN | None | Thống kê dung lượng upload nếu có |

## 17. Dashboard, Report & Audit API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /admin/dashboard/overview?from&to | ADMIN \| SYSTEM_ADMIN | Query | Tổng quan doanh thu, booking, user, service |
| GET | /admin/dashboard/charts/revenue?from&to&group_by | ADMIN \| SYSTEM_ADMIN | Query | Biểu đồ doanh thu |
| GET | /admin/dashboard/charts/bookings?from&to&group_by | ADMIN \| SYSTEM_ADMIN | Query | Biểu đồ booking |
| GET | /admin/reports/revenue?from&to&group_by | ADMIN \| SYSTEM_ADMIN | Query | Báo cáo doanh thu |
| GET | /admin/reports/bookings?from&to&status | ADMIN \| SYSTEM_ADMIN | Query | Báo cáo đơn đặt |
| GET | /admin/reports/services?type&status | ADMIN \| SYSTEM_ADMIN | Query | Báo cáo dịch vụ |
| GET | /admin/reports/payments?from&to&status | ADMIN \| SYSTEM_ADMIN | Query | Báo cáo thanh toán trực tiếp |
| POST | /admin/reports/export | ADMIN \| SYSTEM_ADMIN | report_type, format, from, to, filters? | Xuất xlsx/pdf |
| GET | /admin/audit-logs?action&user_id&entity_name&page&limit | ADMIN \| SYSTEM_ADMIN | Query | Xem user_logs |
| GET | /admin/audit-logs/{log_id} | ADMIN \| SYSTEM_ADMIN | None | Chi tiết log |
| GET | /admin/system/stats | SYSTEM_ADMIN | None | Thống kê vận hành nội bộ |

## 18. Settings API

| Method | Endpoint | Role | Body / Query chính | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| GET | /settings/public | PUBLIC | None | Cấu hình public: hotline, logo, business info |
| GET | /admin/settings/public | ADMIN \| SYSTEM_ADMIN | None | Xem cấu hình public |
| PATCH | /admin/settings/public | ADMIN \| SYSTEM_ADMIN | site_name, hotline, address, social_links... | Cập nhật cấu hình public |
| GET | /admin/settings/direct-payment | ADMIN \| SYSTEM_ADMIN | None | Cấu hình ngân hàng/văn phòng |
| PATCH | /admin/settings/direct-payment | ADMIN \| SYSTEM_ADMIN | methods[] | Cập nhật phương thức thanh toán trực tiếp |
| GET | /admin/settings/business | ADMIN \| SYSTEM_ADMIN | None | Thông tin công ty xuất hóa đơn/nội bộ |
| PATCH | /admin/settings/business | ADMIN \| SYSTEM_ADMIN | company_name, tax_code, address... | Cập nhật business settings |

# 4. Request/Response schema quan trọng

### 4.1 Auth login

**Request body / query mẫu**

```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "access_token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token",
    "expires_in": 1800,
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "full_name": "Nguyễn Văn A",
      "role": "customer",
      "permissions": [
        "booking.create",
        "booking.read_self",
        "voucher.apply"
      ]
    }
  }
}
```

**Business rules**

- Không cho login nếu user.status không phải active.
- Mật khẩu hash bằng bcrypt/Argon2, không trả password_hash.

### 4.2 Tạo service tour

**Request body / query mẫu**

```json
{
  "service_type": "tour",
  "title": "Tour Đà Lạt 3N2Đ",
  "slug": "tour-da-lat-3n2d",
  "short_description": "Tour nghỉ dưỡng Đà Lạt",
  "description": "Mô tả chi tiết tour",
  "provider_name": "Nét Việt Travel",
  "location_text": "Đà Lạt",
  "base_price": 2990000,
  "sale_price": 2590000,
  "currency": "VND",
  "status": "draft",
  "cancellation_policy": "Hủy trước 7 ngày hoàn 70%",
  "details": {
    "departure_location": "TP.HCM",
    "destination_location": "Đà Lạt",
    "duration_days": 3,
    "duration_nights": 2,
    "transport_type": "bus",
    "max_group_size": 30,
    "departure_schedule": [
      {
        "date": "2026-07-20",
        "available_slots": 30
      }
    ],
    "itinerary": [
      {
        "day": 1,
        "title": "TP.HCM - Đà Lạt",
        "activities": [
          "Khởi hành",
          "Check-in"
        ]
      }
    ],
    "included_services": "Xe, khách sạn, ăn sáng",
    "excluded_services": "Chi phí cá nhân",
    "terms": "Điều khoản tour"
  }
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "service_code": "TOUR-DL-0001",
    "status": "draft"
  }
}
```

**Business rules**

- service_type quyết định bảng details cần ghi.
- Customer không được thấy draft/pending_review/hidden.

### 4.3 Availability check

**Request body / query mẫu**

```json
{
  "service_type": "hotel",
  "reference_id": "room_type_id",
  "start_at": "2026-07-20T14:00:00+07:00",
  "end_at": "2026-07-22T12:00:00+07:00",
  "quantity": 2
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "available": true,
    "available_quantity": 15,
    "unit_price": 1200000,
    "total_amount": 2400000,
    "issues": []
  }
}
```

**Business rules**

- Tour kiểm tra slot trong departure_schedule hoặc metadata.
- Hotel kiểm tra room_types.available_rooms.
- Flight/train kiểm tra seats_available.

### 4.4 Add cart item

**Request body / query mẫu**

```json
{
  "service_id": "uuid",
  "service_type": "tour",
  "reference_id": null,
  "start_at": "2026-07-20T07:00:00+07:00",
  "end_at": "2026-07-22T18:00:00+07:00",
  "quantity": 2,
  "options": {
    "adults": 2,
    "children": 0
  }
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "cart_id": "uuid",
    "cart_item_id": "uuid",
    "summary": {
      "subtotal_amount": 5180000,
      "total_amount": 5180000,
      "currency": "VND"
    }
  }
}
```

**Business rules**

- Trước khi thêm phải kiểm tra service active và availability.
- unit_price_snapshot lấy tại thời điểm thêm vào giỏ.

### 4.5 Checkout booking

**Request body / query mẫu**

```json
{
  "cart_id": "uuid",
  "contact_name": "Nguyễn Văn A",
  "contact_email": "customer@example.com",
  "contact_phone": "0909000000",
  "voucher_code": "SUMMER2026",
  "note": "Tôi muốn phòng tầng cao",
  "travellers": [
    {
      "cart_item_id": "uuid",
      "traveller_info": [
        {
          "full_name": "Nguyễn Văn A",
          "phone": "0909000000",
          "email": "customer@example.com"
        }
      ]
    }
  ]
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "booking_id": "uuid",
    "booking_code": "BK202606280001",
    "status": "pending_payment",
    "subtotal_amount": 5180000,
    "discount_amount": 300000,
    "total_amount": 4880000,
    "currency": "VND",
    "expires_at": "2026-06-29T23:59:59+07:00"
  }
}
```

**Business rules**

- Checkout chạy trong DB transaction.
- Tạo bookings, booking_items, booking_status_histories; carts.status=converted.
- service_snapshot bắt buộc để giữ giá/chính sách tại thời điểm đặt.

### 4.6 Tạo direct payment

**Request body / query mẫu**

```json
{
  "payment_method": "manual_bank_transfer",
  "payer_name": "Nguyễn Văn A",
  "payer_phone": "0909000000",
  "note": "Tôi sẽ chuyển khoản trong hôm nay"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "payment_code": "PAY202606280001",
    "provider": "direct",
    "payment_method": "manual_bank_transfer",
    "status": "pending",
    "amount": 4880000,
    "currency": "VND",
    "expired_at": "2026-06-29T23:59:59+07:00"
  }
}
```

**Business rules**

- Không gọi ví điện tử/cổng thanh toán.
- Customer chỉ tạo payment pending; không được tự xác nhận success.
- provider_transaction_id/provider_order_id để null ở MVP.

### 4.7 Upload chứng từ thanh toán

**Request body / query mẫu**

```json
{
  "proof_image_url": "https://res.cloudinary.com/.../proof.jpg",
  "transfer_note": "Đã chuyển khoản lúc 15:30",
  "bank_transaction_code": "FT123456789"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "status": "pending",
    "proof": {
      "proof_image_url": "https://res.cloudinary.com/.../proof.jpg",
      "bank_transaction_code": "FT123456789",
      "submitted_at": "2026-06-28T15:35:00+07:00"
    }
  }
}
```

**Business rules**

- Chứng từ có thể lưu trong payments.raw_response.proof để không cần thêm bảng MVP.
- Chỉ payment pending mới cho cập nhật proof.

### 4.8 Staff/Admin confirm payment

**Request body / query mẫu**

```json
{
  "received_amount": 4880000,
  "received_at": "2026-06-28T15:30:00+07:00",
  "collector_note": "Đã nhận chuyển khoản đúng nội dung",
  "next_booking_status": "confirmed"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "status": "success",
      "paid_at": "2026-06-28T15:30:00+07:00"
    },
    "booking": {
      "id": "uuid",
      "status": "confirmed"
    }
  }
}
```

**Business rules**

- received_amount phải bằng payments.amount, trừ khi policy cho thanh toán một phần.
- Cập nhật payment và booking trong cùng transaction.
- Tự tạo notification và email xác nhận booking.

### 4.9 Refund thủ công

**Request body / query mẫu**

```json
{
  "payment_id": "uuid",
  "amount": 3000000,
  "reason": "Tôi hủy booking theo chính sách"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "refund_id": "uuid",
    "refund_code": "RF202606280001",
    "status": "requested",
    "amount": 3000000
  }
}
```

**Business rules**

- Chỉ booking đã paid/confirmed/completed theo chính sách mới được request refund.
- Refund success sẽ cập nhật payments.status và bookings.status tương ứng.

### 4.10 Voucher validate

**Request body / query mẫu**

```json
{
  "code": "SUMMER2026",
  "cart_id": "uuid"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "voucher_id": "uuid",
    "discount_type": "fixed_amount",
    "discount_value": 300000,
    "discount_amount": 300000,
    "final_total_amount": 4880000
  }
}
```

**Business rules**

- Kiểm tra thời hạn, status, min_order_amount, usage_limit_total, usage_limit_per_user.
- Không tăng used_count khi chỉ validate; chỉ tăng khi checkout thành công.

### 4.11 Support ticket public/customer

**Request body / query mẫu**

```json
{
  "booking_id": "uuid",
  "service_id": "uuid",
  "customer_name": "Nguyễn Văn A",
  "customer_email": "customer@example.com",
  "customer_phone": "0909000000",
  "subject": "Tôi cần tư vấn tour Đà Lạt",
  "message": "Tour này còn chỗ ngày 20/07 không?"
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "ticket_id": "uuid",
    "ticket_code": "TK202606280001",
    "status": "open"
  }
}
```

**Business rules**

- Cho phép khách vãng lai gửi ticket bằng customer_email/customer_phone.
- Nếu user đã đăng nhập thì set user_id.

### 4.12 Report export

**Request body / query mẫu**

```json
{
  "report_type": "revenue",
  "format": "xlsx",
  "from": "2026-06-01",
  "to": "2026-06-28",
  "filters": {
    "status": "success"
  }
}
```

**Response mẫu**

```json
{
  "success": true,
  "data": {
    "file_url": "https://.../reports/revenue-20260628.xlsx"
  }
}
```

**Business rules**

- Chỉ ADMIN/SYSTEM_ADMIN được export.
- File có thể lưu Cloudinary hoặc local storage tùy cấu hình triển khai.

# 5. Permission codes đề xuất

| Module | Permission codes |
| --- | --- |
| auth/profile | profile.read_self, profile.update_self, profile.change_password |
| user | user.read_all, user.create, user.update, user.delete, user.change_status, user.change_role |
| rbac | role.read, role.create, role.update, role.delete, permission.read, role_permission.update |
| service | service.read_all, service.create, service.update, service.delete, service.approve, service.hide, service.inventory_update |
| booking | booking.create, booking.read_self, booking.read_all, booking.update_status, booking.cancel, booking.export |
| payment | payment.create_direct, payment.read_self, payment.read_all, payment.confirm, payment.reject, payment.reconcile |
| refund | refund.request, refund.read_self, refund.read_all, refund.approve, refund.process, refund.reject |
| promotion | promotion.read, promotion.create, promotion.update, promotion.delete, promotion.change_status |
| voucher | voucher.apply, voucher.read_all, voucher.create, voucher.update, voucher.delete |
| support | support.create_ticket, support.read_self, support.read_all, support.reply, support.assign, support.close |
| notification | notification.read_self, notification.broadcast, notification.manage |
| mail | email_log.read, email.resend, email.send |
| report/audit | dashboard.read, report.read, report.export, audit.read |
| settings | settings.read, settings.update |

**Role matrix rút gọn**

| Module | Customer | Staff | Admin | System Admin |
| --- | --- | --- | --- | --- |
| Auth/Profile | Hồ sơ của mình | Hồ sơ của mình | Hồ sơ của mình | Hồ sơ của mình |
| User/RBAC | Không | Không | Quản lý user giới hạn | Toàn quyền |
| Service | Xem active | Tạo/cập nhật | Duyệt/ẩn/xóa | Toàn quyền |
| Cart/Booking | Giỏ và booking của mình | Xem/xử lý | Xem/xử lý | Toàn quyền |
| Payment | Tạo direct payment, upload proof | Xác nhận thu tiền | Xác nhận/đối soát | Toàn quyền |
| Refund | Yêu cầu refund | Xử lý theo quyền | Duyệt/xử lý | Toàn quyền |
| Promotion/Voucher | Áp dụng | Tạo/cập nhật | Quản lý | Toàn quyền |
| Support | Ticket của mình | Trả lời/phân công | Quản lý | Toàn quyền |
| Report/Audit/Settings | Không | Giới hạn | Có | Toàn quyền |

# 6. Mã lỗi chuẩn

| HTTP | Code | Khi nào dùng |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Body/query không hợp lệ |
| 400 | INVALID_STATE_TRANSITION | Chuyển trạng thái không hợp lệ |
| 400 | CART_EMPTY | Checkout giỏ rỗng |
| 400 | CART_ITEM_NOT_AVAILABLE | Item hết chỗ/phòng/ghế |
| 400 | VOUCHER_INVALID | Voucher không hợp lệ |
| 400 | VOUCHER_EXPIRED | Voucher hết hạn |
| 400 | VOUCHER_USAGE_LIMIT_REACHED | Voucher hết lượt |
| 400 | PAYMENT_AMOUNT_MISMATCH | Số tiền xác nhận khác số tiền payment |
| 400 | PAYMENT_ALREADY_CONFIRMED | Payment đã success/reconciled |
| 400 | REFUND_NOT_ALLOWED | Booking/payment không đủ điều kiện refund |
| 401 | AUTH_INVALID_CREDENTIALS | Sai email/password |
| 401 | AUTH_EMAIL_NOT_VERIFIED | Chưa xác thực email |
| 401 | AUTH_TOKEN_EXPIRED | Access token hết hạn |
| 403 | FORBIDDEN | Không có quyền |
| 404 | RESOURCE_NOT_FOUND | Không tìm thấy tài nguyên |
| 409 | DUPLICATE_RESOURCE | Trùng email/slug/code |
| 429 | RATE_LIMITED | Quá nhiều request |
| 500 | INTERNAL_ERROR | Lỗi hệ thống |

# 7. Ghi chú triển khai ExpressJS

- Route public và route admin nên tách file: auth.routes.js, service.routes.js, admin.service.routes.js, booking.routes.js, payment.routes.js...
- Middleware bắt buộc: requestId, rateLimit, authRequired, requireRole, requirePermission, validateBody, errorHandler.
- Các API ghi dữ liệu quan trọng phải dùng DB transaction: checkout, confirm payment, cancel booking, approve refund, mark refund success.
- Idempotency-Key nên lưu vào bảng hoặc cache để chống double-submit khi checkout/payment/refund.
- Direct payment proof có thể lưu tạm trong payments.raw_response.proof để không cần thêm bảng mới ở MVP.
- Không lưu dữ liệu nhạy cảm thẻ/CVV; giai đoạn này không có cổng thanh toán nên không cần webhook/IPN.
- Frontend nên gọi /services/filter-options, /payment-methods/direct, /settings/public để tránh hard-code dữ liệu hiển thị.

**Các API payment gateway cố tình chưa đưa vào MVP**

```
POST /payments/vnpay/create-url
GET  /payments/vnpay/return
POST /payments/vnpay/ipn
POST /payments/momo/create-url
POST /payments/momo/webhook
POST /payments/provider/reconcile
```

Khi tích hợp sau này, chỉ bổ sung provider=vnpay/momo và giữ nguyên booking/payment/refund history hiện tại.
