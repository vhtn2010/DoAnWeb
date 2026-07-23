# 1. Quy ước thiết kế

Database đề xuất dùng PostgreSQL trên Supabase.

**Quy ước chung:**

| Quy ước | Mô tả |
| --- | --- |
| Khóa chính | UUID với gen_random_uuid() |
| Tiền tệ | NUMERIC(14,2) |
| Thời gian | TIMESTAMPTZ |
| Dữ liệu mở rộng | JSONB cho metadata, snapshot dịch vụ, payload thanh toán khi thật sự cần |
| Xóa dữ liệu | Ưu tiên soft delete bằng deleted_at, không xóa vật lý các bảng nghiệp vụ quan trọng |
| Mã định danh nghiệp vụ | Dùng thêm service_code, booking_code, payment_code, refund_code, voucher_code, ticket_code |
| Audit | Giữ created_at, updated_at ở các bảng chính; chỉ dùng created_by, updated_by khi thật sự cần |
| Bảo mật thanh toán | Không lưu số thẻ, CVV, dữ liệu nhạy cảm PCI; chỉ lưu mã giao dịch từ cổng thanh toán |
| Phân quyền | Áp dụng RBAC thông qua roles, permissions, role_permissions |
| Tinh gọn MVP | Giữ nguyên 25 bảng nhưng loại bỏ các thuộc tính chưa cần thiết để giảm thời gian phát triển |

**Các quyết định tinh gọn chính:**

| Nội dung tinh gọn | Cách xử lý |
| --- | --- |
| Xác thực điện thoại | Bỏ phone_verified_at, chỉ xác thực email bằng email_verified_at |
| Số điện thoại người dùng | Vẫn giữ phone nhưng chỉ dùng để liên hệ, không bắt buộc unique |
| MFA/2FA | Bỏ ở MVP để giảm độ phức tạp, có thể bổ sung sau cho Admin/System Admin |
| Thông tin cá nhân phụ | Bỏ date_of_birth, gender khỏi users nếu chưa dùng đến nghiệp vụ chính |
| Log người dùng | Bỏ old_data, new_data; chỉ giữ metadata để ghi dữ liệu cần thiết |
| Service rating | Tính động từ `service_reviews`; mỗi booking item chỉ được đánh giá một lần |
| Service comments | Lưu riêng trong `service_comments`; không yêu cầu booking và không tham gia tính điểm sao |
| Khách sạn | Bỏ latitude, longitude nếu chưa làm bản đồ |
| Vé máy bay/vé tàu | Bỏ các thông tin phụ như hành lý, số toa nếu chưa cần |
| Booking amount | Bỏ tax_amount, fee_amount ở MVP; chỉ giữ subtotal_amount, discount_amount, total_amount |
| Payment payload | Bỏ raw_request; giữ raw_response để lưu kết quả trả về/webhook |
| Support attachment | Bỏ attachments trong support_replies nếu MVP chưa hỗ trợ file đính kèm |
| Email log | Bỏ payload nếu chưa cần lưu toàn bộ dữ liệu gửi email |

# 2. Danh mục trạng thái nghiệp vụ

Các thuộc tính dạng nhiều trạng thái nên triển khai bằng ENUM hoặc bảng danh mục. Với hệ thống cần triển khai nhanh, nên dùng PostgreSQL ENUM cho các trạng thái lõi ổn định.

## 2.1. user_status

Dùng cho users.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| pending_verification | Người dùng đã đăng ký nhưng chưa xác thực email |
| active | Tài khoản hoạt động bình thường |
| locked | Bị khóa tạm do lỗi bảo mật, ví dụ đăng nhập sai nhiều lần |
| suspended | Bị tạm ngưng bởi Admin/System Admin |
| disabled | Bị vô hiệu hóa, không được đăng nhập |
| deleted | Đã xóa mềm |

**Ghi chú tinh gọn:**

Hệ thống chỉ xác thực email, không xác thực số điện thoại để giảm độ phức tạp triển khai.

## 2.2. service_type

Dùng cho services.service_type, cart_items.service_type, booking_items.service_type.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| tour | Tour du lịch |
| hotel | Khách sạn |
| room | Loại phòng |
| flight | Vé/chuyến bay |
| train | Vé/chuyến tàu |
| combo | Gói dịch vụ kết hợp |

## 2.3. service_status

Dùng cho services.status, room_types.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| draft | Dịch vụ đang soạn, chưa công khai |
| pending_review | Dịch vụ chờ Admin duyệt |
| active | Đang hiển thị và cho phép đặt |
| hidden | Tạm ẩn khỏi giao diện khách hàng |
| sold_out | Hết chỗ/hết phòng/hết vé |
| expired | Hết hạn kinh doanh |
| archived | Lưu trữ, không còn bán |
| deleted | Đã xóa mềm |

## 2.4. cart_status

Dùng cho carts.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| active | Giỏ hàng đang sử dụng |
| converted | Đã chuyển thành booking |
| abandoned | Khách bỏ giỏ hàng |
| expired | Giỏ hàng hết hiệu lực |

## 2.5. booking_status

Dùng cho bookings.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| pending_payment | Đơn đã tạo, đang chờ thanh toán |
| payment_processing | Cổng thanh toán đang xử lý |
| paid | Đã thanh toán thành công |
| confirmed | Đã xác nhận dịch vụ/phòng/vé |
| in_progress | Dịch vụ đang diễn ra |
| completed | Dịch vụ đã hoàn tất |
| cancel_requested | Khách yêu cầu hủy |
| cancelled | Đơn đã hủy |
| refund_pending | Đang chờ hoàn tiền |
| partially_refunded | Đã hoàn tiền một phần |
| refunded | Đã hoàn tiền toàn bộ |
| failed | Đơn thất bại |
| expired | Quá hạn thanh toán hoặc giữ chỗ |

## 2.6. booking_item_status

Dùng cho booking_items.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| pending | Dịch vụ trong đơn đang chờ xử lý |
| confirmed | Dịch vụ đã được xác nhận |
| cancelled | Dịch vụ đã bị hủy |
| completed | Dịch vụ đã hoàn tất |
| refunded | Dịch vụ đã hoàn tiền |
| failed | Dịch vụ xử lý thất bại |

## 2.7. payment_status

Dùng cho payments.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| initiated | Backend đã tạo giao dịch |
| pending | Chờ người dùng thanh toán |
| processing | Cổng thanh toán đang xử lý |
| success | Thanh toán thành công |
| failed | Thanh toán thất bại |
| cancelled | Người dùng hủy thanh toán |
| expired | Link thanh toán hết hạn |
| partially_refunded | Đã hoàn tiền một phần |
| refunded | Đã hoàn tiền toàn bộ |
| reconciled | Đã đối soát với cổng thanh toán |

## 2.8. refund_status

Dùng cho refunds.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| requested | Có yêu cầu hoàn tiền |
| approved | Admin đã duyệt |
| rejected | Bị từ chối hoàn tiền |
| processing | Đang gửi lệnh hoàn tiền |
| success | Hoàn tiền thành công |
| failed | Hoàn tiền thất bại |
| cancelled | Yêu cầu hoàn tiền bị hủy |

## 2.9. promotion_status

Dùng cho promotions.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| draft | Chương trình đang soạn |
| active | Đang áp dụng |
| paused | Tạm dừng |
| expired | Hết hạn |
| cancelled | Đã hủy |

## 2.10. voucher_status

Dùng cho vouchers.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| active | Mã đang sử dụng được |
| disabled | Bị tắt thủ công |
| used_up | Đã hết lượt sử dụng |
| expired | Đã hết hạn |

## 2.11. support_ticket_status

Dùng cho support_tickets.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| open | Khách vừa gửi yêu cầu |
| assigned | Đã giao cho nhân viên |
| waiting_customer | Đang chờ khách phản hồi |
| waiting_staff | Đang chờ nhân viên phản hồi |
| resolved | Đã xử lý xong |
| closed | Đã đóng ticket |
| spam | Tin nhắn rác/không hợp lệ |

## 2.12. notification_status

Dùng cho notifications.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| queued | Đang chờ gửi |
| sent | Đã gửi |
| delivered | Người dùng/thiết bị đã nhận |
| read | Người dùng đã đọc |
| failed | Gửi thất bại |

## 2.13. email_status

Dùng cho email_logs.status.

| Giá trị | Ý nghĩa nghiệp vụ |
| --- | --- |
| queued | Chờ gửi |
| sent | Đã gửi sang nhà cung cấp email |
| delivered | Email đã đến máy chủ nhận |
| opened | Người nhận đã mở email |
| bounced | Email bị trả lại |
| spam_reported | Người nhận báo spam |
| failed | Gửi thất bại |

# 3. Thiết kế bảng dữ liệu

Tổng số bảng vẫn giữ nguyên: 25 bảng.

## 3.1. User Module và RBAC

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 1 | users | Lưu thông tin tài khoản người dùng |
| 2 | roles | Quản lý vai trò |
| 3 | permissions | Quản lý quyền |
| 4 | role_permissions | Gán quyền cho vai trò |
| 5 | user_logs | Ghi nhật ký hoạt động |

### Bảng users

Lưu thông tin tài khoản người dùng: Customer, Staff, Admin, System Admin.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh người dùng |
| role_id | UUID | FK → roles.id, NOT NULL | Vai trò chính của người dùng |
| email | CITEXT | UNIQUE, NOT NULL | Email đăng nhập |
| phone | VARCHAR(20) | NULL | Số điện thoại liên hệ, không dùng để xác thực |
| password_hash | TEXT | NOT NULL | Mật khẩu đã hash bằng bcrypt/Argon2 |
| full_name | VARCHAR(150) | NOT NULL | Họ tên |
| avatar_url | TEXT | NULL | Ảnh đại diện |
| status | user_status | ENUM, NOT NULL | Trạng thái tài khoản |
| email_verified_at | TIMESTAMPTZ | NULL | Thời điểm xác thực email |
| last_login_at | TIMESTAMPTZ | NULL | Lần đăng nhập gần nhất |
| is_system_protected | BOOLEAN | NOT NULL, DEFAULT false | Tài khoản gốc không được xóa |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |
| deleted_at | TIMESTAMPTZ | NULL | Xóa mềm |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| phone_verified_at | Không xác thực điện thoại trong MVP |
| mfa_enabled | Chưa triển khai 2FA trong MVP |
| mfa_secret_encrypted | Chưa triển khai 2FA trong MVP |
| date_of_birth | Chưa bắt buộc cho tài khoản, thông tin hành khách lưu ở booking |
| gender | Chưa bắt buộc cho tài khoản, nếu cần lưu trong booking_items.traveller_info |
| phone UNIQUE | Số điện thoại chỉ dùng liên hệ, không dùng đăng nhập/xác thực |

**Ghi chú tiến hóa:**

Nếu sau này cần bảo mật cao hơn, có thể bổ sung lại 2FA cho Admin/System Admin. Nếu cần xác thực số điện thoại, có thể bổ sung lại phone_verified_at.

### Bảng roles

Quản lý vai trò người dùng.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh vai trò |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Ví dụ: customer, staff, admin, system_admin |
| name | VARCHAR(100) | NOT NULL | Tên hiển thị |
| description | TEXT | NULL | Mô tả vai trò |
| level | SMALLINT | NOT NULL | Cấp quyền, số càng lớn quyền càng cao |
| is_system_role | BOOLEAN | DEFAULT false | Vai trò hệ thống không được xóa |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |

**Vai trò mặc định:**

| Role | Ý nghĩa |
| --- | --- |
| customer | Khách hàng |
| staff | Nhân viên vận hành |
| admin | Quản trị viên nghiệp vụ |
| system_admin | Quản trị hệ thống, toàn quyền |

### Bảng permissions

Quản lý danh sách quyền trong hệ thống.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh quyền |
| code | VARCHAR(100) | UNIQUE, NOT NULL | Ví dụ: booking.read_all, service.create |
| module | VARCHAR(50) | NOT NULL | Module áp dụng quyền |
| resource | VARCHAR(50) | NOT NULL | Tài nguyên được thao tác |
| action | VARCHAR(50) | NOT NULL | create, read, update, delete, approve, export, refund |
| description | TEXT | NULL | Mô tả quyền |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

**Ghi chú tinh gọn:**

### Bảng này không nên tinh gọn thêm vì đây là phần cốt lõi để đảm bảo RBAC đúng chuẩn.

### Bảng role_permissions

Gán quyền cho vai trò.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| role_id | UUID | PK, FK → roles.id | Vai trò |
| permission_id | UUID | PK, FK → permissions.id | Quyền |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày gán quyền |

**Khóa chính kép:**

PRIMARY KEY (role_id, permission_id)

**Ghi chú tinh gọn:**

### Bảng này không nên tinh gọn thêm vì là bảng trung gian bắt buộc của RBAC.

### Bảng user_logs

Ghi vết đăng nhập, cập nhật dữ liệu, thao tác Admin/Staff.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh log |
| user_id | UUID | FK → users.id, NULL | Người thực hiện, null nếu hệ thống |
| action | VARCHAR(100) | NOT NULL | Ví dụ: login, logout, service.update, booking.cancel |
| entity_name | VARCHAR(100) | NULL | Tên bảng/tài nguyên bị tác động |
| entity_id | UUID | NULL | ID bản ghi bị tác động |
| ip_address | INET | NULL | IP người dùng |
| user_agent | TEXT | NULL | Thiết bị/trình duyệt |
| metadata | JSONB | NULL | Chi tiết mở rộng |
| created_at | TIMESTAMPTZ | NOT NULL | Thời điểm phát sinh |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| old_data | MVP chưa cần lưu toàn bộ dữ liệu trước khi thay đổi |
| new_data | MVP chưa cần lưu toàn bộ dữ liệu sau khi thay đổi |

**Ghi chú:**

Nếu cần audit sâu hơn sau này, có thể bổ sung lại old_data, new_data.

## 3.2. Service Module

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 6 | services | Lưu thông tin chung của tất cả dịch vụ |
| 7 | tour_details | Lưu thông tin riêng của tour |
| 8 | hotel_details | Lưu thông tin riêng của khách sạn |
| 9 | room_types | Lưu loại phòng khách sạn |
| 10 | flight_details | Lưu thông tin chuyến bay/vé máy bay |
| 11 | train_details | Lưu thông tin chuyến tàu/vé tàu |
| 12 | service_images | Lưu hình ảnh dịch vụ |

Thiết kế phần dịch vụ theo mô hình:

```text
services
├── tour_details
├── hotel_details
│ └── room_types
├── flight_details
├── train_details
└── service_images
```

### Bảng services

### Bảng lõi cho mọi loại dịch vụ.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh dịch vụ |
| service_code | VARCHAR(30) | UNIQUE, NOT NULL | Mã dịch vụ nội bộ |
| service_type | service_type | ENUM, NOT NULL | Loại dịch vụ |
| title | VARCHAR(255) | NOT NULL | Tên dịch vụ |
| slug | VARCHAR(280) | UNIQUE, NOT NULL | URL slug |
| short_description | TEXT | NULL | Mô tả ngắn |
| description | TEXT | NULL | Mô tả chi tiết |
| provider_name | VARCHAR(200) | NULL | Tên nhà cung cấp/đối tác |
| location_text | VARCHAR(255) | NULL | Địa điểm hiển thị |
| base_price | NUMERIC(14,2) | NOT NULL | Giá gốc hoặc giá từ |
| sale_price | NUMERIC(14,2) | NULL | Giá khuyến mãi |
| currency | CHAR(3) | NOT NULL, DEFAULT VND | Loại tiền |
| status | service_status | ENUM, NOT NULL | Trạng thái dịch vụ |
| cancellation_policy | TEXT | NULL | Chính sách hủy/hoàn |
| metadata | JSONB | NULL | Dữ liệu mở rộng |
| created_by | UUID | FK → users.id, NULL | Người tạo |
| updated_by | UUID | FK → users.id, NULL | Người cập nhật |
| approved_by | UUID | FK → users.id, NULL | Người duyệt |
| approved_at | TIMESTAMPTZ | NULL | Thời điểm duyệt |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |
| deleted_at | TIMESTAMPTZ | NULL | Xóa mềm |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| rating_average | Tính động từ `service_reviews`, không lưu trùng trên `services` |
| rating_count | Tính động từ `service_reviews`, không lưu trùng trên `services` |

**Ghi chú tiến hóa:**

Đánh giá tour được lưu trong `service_reviews`. Điểm trung bình và tổng số đánh giá
được tổng hợp khi đọc để tránh dữ liệu bị lệch giữa hai bảng.

### Bảng tour_details

Thông tin riêng của tour.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| service_id | UUID | PK, FK → services.id | Dịch vụ loại tour |
| departure_location | VARCHAR(255) | NOT NULL | Nơi khởi hành |
| destination_location | VARCHAR(255) | NOT NULL | Điểm đến chính |
| duration_days | SMALLINT | NOT NULL | Số ngày |
| duration_nights | SMALLINT | NOT NULL | Số đêm |
| transport_type | transport_type | ENUM, NOT NULL | bus, flight, train, car, ship, mixed |
| max_group_size | INTEGER | NULL | Số khách tối đa |
| departure_schedule | JSONB | NULL | Danh sách ngày khởi hành |
| itinerary | JSONB | NULL | Lịch trình từng ngày |
| included_services | TEXT | NULL | Dịch vụ bao gồm |
| excluded_services | TEXT | NULL | Dịch vụ không bao gồm |
| terms | TEXT | NULL | Điều khoản tour |

**transport_type có nhiều trạng thái nghiệp vụ:**

| Giá trị | Ý nghĩa |
| --- | --- |
| bus | Di chuyển bằng xe khách/xe du lịch |
| flight | Có sử dụng máy bay |
| train | Có sử dụng tàu hỏa |
| car | Xe riêng/ô tô |
| ship | Tàu thủy/du thuyền |
| mixed | Kết hợp nhiều phương tiện |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| min_group_size | MVP chưa cần xử lý điều kiện gom đoàn tối thiểu |

### Bảng hotel_details

Thông tin riêng của khách sạn.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| service_id | UUID | PK, FK → services.id | Dịch vụ loại hotel |
| star_rating | NUMERIC(2,1) | CHECK 0–5 | Hạng sao |
| address | TEXT | NOT NULL | Địa chỉ |
| checkin_time | TIME | NOT NULL | Giờ nhận phòng |
| checkout_time | TIME | NOT NULL | Giờ trả phòng |
| amenities | JSONB | NULL | Tiện ích khách sạn |
| hotel_policy | TEXT | NULL | Chính sách lưu trú |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| latitude | MVP chưa cần bản đồ/tọa độ |
| longitude | MVP chưa cần bản đồ/tọa độ |

### Bảng room_types

Mỗi loại phòng có thể được booking.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Loại phòng |
| hotel_service_id | UUID | FK → services.id, NOT NULL | Khách sạn sở hữu phòng |
| name | VARCHAR(150) | NOT NULL | Tên loại phòng |
| bed_type | VARCHAR(100) | NULL | King, Queen, Twin... |
| max_adults | SMALLINT | NOT NULL | Số người lớn tối đa |
| max_children | SMALLINT | DEFAULT 0 | Số trẻ em tối đa |
| total_rooms | INTEGER | NOT NULL | Tổng số phòng thuộc loại này |
| available_rooms | INTEGER | NOT NULL | Số phòng còn khả dụng |
| base_price | NUMERIC(14,2) | NOT NULL | Giá phòng cơ bản |
| description | TEXT | NULL | Mô tả phòng |
| status | service_status | ENUM, NOT NULL | Trạng thái loại phòng |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| room_size_sqm | Chưa bắt buộc cho nghiệp vụ đặt phòng |
| amenities | Tiện ích có thể mô tả trong description hoặc hotel_details.amenities ở MVP |

### Bảng flight_details

Thông tin chuyến bay/vé máy bay.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh chuyến bay |
| service_id | UUID | FK → services.id, NOT NULL | Dịch vụ loại flight |
| airline_name | VARCHAR(150) | NOT NULL | Hãng bay |
| flight_number | VARCHAR(30) | NOT NULL | Số hiệu chuyến bay |
| departure_airport | VARCHAR(150) | NOT NULL | Sân bay đi |
| arrival_airport | VARCHAR(150) | NOT NULL | Sân bay đến |
| departure_at | TIMESTAMPTZ | NOT NULL | Thời gian khởi hành |
| arrival_at | TIMESTAMPTZ | NOT NULL | Thời gian đến |
| cabin_class | cabin_class | ENUM, NOT NULL | Hạng vé |
| seats_total | INTEGER | NOT NULL | Tổng số ghế |
| seats_available | INTEGER | NOT NULL | Số ghế còn lại |
| fare_price | NUMERIC(14,2) | NOT NULL | Giá vé |
| status | transport_schedule_status | ENUM, NOT NULL | open, full, cancelled, departed, completed |

**cabin_class có nhiều trạng thái:**

| Giá trị | Ý nghĩa |
| --- | --- |
| economy | Phổ thông |
| premium_economy | Phổ thông đặc biệt |
| business | Thương gia |
| first | Hạng nhất |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| baggage_allowance | Chưa bắt buộc ở MVP, có thể mô tả trong services.description |

### Bảng train_details

Thông tin chuyến tàu/vé tàu.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh chuyến tàu |
| service_id | UUID | FK → services.id, NOT NULL | Dịch vụ loại train |
| train_number | VARCHAR(30) | NOT NULL | Số hiệu tàu |
| departure_station | VARCHAR(150) | NOT NULL | Ga đi |
| arrival_station | VARCHAR(150) | NOT NULL | Ga đến |
| departure_at | TIMESTAMPTZ | NOT NULL | Thời gian khởi hành |
| arrival_at | TIMESTAMPTZ | NOT NULL | Thời gian đến |
| seat_class | seat_class | ENUM, NOT NULL | Loại ghế/giường |
| seats_total | INTEGER | NOT NULL | Tổng số ghế |
| seats_available | INTEGER | NOT NULL | Số ghế còn |
| fare_price | NUMERIC(14,2) | NOT NULL | Giá vé |
| status | transport_schedule_status | ENUM, NOT NULL | open, full, cancelled, departed, completed |

**seat_class có nhiều trạng thái:**

| Giá trị | Ý nghĩa |
| --- | --- |
| hard_seat | Ghế cứng |
| soft_seat | Ghế mềm |
| sleeper | Giường nằm |
| vip | Khoang/ghế cao cấp |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| operator_name | MVP chưa cần quản lý đơn vị vận hành chi tiết |
| carriage_no | Chưa bắt buộc nếu chưa chọn ghế/toa cụ thể |

### Bảng service_images

Lưu hình ảnh dịch vụ.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Định danh ảnh |
| service_id | UUID | FK → services.id, NOT NULL | Dịch vụ |
| image_url | TEXT | NOT NULL | URL ảnh |
| cloudinary_public_id | VARCHAR(255) | UNIQUE, NULL | Public ID Cloudinary |
| alt_text | VARCHAR(255) | NULL | Mô tả ảnh cho SEO/accessibility |
| sort_order | INTEGER | DEFAULT 0 | Thứ tự hiển thị |
| is_primary | BOOLEAN | DEFAULT false | Ảnh đại diện chính |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| created_by | Có thể truy vết qua user_logs nếu cần |

## 3.3. Booking Module

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 13 | carts | Lưu giỏ hàng của khách hàng |
| 14 | cart_items | Lưu chi tiết dịch vụ trong giỏ hàng |
| 15 | bookings | Lưu thông tin đơn đặt |
| 16 | booking_items | Lưu chi tiết từng dịch vụ trong đơn |
| 17 | booking_status_histories | Lưu lịch sử thay đổi trạng thái đơn |

### Bảng carts

Lưu giỏ hàng của khách hàng.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Giỏ hàng |
| user_id | UUID | FK → users.id, NOT NULL | Chủ giỏ hàng |
| status | cart_status | ENUM, NOT NULL | Trạng thái giỏ hàng |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |

**Ghi chú tinh gọn:**

### Bảng này đã gọn, không nên bỏ thêm thuộc tính.

### Bảng cart_items

Chi tiết dịch vụ trong giỏ hàng.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Dòng giỏ hàng |
| cart_id | UUID | FK → carts.id, NOT NULL | Giỏ hàng |
| service_id | UUID | FK → services.id, NOT NULL | Dịch vụ |
| service_type | service_type | ENUM, NOT NULL | Snapshot loại dịch vụ |
| reference_id | UUID | NULL | ID phòng/chuyến bay/chuyến tàu nếu có |
| start_at | TIMESTAMPTZ | NULL | Thời gian bắt đầu dùng dịch vụ |
| end_at | TIMESTAMPTZ | NULL | Thời gian kết thúc dùng dịch vụ |
| quantity | INTEGER | NOT NULL | Số lượng |
| unit_price_snapshot | NUMERIC(14,2) | NOT NULL | Giá tại thời điểm thêm vào giỏ |
| options | JSONB | NULL | Lựa chọn bổ sung |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày thêm |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| updated_at | Dòng giỏ hàng MVP có thể xóa/thêm lại thay vì theo dõi cập nhật chi tiết |

### Bảng bookings

Lưu thông tin đơn đặt dịch vụ.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Booking |
| booking_code | VARCHAR(30) | UNIQUE, NOT NULL | Mã đơn hàng |
| user_id | UUID | FK → users.id, NOT NULL | Khách hàng |
| status | booking_status | ENUM, NOT NULL | Trạng thái đơn hàng |
| contact_name | VARCHAR(150) | NOT NULL | Người liên hệ |
| contact_email | CITEXT | NOT NULL | Email nhận xác nhận |
| contact_phone | VARCHAR(20) | NULL | Số điện thoại liên hệ |
| subtotal_amount | NUMERIC(14,2) | NOT NULL | Tổng tiền trước giảm |
| discount_amount | NUMERIC(14,2) | DEFAULT 0 | Số tiền giảm |
| total_amount | NUMERIC(14,2) | NOT NULL | Tổng thanh toán |
| currency | CHAR(3) | DEFAULT VND | Tiền tệ |
| voucher_id | UUID | FK → vouchers.id, NULL | Voucher đã áp dụng |
| note | TEXT | NULL | Ghi chú khách hàng |
| expires_at | TIMESTAMPTZ | NULL | Hạn thanh toán |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| tax_amount | MVP chưa cần tách riêng thuế |
| fee_amount | MVP chưa cần tách riêng phí xử lý |

**Ghi chú:**

Nếu sau này có yêu cầu báo cáo tài chính chi tiết hơn, có thể bổ sung lại tax_amount, fee_amount.

### Bảng booking_items

Chi tiết từng dịch vụ trong đơn.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Dòng booking |
| booking_id | UUID | FK → bookings.id, NOT NULL | Booking |
| service_id | UUID | FK → services.id, NOT NULL | Dịch vụ |
| service_type | service_type | ENUM, NOT NULL | Loại dịch vụ |
| reference_id | UUID | NULL | ID phòng/chuyến bay/chuyến tàu nếu có |
| title_snapshot | VARCHAR(255) | NOT NULL | Tên dịch vụ tại thời điểm đặt |
| start_at | TIMESTAMPTZ | NULL | Bắt đầu sử dụng |
| end_at | TIMESTAMPTZ | NULL | Kết thúc sử dụng |
| quantity | INTEGER | NOT NULL | Số lượng |
| unit_price | NUMERIC(14,2) | NOT NULL | Đơn giá |
| total_amount | NUMERIC(14,2) | NOT NULL | Thành tiền |
| status | booking_item_status | ENUM, NOT NULL | Trạng thái dòng dịch vụ |
| traveller_info | JSONB | NULL | Thông tin hành khách |
| service_snapshot | JSONB | NOT NULL | Snapshot mô tả, giá, chính sách, nhà cung cấp |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| provider_confirmation_code | MVP chưa cần mã xác nhận từ nhà cung cấp bên ngoài |

**Ghi chú:**

service_snapshot rất quan trọng vì giúp lưu lại dữ liệu dịch vụ tại thời điểm đặt. Khi dịch vụ thay đổi giá, tên hoặc chính sách sau này, đơn cũ vẫn giữ được dữ liệu đúng.

### Bảng booking_status_histories

Lưu lịch sử thay đổi trạng thái đơn hàng.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Lịch sử trạng thái |
| booking_id | UUID | FK → bookings.id, NOT NULL | Booking |
| from_status | booking_status | ENUM, NULL | Trạng thái cũ |
| to_status | booking_status | ENUM, NOT NULL | Trạng thái mới |
| reason | TEXT | NULL | Lý do chuyển trạng thái |
| changed_by | UUID | FK → users.id, NULL | Người đổi; null nếu hệ thống |
| created_at | TIMESTAMPTZ | NOT NULL | Thời điểm đổi |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| metadata | MVP chưa cần lưu thêm dữ liệu mở rộng cho lịch sử trạng thái |

**Ghi chú:**

Không nên bỏ bảng này vì đặc tả yêu cầu theo dõi trạng thái đơn hàng và ghi vết thay đổi.

## 3.4. Payment Module

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 18 | payments | Lưu giao dịch thanh toán |
| 19 | refunds | Lưu giao dịch hoàn tiền |

### Bảng payments

Lưu giao dịch thanh toán.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Giao dịch |
| booking_id | UUID | FK → bookings.id, NOT NULL | Booking được thanh toán |
| payment_code | VARCHAR(50) | UNIQUE, NOT NULL | Mã giao dịch nội bộ |
| provider | payment_provider | ENUM, NOT NULL | direct, vnpay, momo, visa, mastercard, bank_transfer |
| payment_method | payment_method | ENUM, NOT NULL | e_wallet, card, qr, bank_transfer, cash_at_office, manual_bank_transfer, staff_collect |
| status | payment_status | ENUM, NOT NULL | Trạng thái thanh toán |
| amount | NUMERIC(14,2) | NOT NULL | Số tiền thanh toán |
| currency | CHAR(3) | DEFAULT VND | Tiền tệ |
| provider_transaction_id | VARCHAR(150) | NULL | Mã giao dịch từ cổng |
| provider_order_id | VARCHAR(150) | NULL | Mã đơn phía cổng |
| checksum_verified | BOOLEAN | DEFAULT false | Đã xác minh checksum |
| raw_response | JSONB | NULL | Payload nhận về/webhook |
| paid_at | TIMESTAMPTZ | NULL | Thời điểm thanh toán thành công |
| expired_at | TIMESTAMPTZ | NULL | Hết hạn thanh toán |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| payment_url | Có thể sinh ở backend, không bắt buộc lưu DB |
| raw_request | MVP chưa cần lưu payload gửi đi, chỉ cần lưu kết quả trả về |

**Ghi chú:**

Vẫn giữ raw_response và checksum_verified để hỗ trợ kiểm tra kết quả từ VNPAY/MoMo.

### Bảng refunds

Lưu giao dịch hoàn tiền.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Giao dịch hoàn tiền |
| refund_code | VARCHAR(50) | UNIQUE, NOT NULL | Mã hoàn tiền nội bộ |
| booking_id | UUID | FK → bookings.id, NOT NULL | Booking được hoàn |
| payment_id | UUID | FK → payments.id, NOT NULL | Giao dịch thanh toán gốc |
| status | refund_status | ENUM, NOT NULL | Trạng thái hoàn tiền |
| amount | NUMERIC(14,2) | NOT NULL | Số tiền hoàn |
| reason | TEXT | NOT NULL | Lý do hoàn |
| requested_by | UUID | FK → users.id, NULL | Người yêu cầu |
| approved_by | UUID | FK → users.id, NULL | Người duyệt |
| provider_refund_id | VARCHAR(150) | NULL | Mã hoàn tiền từ cổng |
| raw_response | JSONB | NULL | Payload từ cổng |
| processed_at | TIMESTAMPTZ | NULL | Thời điểm hoàn tất |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| approved_at | Có thể suy ra gần đúng qua updated_at hoặc log trạng thái ở MVP |

## 3.5. Promotion Module

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 20 | promotions | Lưu chương trình khuyến mãi |
| 21 | vouchers | Lưu mã giảm giá |

### Bảng promotions

Lưu chương trình khuyến mãi.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Chiến dịch |
| name | VARCHAR(200) | NOT NULL | Tên chương trình |
| description | TEXT | NULL | Mô tả |
| status | promotion_status | ENUM, NOT NULL | Trạng thái chương trình |
| valid_from | TIMESTAMPTZ | NOT NULL | Bắt đầu |
| valid_to | TIMESTAMPTZ | NOT NULL | Kết thúc |
| target_service_type | service_type | NULL | Áp dụng cho loại dịch vụ nào |
| created_by | UUID | FK → users.id, NULL | Người tạo |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| target_rule | MVP chỉ cần áp dụng theo loại dịch vụ; điều kiện phức tạp để giai đoạn sau |

### Bảng vouchers

Lưu mã giảm giá.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Voucher |
| promotion_id | UUID | FK → promotions.id, NOT NULL | Chương trình khuyến mãi |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Mã voucher |
| discount_type | discount_type | ENUM, NOT NULL | percent, fixed_amount |
| discount_value | NUMERIC(14,2) | NOT NULL | Giá trị giảm |
| max_discount_amount | NUMERIC(14,2) | NULL | Mức giảm tối đa |
| min_order_amount | NUMERIC(14,2) | DEFAULT 0 | Giá trị đơn tối thiểu |
| usage_limit_total | INTEGER | NULL | Tổng lượt sử dụng |
| usage_limit_per_user | INTEGER | DEFAULT 1 | Lượt dùng mỗi người |
| used_count | INTEGER | DEFAULT 0 | Số lượt đã dùng |
| status | voucher_status | ENUM, NOT NULL | Trạng thái voucher |
| valid_from | TIMESTAMPTZ | NOT NULL | Bắt đầu |
| valid_to | TIMESTAMPTZ | NOT NULL | Kết thúc |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

### Bảng user_saved_vouchers

Lưu quan hệ voucher mà khách hàng chủ động thêm vào tài khoản. Việc lưu mã không tăng `used_count`; lượt dùng chỉ được ghi nhận khi checkout thành công.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| user_id | UUID | PK, FK → users.id | Khách hàng lưu voucher |
| voucher_id | UUID | PK, FK → vouchers.id | Voucher đã lưu |
| saved_at | TIMESTAMPTZ | NOT NULL | Thời điểm lưu mã |

**discount_type có nhiều trạng thái:**

| Giá trị | Ý nghĩa |
| --- | --- |
| percent | Giảm theo phần trăm |
| fixed_amount | Giảm số tiền cố định |

**Ghi chú tinh gọn:**

### Bảng này đã ở mức vừa đủ. Không nên bỏ usage_limit_per_user vì cần tránh một người dùng mã nhiều lần quá giới hạn.

## 3.6. Support Module

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 22 | support_tickets | Lưu yêu cầu tư vấn/hỗ trợ |
| 23 | support_replies | Lưu phản hồi trong ticket |

### Bảng support_tickets

Lưu yêu cầu tư vấn/hỗ trợ.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Ticket |
| ticket_code | VARCHAR(30) | UNIQUE, NOT NULL | Mã ticket |
| user_id | UUID | FK → users.id, NULL | Khách hàng, null nếu khách vãng lai |
| booking_id | UUID | FK → bookings.id, NULL | Booking liên quan |
| service_id | UUID | FK → services.id, NULL | Dịch vụ liên quan |
| customer_name | VARCHAR(150) | NULL | Tên người gửi nếu chưa đăng nhập |
| customer_email | CITEXT | NULL | Email người gửi |
| customer_phone | VARCHAR(20) | NULL | Số điện thoại người gửi |
| subject | VARCHAR(255) | NOT NULL | Chủ đề hỗ trợ |
| status | support_ticket_status | ENUM, NOT NULL | Trạng thái ticket |
| priority | support_ticket_priority | ENUM, NOT NULL, DEFAULT normal | low, normal, high, urgent |
| assigned_to | UUID | FK → users.id, NULL | Nhân viên phụ trách |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |
| updated_at | TIMESTAMPTZ | NOT NULL | Ngày cập nhật |
| closed_at | TIMESTAMPTZ | NULL | Thời điểm đóng ticket |

**Ghi chú tinh gọn:**

### Bảng này đã đủ gọn. Vẫn giữ thông tin khách vãng lai để form liên hệ hoạt động được cả khi khách chưa đăng nhập.

### Bảng support_replies

Lưu phản hồi trong ticket hỗ trợ.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Phản hồi |
| ticket_id | UUID | FK → support_tickets.id, NOT NULL | Ticket |
| sender_id | UUID | FK → users.id, NULL | Người gửi, null nếu khách vãng lai |
| sender_type | sender_type | ENUM, NOT NULL | customer, staff, admin, system |
| message | TEXT | NOT NULL | Nội dung phản hồi |
| is_internal_note | BOOLEAN | DEFAULT false | Ghi chú nội bộ |
| created_at | TIMESTAMPTZ | NOT NULL | Thời điểm gửi |

**sender_type có nhiều trạng thái:**

| Giá trị | Ý nghĩa |
| --- | --- |
| customer | Khách hàng |
| staff | Nhân viên |
| admin | Quản trị viên |
| system | Tin nhắn tự động từ hệ thống |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| attachments | MVP chưa cần hỗ trợ file đính kèm trong ticket |

## 3.7. Notification và Mail Module

**Danh sách bảng:**

| STT | Bảng | Mục đích |
| --- | --- | --- |
| 24 | notifications | Lưu thông báo in-app/push |
| 25 | email_logs | Lưu lịch sử gửi email |

### Bảng notifications

Lưu thông báo in-app/push cho người dùng.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Thông báo |
| user_id | UUID | FK → users.id, NULL | Người nhận; null nếu broadcast |
| title | VARCHAR(255) | NOT NULL | Tiêu đề |
| body | TEXT | NOT NULL | Nội dung |
| type | notification_type | ENUM, NOT NULL | booking_status, support_reply, promotion, payment, system |
| status | notification_status | ENUM, NOT NULL | Trạng thái gửi/đọc |
| related_entity_name | VARCHAR(100) | NULL | Tên tài nguyên liên quan |
| related_entity_id | UUID | NULL | ID tài nguyên liên quan |
| sent_at | TIMESTAMPTZ | NULL | Thời điểm gửi |
| read_at | TIMESTAMPTZ | NULL | Thời điểm đọc |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| metadata | MVP chưa cần payload mở rộng cho notification |

### Bảng email_logs

Lưu lịch sử gửi email.

| Thuộc tính | Kiểu dữ liệu | Loại thuộc tính | Mô tả |
| --- | --- | --- | --- |
| id | UUID | PK | Log email |
| user_id | UUID | FK → users.id, NULL | Người nhận |
| booking_id | UUID | FK → bookings.id, NULL | Booking liên quan |
| to_email | CITEXT | NOT NULL | Email nhận |
| subject | VARCHAR(255) | NOT NULL | Tiêu đề email |
| template_code | VARCHAR(100) | NULL | Mã template |
| status | email_status | ENUM, NOT NULL | Trạng thái gửi |
| provider | VARCHAR(30) | DEFAULT sendgrid | Nhà cung cấp email |
| provider_message_id | VARCHAR(150) | NULL | Message ID từ nhà cung cấp |
| error_message | TEXT | NULL | Lỗi nếu gửi thất bại |
| sent_at | TIMESTAMPTZ | NULL | Thời điểm gửi |
| created_at | TIMESTAMPTZ | NOT NULL | Ngày tạo |

**Thuộc tính đã tinh gọn:**

| Thuộc tính bỏ | Lý do |
| --- | --- |
| payload | MVP chưa cần lưu toàn bộ dữ liệu gửi email |

# 4. Danh sách 25 bảng sau khi tinh gọn thuộc tính

Tổng số bảng vẫn giữ nguyên: 25 bảng.

| STT | Bảng | Module | Ghi chú tinh gọn |
| --- | --- | --- | --- |
| 1 | users | User & RBAC | Bỏ xác thực điện thoại, bỏ MFA, bỏ DOB/gender |
| 2 | roles | User & RBAC | Giữ nguyên |
| 3 | permissions | User & RBAC | Giữ nguyên |
| 4 | role_permissions | User & RBAC | Giữ nguyên |
| 5 | user_logs | User/Admin | Bỏ old_data/new_data |
| 6 | services | Service | Rating được tổng hợp từ `service_reviews` |
| 7 | tour_details | Service | Bỏ min_group_size |
| 8 | hotel_details | Service | Bỏ latitude/longitude |
| 9 | room_types | Service | Bỏ room_size_sqm/amenities |
| 10 | flight_details | Service | Bỏ baggage_allowance |
| 11 | train_details | Service | Bỏ operator_name/carriage_no |
| 12 | service_images | Service | Bỏ created_by |
| 13 | carts | Booking | Giữ nguyên |
| 14 | cart_items | Booking | Bỏ updated_at |
| 15 | bookings | Booking | Bỏ tax_amount/fee_amount |
| 16 | booking_items | Booking | Bỏ provider_confirmation_code |
| 17 | booking_status_histories | Booking | Bỏ metadata |
| 18 | payments | Payment | Bỏ payment_url/raw_request |
| 19 | refunds | Payment | Bỏ approved_at |
| 20 | promotions | Promotion | Bỏ target_rule |
| 21 | vouchers | Promotion | Giữ nguyên phần lõi |
| 22 | support_tickets | Support | Giữ nguyên |
| 23 | support_replies | Support | Bỏ attachments |
| 24 | notifications | Notification | Bỏ metadata |
| 25 | email_logs | Mail | Bỏ payload |

# 5. Ma trận RBAC đề xuất

## 5.1. Quyền mặc định theo vai trò

| Nhóm quyền | Customer | Staff | Admin | System Admin |
| --- | --- | --- | --- | --- |
| Đăng ký/đăng nhập | Có | Có | Có | Có |
| Xác thực email | Có | Có | Có | Có |
| Cập nhật hồ sơ cá nhân | Hồ sơ của mình | Hồ sơ của mình | Hồ sơ của mình | Hồ sơ của mình |
| Quản lý role/permission | Không | Không | Giới hạn | Toàn quyền |
| Xem dịch vụ | Có | Có | Có | Có |
| Thêm/cập nhật dịch vụ | Không | Có | Có | Có |
| Xóa/ẩn dịch vụ | Không | Không hoặc giới hạn | Có | Có |
| Duyệt dịch vụ | Không | Không | Có | Có |
| Tìm kiếm/lọc dịch vụ | Có | Có | Có | Có |
| Giỏ hàng/booking | Booking của mình | Xem/xử lý | Xem/xử lý | Toàn quyền |
| Hủy booking | Booking của mình theo chính sách | Có | Có | Có |
| Thanh toán | Đơn của mình | Xem giao dịch | Quản lý | Toàn quyền |
| Hoàn tiền | Không | Tạo/yêu cầu | Duyệt/xử lý | Toàn quyền |
| Promotion/Voucher | Áp dụng | Tạo/cập nhật giới hạn | Quản lý | Toàn quyền |
| Support | Gửi/xem ticket của mình | Quản lý ticket | Quản lý ticket | Toàn quyền |
| Dashboard/Báo cáo | Không | Không hoặc giới hạn | Có | Có |
| Log tracking | Không | Không | Có | Có |
| System settings | Không | Không | Không hoặc giới hạn | Toàn quyền |

## 5.2. Permission code khuyến nghị

| Module | Permission code |
| --- | --- |
| User | user.read_self, user.update_self, user.read_all, user.update_status |
| RBAC | role.read, role.create, role.update, role.delete, permission.assign |
| Service | service.read, service.create, service.update, service.hide, service.delete, service.approve |
| Booking | booking.create, booking.read_self, booking.read_all, booking.update_status, booking.cancel |
| Payment | payment.create, payment.read_self, payment.read_all, payment.reconcile |
| Refund | refund.request, refund.approve, refund.process, refund.read_all |
| Promotion | promotion.create, promotion.update, promotion.delete, voucher.create, voucher.apply |
| Support | support.create, support.read_self, support.reply, support.assign, support.close |
| Admin | dashboard.read, report.export, audit.read |
| Mail | email_log.read, email.send |
| Notification | notification.create, notification.read_self, notification.broadcast |
| System | system_setting.manage, system_admin.manage |

# 6. RLS Supabase đề xuất

**Các policy quan trọng:**

| Bảng | Policy |
| --- | --- |
| users | User chỉ xem/sửa hồ sơ của mình; Admin/System Admin xem tất cả |
| roles | Chỉ Admin/System Admin đọc; chỉ System Admin sửa |
| permissions | Chỉ Admin/System Admin đọc; chỉ System Admin sửa |
| role_permissions | Chỉ System Admin quản lý |
| user_logs | Chỉ Admin/System Admin xem |
| services | Customer chỉ xem status = active; Staff/Admin xem theo quyền |
| tour_details | Theo quyền truy cập của services cha |
| hotel_details | Theo quyền truy cập của services cha |
| room_types | Theo quyền truy cập của khách sạn cha |
| flight_details | Theo quyền truy cập của services cha |
| train_details | Theo quyền truy cập của services cha |
| service_images | Theo quyền truy cập của services cha |
| carts, cart_items | Customer chỉ thao tác giỏ hàng của mình |
| bookings | Customer chỉ xem booking của mình; Staff/Admin xem theo permission |
| booking_items | Theo quyền truy cập của bookings cha |
| booking_status_histories | Theo quyền truy cập của bookings cha |
| payments | Customer chỉ xem giao dịch thuộc booking của mình; Staff/Admin xem theo quyền |
| refunds | Customer xem refund thuộc booking mình; Staff/Admin xử lý theo permission |
| promotions, vouchers | Customer xem chương trình/voucher hợp lệ; Staff/Admin quản lý theo quyền |
| support_tickets | Customer xem ticket của mình; Staff xem ticket được phân công hoặc toàn bộ nếu có quyền |
| support_replies | Theo quyền truy cập của support_tickets cha |
| notifications | User chỉ xem notification của mình |
| email_logs | Chỉ Staff/Admin xem theo quyền |

# 7. Index và ràng buộc quan trọng

Nên có các index sau:

```sql
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_services_type_status ON services(service_type, status);
CREATE INDEX idx_services_location_text ON services(location_text);
CREATE INDEX idx_services_price ON services(base_price);
CREATE INDEX idx_room_types_hotel_service_id ON room_types(hotel_service_id);
CREATE INDEX idx_flight_details_service_id ON flight_details(service_id);
CREATE INDEX idx_flight_details_departure_at ON flight_details(departure_at);
CREATE INDEX idx_train_details_service_id ON train_details(service_id);
CREATE INDEX idx_train_details_departure_at ON train_details(departure_at);
CREATE INDEX idx_service_images_service_id ON service_images(service_id);
CREATE INDEX idx_carts_user_status ON carts(user_id, status);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_service_id ON cart_items(service_id);
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_booking_items_service_id ON booking_items(service_id);
CREATE INDEX idx_booking_status_histories_booking_id ON booking_status_histories(booking_id);
CREATE INDEX idx_payments_booking_status ON payments(booking_id, status);
CREATE INDEX idx_payments_provider_transaction ON payments(provider_transaction_id);
CREATE INDEX idx_refunds_booking_status ON refunds(booking_id, status);
CREATE INDEX idx_vouchers_code_status ON vouchers(code, status);
CREATE INDEX idx_support_tickets_user_status ON support_tickets(user_id, status);
CREATE INDEX idx_support_tickets_assigned_status ON support_tickets(assigned_to, status);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_email_logs_user_status ON email_logs(user_id, status);
```

Ràng buộc tiền:

```sql
CHECK (subtotal_amount >= 0);
CHECK (discount_amount >= 0);
CHECK (total_amount >= 0);
CHECK (amount > 0);
```

Ràng buộc tồn kho:

```sql
CHECK (available_rooms >= 0);
CHECK (available_rooms <= total_rooms);
CHECK (seats_available >= 0);
CHECK (seats_available <= seats_total);
```

Ràng buộc bảo vệ tài khoản System Admin gốc:

```sql
CHECK (
is_system_protected = false
OR deleted_at IS NULL
)
```

# 8. Luồng nghiệp vụ chính theo database

## 8.1. Đăng ký và xác thực tài khoản

users.status = pending_verification

→ email_logs tạo email xác thực

→ người dùng xác thực email

→ users.email_verified_at được cập nhật

→ users.status = active

**Ghi chú:**

Không xử lý xác thực số điện thoại trong MVP.

## 8.2. Tìm kiếm và xem dịch vụ

services

→ lọc theo service_type, status, location_text, base_price

→ xem chi tiết ở tour_details/hotel_details/room_types/flight_details/train_details

→ hình ảnh lấy từ service_images

## 8.3. Đặt dịch vụ

users

→ carts

→ cart_items

→ bookings

→ booking_items

→ payments

→ booking_status_histories

→ notifications/email_logs

## 8.4. Thanh toán thành công

payments.status = success

→ bookings.status = paid

→ booking_status_histories ghi nhận paid

→ booking_items.status = confirmed

→ email_logs tạo email xác nhận booking

→ notifications tạo thông báo in-app

## 8.5. Hủy và hoàn tiền

bookings.status = cancel_requested

→ refunds.status = requested

→ Admin duyệt hoàn tiền

→ refunds.status = approved/processing/success

→ payments.status = refunded hoặc partially_refunded

→ bookings.status = refunded hoặc cancelled

→ booking_status_histories ghi đầy đủ

# 9. Gợi ý triển khai kỹ thuật

**Nên triển khai thêm các trigger/function sau:**

| Trigger/Function | Mục đích |
| --- | --- |
| set_updated_at() | Tự cập nhật updated_at |
| prevent_delete_system_admin() | Không cho xóa System Admin gốc |
| log_booking_status_change() | Tự ghi booking_status_histories |
| validate_voucher_usage() | Kiểm tra lượt dùng voucher |
| decrease_inventory_after_confirm() | Trừ tồn phòng/ghế/chỗ khi booking xác nhận |
| create_notification_on_booking_change() | Tự tạo thông báo trạng thái đơn |
| create_email_log_on_payment_success() | Tạo email xác nhận sau thanh toán |
| write_user_log() | Ghi log khi Staff/Admin thay đổi dữ liệu quan trọng |
