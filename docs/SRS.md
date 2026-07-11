
<a name="_ezqekuixe77w"></a>**HỆ THỐNG WEBSITE DU LỊCH ĐA DỊCH VỤ NÉT VIỆT (NÉT VIỆT TRAVEL)**
# <a name="_tuw8i07jwfen"></a>**1. Mục đích tài liệu**
Tài liệu này cung cấp một cái nhìn tổng quan về Hệ thống Đặt dịch vụ và Quản lý du lịch trực tuyến, bằng việc mô tả chi tiết các yêu cầu chức năng, yêu cầu phi chức năng, kiến trúc kỹ thuật và các tiêu chuẩn chất lượng liên quan đến toàn bộ hệ thống.

**1.1. Phạm vi MVP**

Trong giai đoạn MVP, hệ thống tập trung vào các chức năng chính:

- Đăng ký, đăng nhập, xác thực email và quản lý hồ sơ người dùng.
- Tìm kiếm, xem chi tiết tour, khách sạn, phòng, vé máy bay, vé tàu và combo.
- Quản lý giỏ hàng, đặt chỗ, theo dõi trạng thái booking.
- Thanh toán trực tiếp/thủ công gồm: thanh toán tiền mặt tại văn phòng, chuyển khoản ngân hàng thủ công, nhân viên thu hộ.
- Khách hàng có thể upload chứng từ thanh toán; Staff/Admin/System Admin xác nhận, từ chối hoặc đánh dấu hết hạn thanh toán; Admin/System Admin thực hiện đối soát nội bộ.
- Quản lý hoàn tiền thủ công theo chính sách.
- Quản lý khuyến mãi, voucher, hỗ trợ khách hàng, upload, thông báo, email, báo cáo, audit và thiết lập hệ thống ở mức cơ bản.
- Các thao tác checkout, tạo payment, xác nhận payment và refund phải sử dụng Idempotency-Key để tránh tạo trùng dữ liệu khi người dùng gửi lại request hoặc hệ thống retry.

Các chức năng chưa thuộc phạm vi MVP:

- Chưa tích hợp VNPAY, MoMo, Visa/Mastercard hoặc payment gateway online.
- Chưa xử lý IPN/Webhook từ cổng thanh toán.
- Chưa triển khai MFA/2FA.
- Chưa cho phép khách vãng lai checkout/thanh toán nếu chưa đăng nhập.
- Chưa lưu số thẻ, CVV hoặc dữ liệu thanh toán nhạy cảm.
# <a name="_1lf0qcyvit4r"></a>**2. Mô tả sơ bộ**
Trong bối cảnh ngành du lịch hiện đại, nhu cầu đi du lịch tự túc, đặt phòng khách sạn, vé máy bay và các tour trải nghiệm trực tuyến của khách hàng ngày càng tăng mạnh. Trên thị trường hiện nay có nhiều nền tảng cung cấp dịch vụ đơn lẻ hoặc các đại lý du lịch trực tuyến (OTA) lớn như Agoda, Booking, Traveloka... Tuy nhiên, các hệ thống này đôi khi vẫn gặp hạn chế trong việc tối ưu hóa các gói dịch vụ kết hợp (Combo Tour + Khách sạn + Vé) mang tính cá nhân hóa cao, hoặc chưa cung cấp một bộ công cụ quản trị tinh gọn, linh hoạt cho các doanh nghiệp lữ hành nội địa tại Việt Nam để tự quản lý kho dữ liệu và tối ưu hóa các chương trình khuyến mãi theo thời gian thực.

Nhận thấy cơ hội phát triển này, hệ thống được xây dựng nhằm tạo ra một giải pháp toàn diện, kết hợp chặt chẽ giữa việc cung cấp nền tảng tìm kiếm, đặt chỗ trực tuyến đa dịch vụ (Tour, Khách sạn, Vé máy bay, Vé tàu) cho khách hàng, và một hệ thống quản trị (Admin Dashboard) mạnh mẽ giúp doanh nghiệp tối ưu hóa quy trình vận hành, quản lý doanh thu, chăm sóc khách hàng và triển khai các chiến dịch marketing hiệu quả.
# <a name="_5dhbvbhmnn5v"></a>**3. Đối tượng sử dụng hệ thống**
**Ghi chú:**

**PUBLIC** là trạng thái truy cập công khai của người dùng chưa đăng nhập. PUBLIC không phải là một loại tài khoản riêng trong hệ thống và không cần tạo mã đối tượng US riêng. Các chức năng PUBLIC chỉ bao gồm những chức năng không yêu cầu đăng nhập như xem thông tin công khai, tìm kiếm dịch vụ, xem chi tiết dịch vụ, xem thông tin thanh toán trực tiếp công khai, đăng ký, xác thực email, gửi lại email xác thực, đăng nhập, refresh token, quên mật khẩu, đặt lại mật khẩu và gửi yêu cầu hỗ trợ công khai.

|**Mã đối tượng**|**Tên đối tượng**|**Mô tả**|
| - | - | - |
|**US-01**|Khách hàng (Customer)|Là người dùng cuối của hệ thống. Khi chưa đăng nhập, người dùng chỉ có thể sử dụng các chức năng công khai. Sau khi đăng ký, xác thực email và đăng nhập, khách hàng có thể quản lý hồ sơ cá nhân, giỏ hàng, áp dụng voucher, tạo booking, tạo yêu cầu thanh toán trực tiếp/thủ công, upload chứng từ thanh toán, xem lịch sử booking/payment/refund của mình, yêu cầu hủy booking và yêu cầu hoàn tiền theo chính sách.|
|**US-02**|Nhân viên (Staff)|Là tài khoản nội bộ được tạo bởi Admin hoặc System Admin theo quyền được cấp. Staff chịu trách nhiệm vận hành dữ liệu dịch vụ, cập nhật phòng/ghế/tồn kho, xử lý booking, kiểm tra payment, hỗ trợ khách hàng và quản lý một số nghiệp vụ theo role/permission đã được cấu hình trong hệ thống.|
|**US-03**|Quản trị viên (Admin)|Là tài khoản quản trị nghiệp vụ. Admin có thể quản lý người dùng nghiệp vụ, dịch vụ, booking, payment, refund, promotion, voucher, support, dashboard, báo cáo, audit, notification và email log theo phạm vi quyền được cấp.|
|**US-04**|Quản trị hệ thống (System Admin)|Là tài khoản có quyền cao nhất trong hệ thống. System Admin phụ trách quản lý role, permission, phân quyền truy cập, cấu hình hệ thống, settings và các thiết lập vận hành. Các tài khoản hoặc vai trò hệ thống được đánh dấu bảo vệ không được xóa.|
# <a name="_yieqk2h9aolw"></a>**4. Mô tả chức năng**
## <a name="_j2iob4fytjaj"></a>**4.1 Yêu cầu chức năng**
### <a name="_qppnjywlciiy"></a>**4.1.1 Phân nhóm chức năng**

|**Mã nhóm chức năng**|**Tên nhóm chức năng**|**Mô tả**|
| - | - | - |
|**FC-01**|**User Module**|Quản lý đăng ký tài khoản khách hàng, xác thực email, gửi lại email xác thực, đăng nhập, đăng xuất, refresh token, quên mật khẩu, đặt lại mật khẩu, đổi email, hồ sơ cá nhân, đổi mật khẩu, avatar và lịch sử hoạt động cá nhân. Tài khoản Staff/Admin được tạo thông qua chức năng quản trị nội bộ, không tự đăng ký qua form công khai.|
|**FC-02**|**Service Module**|Chịu trách nhiệm quản lý toàn bộ kho dữ liệu dịch vụ. Cung cấp chức năng cho phép Staff/Admin thêm mới, cập nhật, xóa thông tin tour, khách sạn, vé máy bay, vé tàu.|
|**FC-03**|**Search Module**|Quản lý các API tra cứu công khai, bao gồm danh mục enum, địa điểm phổ biến, bộ lọc dịch vụ, dịch vụ nổi bật, danh sách dịch vụ đang hoạt động, chi tiết dịch vụ, ảnh dịch vụ, kiểm tra availability, phòng khách sạn, vé máy bay, vé tàu và combo.|
|**FC-04**|**Booking Module**|Quản lý giỏ hàng và quy trình đặt chỗ cho khách hàng đã đăng nhập. Bao gồm lấy giỏ hàng active, tính tổng tiền, thêm/sửa/xóa item, validate giỏ hàng, áp dụng voucher, gỡ voucher, checkout tạo booking, xem danh sách booking, xem chi tiết booking, xem lịch sử trạng thái, yêu cầu hủy booking, xem hóa đơn/tóm tắt booking và cập nhật thông tin liên hệ khi booking chưa được xác nhận.|
|**FC-05**|**Payment Module**|Chịu trách nhiệm xử lý thanh toán trực tiếp/thủ công. Hệ thống hỗ trợ các phương thức thanh toán gồm thanh toán tiền mặt tại văn phòng, chuyển khoản ngân hàng thủ công và nhân viên thu hộ. Người dùng có thể xem thông tin thanh toán trực tiếp công khai. Khách hàng đã đăng nhập tạo payment cho booking và upload chứng từ thanh toán nếu có. Staff/Admin/System Admin kiểm tra chứng từ, xác nhận, từ chối hoặc đánh dấu hết hạn thanh toán. Admin/System Admin thực hiện đối soát nội bộ đối với các payment đã thành công.|
|**FC-06**|**Promotion Module**|Quản lý chương trình khuyến mãi và voucher. Người dùng có thể xem promotion công khai. Khách hàng đã đăng nhập có thể validate voucher với giỏ hàng, áp dụng voucher vào giỏ hàng và gỡ voucher. Staff/Admin/System Admin quản lý promotion và voucher theo quyền được cấp.|
|**FC-07**|**Support Module**|Quản lý yêu cầu hỗ trợ của khách vãng lai và khách hàng đã đăng nhập. Người dùng có thể gửi ticket tư vấn/hỗ trợ kèm thông tin liên hệ, booking hoặc dịch vụ liên quan nếu có. Staff/Admin/System Admin có thể xem, phân công, phản hồi, cập nhật trạng thái và đóng ticket theo quyền được cấp.|
|**FC-08**|**Admin Module**|Cung cấp chức năng quản trị hệ thống và nghiệp vụ, bao gồm quản lý user nghiệp vụ, xem role/permission, quản lý dịch vụ, booking, payment, refund, promotion, voucher, support, dashboard, report, audit log, notification, email log và settings theo quyền được cấp. Việc thay đổi role/permission hệ thống thuộc quyền System Admin.|
|**FC-09**|**Mail Module**|Phụ trách việc gửi email thông báo ra bên ngoài cho người dùng (email xác nhận tạo tài khoản, xác nhận đặt tour, vé, biên lai thanh toán).|
|**FC-10**|**Notification Module**|Quản lý việc đẩy thông báo trực tiếp trên giao diện website (in-app) đến người dùng, giúp họ cập nhật ngay lập tức các thay đổi về trạng thái đơn hàng hay tin nhắn hỗ trợ.|
|<h3><a name="_k8wcjc88k9ng"></a>**FC-11**</h3>|**Upload Module**|Quản lý upload file và hình ảnh thông qua cơ chế ký upload. Hệ thống hỗ trợ tạo chữ ký upload, xác nhận upload hoàn tất và quản lý thông tin sử dụng upload phục vụ hình ảnh dịch vụ, avatar, chứng từ thanh toán và file báo cáo nếu có.|
|<h3><a name="_dl3olks9ys0c"></a>**FC-12**</h3>|**Settings Module**|Quản lý các thiết lập hệ thống, thiết lập công khai, thông tin thanh toán trực tiếp và cấu hình nghiệp vụ. Người dùng có thể đọc các thiết lập công khai. Admin/System Admin quản lý thiết lập công khai, thông tin thanh toán trực tiếp và cấu hình nghiệp vụ theo quyền được cấp. System Admin có quyền cao nhất đối với các thiết lập vận hành hệ thống.|
###
### **4.1.2. Chi tiết chức năng**

|**Mã nhóm chức năng**|**Mã chức năng**|**Mã đối tượng sử dụng**|**Tên chức năng**|**Mô tả**|
| - | - | - | - | - |
|**FC-01**|FC-01-01|PULIC|Đăng ký tài khoản|Người dùng chưa đăng nhập có thể đăng ký tài khoản Customer bằng email, mật khẩu, họ tên và số điện thoại tùy chọn. Sau khi đăng ký, tài khoản ở trạng thái chờ xác thực email.|
||FC-01-02|PUBLIC|Xác thực email|Người dùng xác thực email bằng token được gửi qua email. Sau khi xác thực thành công, tài khoản được kích hoạt và có thể đăng nhập.|
||FC-01-03|PUBLIC,US-01, US-02, US-03, US-04|Đăng nhập / Đăng xuất|Người dùng chưa đăng nhập có thể đăng nhập bằng email và mật khẩu để nhận access token, refresh token và danh sách quyền. Người dùng có refresh token hợp lệ có thể yêu cầu cấp access token mới. Người dùng đã đăng nhập có thể đăng xuất để thu hồi phiên đăng nhập và ghi nhận lịch sử hoạt động.|
||FC-01-04|US-01, US-02, US-03, US-04|Quản lý hồ sơ cá nhân|Người dùng đã đăng nhập có thể xem thông tin cá nhân, cập nhật họ tên, số điện thoại, avatar, đổi mật khẩu và xem lịch sử hoạt động của mình.|
||FC-01-05|US-03, US-04|Xem và quản lý role/permission|Admin/System Admin có thể xem danh sách role và permission. System Admin có thể tạo, cập nhật, xóa role không thuộc nhóm hệ thống và gán lại danh sách permission cho role. Admin chỉ được xem role/permission hoặc thao tác giới hạn theo quyền được cấp|
||FC-01-06|US-03, US-04|Tạo tài khoản nội bộ|Admin/System Admin có thể tạo tài khoản Staff hoặc Admin theo phạm vi quyền được cấp. Tài khoản nội bộ không tự đăng ký qua form công khai.|
|**FC-02**|FC-02-01|US-02, US-03, US-04|Thêm mới dịch vụ|Đối tượng quản trị có thể tạo mới thông tin về tour du lịch, khách sạn, vé máy bay, vé tàu lên hệ thống.|
||FC-02-02|US-02, US-03, US-04|Cập nhật thông tin dịch vụ|Cho phép chỉnh sửa thông tin mô tả, giá cả, lịch trình hoặc hình ảnh của các dịch vụ đang hiện có.|
||FC-02-03|US-03, US-04|Xóa/Ẩn dịch vụ|Đối tượng có quyền xóa hoặc tạm ẩn các dịch vụ không còn hoạt động hoặc hết chỗ.|
|**FC-03**|FC-03-01|PUBLIC,US-01|Tìm kiếm dịch vụ|Người dùng có thể tìm kiếm danh sách dịch vụ đang hoạt động theo loại dịch vụ, từ khóa, địa điểm, khoảng giá, thời gian khởi hành và tiêu chí sắp xếp. Dịch vụ bao gồm tour, khách sạn, phòng, vé máy bay, vé tàu và combo.|
||FC-03-02|PUBLIC,US-01|Bộ lọc nâng cao|Cung cấp bộ lọc theo loại dịch vụ, địa điểm, khoảng giá, hạng phòng/khách sạn, hạng vé, loại ghế, ngày khởi hành, số lượng khách và các tiêu chí phù hợp với từng loại dịch vụ.|
||FC-03-03|PUBLIC,US-01|Xem chi tiết dịch vụ|Người dùng có thể xem chi tiết dịch vụ đang hoạt động, bao gồm thông tin mô tả, lịch trình, giá, hình ảnh, chính sách hủy/hoàn và các thông tin liên quan.|
||FC-03-04|PUBLIC,US-01|Kiểm tra availability|Người dùng có thể kiểm tra tình trạng còn chỗ, còn phòng hoặc còn ghế của dịch vụ theo loại dịch vụ, thời gian sử dụng, mã tham chiếu và số lượng cần đặt.|
|**FC-04**|FC-04-01|US-01|Quản lý giỏ hàng|Khách hàng đã đăng nhập có thể lấy giỏ hàng active, thêm dịch vụ vào giỏ hàng, cập nhật số lượng/thời gian sử dụng/tùy chọn, xóa từng item hoặc xóa toàn bộ giỏ hàng.|
||FC-04-02|US-01|Đặt chỗ (Booking)|Khách hàng đã đăng nhập thực hiện checkout từ giỏ hàng bằng cách cung cấp thông tin liên hệ, danh sách hành khách, voucher nếu có và ghi chú. Hệ thống kiểm tra giá, availability, voucher và tạo booking ở trạng thái chờ thanh toán|
||FC-04-03|US-01, US-02, US-03, US-04|Theo dõi trạng thái đơn hàng|Khách hàng xem danh sách booking, chi tiết booking, item trong booking, lịch sử trạng thái, hóa đơn hoặc bản tóm tắt booking của mình. Staff/Admin/System Admin xem và xử lý booking theo quyền được cấp.|
||FC-04-04|US-01, US-02, US-03, US-04|Hủy hoặc yêu cầu hủy booking|Khách hàng có thể gửi yêu cầu hủy booking theo chính sách. Staff/Admin/System Admin có thể hủy, xác nhận, hoàn tất, đánh dấu hết hạn hoặc cập nhật trạng thái booking theo đúng luồng trạng thái hợp lệ.|
||FC-04-05|` `US-01|Cập nhật thông tin liên hệ booking|Khách hàng có thể cập nhật tên liên hệ, số điện thoại liên hệ và ghi chú khi booking chưa được xác nhận.|
|**FC-05**|FC-05-01|PUBLIC,US-01|Thanh toán trực tuyến/thủ công|Người dùng có thể xem thông tin thanh toán trực tiếp/thủ công được công khai như thông tin văn phòng, ngân hàng hoặc hướng dẫn thanh toán. Khách hàng đã đăng nhập có thể tạo yêu cầu thanh toán cho booking bằng một trong các phương thức: thanh toán tiền mặt tại văn phòng, chuyển khoản ngân hàng thủ công hoặc nhân viên thu hộ. Payment được tạo ở trạng thái pending và chờ Staff/Admin/System Admin kiểm tra, xác nhận|
||FC-05-02|US-01, US-02, US-03, US-04|Xem lịch sử payment|Khách hàng xem danh sách và chi tiết payment thuộc booking của mình. Staff/Admin/System Admin xem danh sách payment, chi tiết payment, chứng từ thanh toán và trạng thái xử lý theo quyền được cấp.|
||FC-05-03|US-01|Upload chứng từ thanh toán|Khách hàng upload ảnh chứng từ chuyển khoản, ghi chú chuyển khoản và mã giao dịch ngân hàng cho payment đang ở trạng thái pending.|
||FC-05-04|US-02, US-03, US-04|Xác nhận hoặc từ chối payment|Staff/Admin/System Admin kiểm tra số tiền thực nhận, thời gian nhận tiền, chứng từ và ghi chú nội bộ để xác nhận hoặc từ chối payment. Khi xác nhận thành công, hệ thống cập nhật trạng thái payment và booking trong cùng một giao dịch xử lý.|
||<h3><a name="_1j27sstm5d5o"></a>**FC-05-05**</h3>|US-01, US-02, US-03, US-04|Hủy hoặc đánh dấu payment hết hạn|Khách hàng có thể hủy payment của mình khi payment còn pending. Staff/Admin/System Admin có thể đánh dấu payment hết hạn hoặc thất bại khi quá thời gian xử lý hoặc thông tin thanh toán không hợp lệ.|
||FC-05-06|US-03, US-04|` `Đối soát nội bộ payment|Admin/System Admin kiểm tra các payment đã thành công và đánh dấu đã đối soát sau khi xác nhận số liệu nội bộ|
||FC-05-07|US-01|Yêu cầu hoàn tiền|Khách hàng gửi yêu cầu hoàn tiền cho booking/payment đủ điều kiện theo chính sách, gồm số tiền yêu cầu hoàn và lý do hoàn tiền.|
||FC-05-08|US-02, US-03, US-04|Xử lý hoàn tiền thủ công|Staff/Admin/System Admin xem danh sách và chi tiết refund. Admin/System Admin duyệt hoặc từ chối refund. Staff/Admin/System Admin cập nhật trạng thái đang xử lý, thành công hoặc thất bại theo kết quả hoàn tiền thực tế.|
|**FC-06**|FC-06-01|US-02, US-03, US-04|Quản lý chương trình khuyến mãi|Staff/Admin/System Admin có thể tạo, cập nhật hoặc đổi trạng thái chương trình khuyến mãi theo quyền được cấp. Admin/System Admin có thể hủy hoặc xóa mềm chương trình khuyến mãi.|
||FC-06-02|US-02, US-03, US-04|Quản lý mã giảm giá (Voucher)|Staff/Admin/System Admin có thể tạo, cập nhật, đổi trạng thái hoặc nhân bản voucher theo quyền được cấp. Admin/System Admin có thể xóa mềm hoặc vô hiệu hóa voucher|
||FC-06-03|US-01|Validate và áp dụng voucher|Khách hàng đã đăng nhập có thể kiểm tra voucher với giỏ hàng, áp dụng voucher vào giỏ hàng và gỡ voucher khỏi giỏ hàng. Việc kiểm tra voucher không làm tăng số lượt sử dụng; số lượt sử dụng chỉ được cập nhật khi checkout thành công.|
||FC-06-04|PUBLIC, US-01|Xem promotion công khai|Người dùng có thể xem danh sách và chi tiết các chương trình khuyến mãi đang được công khai.|
|**FC-07**|FC-07-01|PUBLIC,US-01|Gửi yêu cầu liên hệ/tư vấn|Khách vãng lai hoặc khách hàng đã đăng nhập có thể gửi yêu cầu tư vấn/hỗ trợ bằng thông tin liên hệ, tiêu đề và nội dung. Yêu cầu có thể gắn với booking hoặc dịch vụ nếu có.|
||FC-07-02|US-02, US-03, US-04|Quản lý và phản hồi khách hàng|Staff/Admin/System Admin tiếp nhận, phân công, phản hồi, ghi chú nội bộ, cập nhật trạng thái và đóng ticket hỗ trợ theo quyền được cấp.|
|**FC-08**|FC-08-01|US-03, US-04|Xem Dashboard tổng quan|Admin/System Admin xem thống kê tổng quan về doanh thu, booking, payment, người dùng mới, dịch vụ, refund và các chỉ số vận hành chính.|
||FC-08-02|US-03, US-04|Xuất báo cáo|Admin/System Admin xuất báo cáo kinh doanh, doanh thu, booking, payment hoặc các dữ liệu vận hành ra định dạng phù hợp như Excel/PDF tùy cấu hình hệ thống.|
||FC-08-03|US-03, US-04|Theo dõi hoạt động và audit log|Admin/System Admin xem lịch sử truy cập, thao tác thay đổi dữ liệu, hoạt động Staff/Admin và các log nghiệp vụ quan trọng.|
||FC-08-04|US-03, US-04|Quản lý thiết lập hệ thống|Admin/System Admin quản lý thiết lập công khai, thông tin thanh toán trực tiếp và cấu hình nghiệp vụ theo quyền được cấp. System Admin có quyền cao nhất đối với các thiết lập vận hành hệ thống.|
|**FC-09**|FC-09-01|Hệ thống|Gửi email xác thực tài khoản|Tự động gửi email kích hoạt/xác nhận khi người dùng đăng ký tài khoản mới thành công.|
||FC-09-02|Hệ thống|Gửi email biên lai, xác nhận booking|Tự động gửi thông tin chi tiết đơn hàng, vé điện tử và biên lai thanh toán vào email của khách hàng.|
|**FC-10**|FC-10-01|Hệ thống|Thông báo trạng thái đơn hàng|Đẩy thông báo trực tiếp trên giao diện website (in-app) cho khách hàng khi đơn hàng chuyển trạng thái.|
||FC-10-02|Hệ thống|Thông báo tin nhắn hỗ trợ|Báo cho khách hàng biết khi có nhân viên tư vấn vừa trả lời thắc mắc của họ.|
||FC-10-03|Hệ thống|Thông báo ưu đãi mới|Đẩy thông báo đến toàn bộ hoặc một nhóm khách hàng về các chương trình khuyến mãi sắp ra mắt.|

**4.1.3. Yêu cầu phi chức năng**

4\.1.3.1. Hiệu năng

- Hệ thống phải có khả năng xử lý ít nhất 1.000 yêu cầu truy cập đồng thời (Concurrent Requests) tại cùng một thời điểm mà không làm suy giảm tốc độ phản hồi của hệ thống.
- Thời gian tải trang trung bình không quá 1.5 giây đối với các trang thông tin cơ bản, và không quá 2.5 giây đối với các trang xử lý dữ liệu lớn (như trang kết quả tìm kiếm, lọc danh sách tour/khách sạn có kèm nhiều hình ảnh chất lượng cao).

4\.1.3.2. Khả năng mở rộng

- Hệ thống phải được thiết kế theo kiến trúc linh hoạt, dễ dàng mở rộng theo chiều ngang (Horizontal Scaling) nhằm phục vụ số lượng người dùng tăng trưởng đột biến trong các mùa du lịch cao điểm (Lễ, Tết) mà không ảnh hưởng tới hiệu suất chung.
- Kiến trúc mã nguồn phải có tính module hóa cao, cho phép dễ dàng tích hợp thêm các nhà cung cấp dịch vụ thứ ba (API của các hãng hàng không, chuỗi khách sạn quốc tế) hoặc cập nhật các module tính năng mới.

4\.1.3.3. Bảo mật

- Hệ thống bắt buộc phải hỗ trợ các phương thức xác thực mạnh và phân quyền bảo mật nghiêm ngặt để ngăn chặn mọi hành vi truy cập trái phép.
- Việc phân quyền người dùng phải tuân thủ nghiêm ngặt theo chuẩn RBAC (Role-Based Access Control).
- Toàn bộ dữ liệu nhạy cảm của người dùng, đặc biệt là mật khẩu tài khoản, phải được mã hóa một chiều bằng các thuật toán bảo mật tiêu chuẩn (ví dụ: bcrypt hoặc SHA-256) trước khi lưu vào cơ sở dữ liệu.
- Toàn bộ API và dữ liệu truyền tải phải sử dụng SSL/TLS. Trong phạm vi thanh toán trực tiếp/thủ công, hệ thống không xử lý dữ liệu thẻ, không lưu số thẻ/CVV và không kết nối trực tiếp tới cổng thanh toán.
- Các API yêu cầu đăng nhập phải sử dụng Authorization: Bearer access\_token.
- Hệ thống phân quyền theo các nhóm Public, Customer, Staff, Admin và System Admin.
- Các thao tác quan trọng như checkout, tạo payment, xác nhận payment và refund phải sử dụng Idempotency-Key để chống tạo trùng khi người dùng gửi lại request.
- Thông tin chứng từ thanh toán chỉ được lưu ở mức cần thiết để xác nhận, đối soát nội bộ và audit.

4\.1.3.4. Khả năng bảo trì

- Mã nguồn hệ thống và cấu trúc kiến trúc phải được thiết kế theo các tiêu chuẩn Clean Code, giúp đội ngũ lập trình viên dễ dàng bảo trì, phát hiện/sửa lỗi và cập nhật tính năng mới.
- Tài liệu kỹ thuật của hệ thống, bao gồm tài liệu thiết kế API, hướng dẫn vận hành và nhật ký thay đổi (changelog) phải được cập nhật định kỳ và liên tục.

4\.1.3.5. Tính chính xác và nhất quán

- Hệ thống phải ghi vết (log) đầy đủ và chính xác tất cả các thông tin liên quan đến giao dịch đặt chỗ của người dùng, bao gồm: chi tiết dịch vụ đặt, thông tin khách hàng, lịch sử thay đổi trạng thái đơn hàng và biên lai thanh toán.
- Cung cấp cơ chế ghi nhận, kiểm tra và đối soát nội bộ các giao dịch thanh toán trực tiếp/thủ công để đảm bảo dữ liệu tài chính nhất quán. Các thay đổi trạng thái booking, payment và refund phải được ghi nhận đầy đủ, có lịch sử xử lý và chỉ cho phép chuyển trạng thái theo luồng hợp lệ.

4\.1.3.6. Khả năng phục hồi

- Hệ thống phải thiết lập phương án sao lưu (backup) dữ liệu tự động định kỳ hàng ngày nhằm đảm bảo khả năng khôi phục nhanh chóng khi xảy ra sự cố phần cứng, phần mềm hoặc mất mát dữ liệu.
- Quy trình khôi phục hệ thống (Disaster Recovery) phải đảm bảo đưa hệ thống trở lại trạng thái hoạt động bình thường trong thời gian tối đa là 2 giờ kể từ khi phát hiện sự cố nghiêm trọng gây ngừng hoạt động.

4\.1.3.7. Giao diện người dùng

- Giao diện người dùng (UI/UX) phải được thiết kế đơn giản, hiện đại, thân thiện, giúp khách hàng có thể thực hiện quy trình đặt chỗ một cách mượt mà và nhanh chóng.
- Giao diện phải hỗ trợ thiết kế đáp ứng (Responsive Design) hoàn hảo trên các nền tảng thiết bị di động, máy tính bảng và máy tính để bàn; ngôn ngữ hiển thị mặc định và tối ưu là Tiếng Việt.
  ### <a name="_ljd1u5huorjh"></a>**5. Yêu cầu tổng thể**
  #### <a name="_35z8wc2cd2u1"></a>**5.1. Kiến trúc hệ thống**
- Hệ thống được triển khai theo mô hình kiến trúc Client - Server phân lớp tách biệt (Decoupled Architecture) bao gồm ba thành phần chính: Frontend (React.js), Backend (Express.js/Node.js) và Cloud Database (Supabase PostgreSQL).
- Toàn bộ ứng dụng (cả Frontend và Backend) được container hóa bằng Docker nhằm đảm bảo tính nhất quán giữa các môi trường phát triển (Development, Staging, Production).
- Hệ thống được triển khai trên các nền tảng đám mây hiện đại hỗ trợ Serverless hoặc PaaS (như Vercel cho Frontend React.js; và Render, AWS ECS, hoặc Railway cho Backend Express.js) giúp tự động hóa việc điều phối tài nguyên và mở rộng quy mô (Auto Scaling) dựa trên lưu lượng truy cập thực tế.
  #### <a name="_7k0ndpa97yhg"></a>**5.2. Công nghệ Backend**
- Sử dụng môi trường **Node.js** kết hợp với Framework **Express.js** để xây dựng hệ thống xử lý logic nghiệp vụ phía Backend, cung cấp hệ thống mã nguồn gọn nhẹ, tối ưu hóa xử lý bất đồng bộ (Asynchronous I/O) và cung cấp các chuẩn RESTful API chất lượng cao cho Frontend.
- Sử dụng cơ chế mã thông báo bảo mật **JWT (JSON Web Tokens)** kết hợp phân quyền **RBAC (Role-Based Access Control)** để thực hiện việc xác thực và phân quyền người dùng (Khách hàng, Nhân viên, Admin) trên mỗi phiên làm việc một cách an toàn thông qua Middleware của Express.js.
  #### <a name="_8w23dduz8txe"></a>**5.3. Công nghệ Frontend**
- Sử dụng Framework **React.js** để phát triển giao diện người dùng. Tận dụng các tính năng nâng cao của React.js như SSR (Server-Side Rendering) cho các trang cần tối ưu SEO (trang chủ, chi tiết tour), ISR (Incremental Static Regeneration) cho các trang thông tin tĩnh để tối ưu tốc độ tải và Hydration mượt mà cho trải nghiệm ứng dụng đơn trang (SPA).
- Tận dụng mạng phân phối nội dung **Vercel Edge Network / CDN** mặc định của React.js để phân phối tài nguyên tĩnh gần vị trí địa lý của người dùng nhất, tối ưu hóa tốc độ phản hồi trang tại Việt Nam.
  #### <a name="_3ai60ng4slfs"></a>**5.4. Cơ sở dữ liệu**
- Sử dụng **Supabase PostgreSQL** dưới dạng dịch vụ Cloud Database tập trung để quản lý toàn bộ dữ liệu quan hệ của hệ thống (thông tin người dùng, dịch vụ du lịch, trạng thái đơn hàng).
- Tận dụng các tính năng cao cấp của PostgreSQL trên Supabase như Cơ chế giao dịch (Database Transactions) để đảm bảo tính toàn vẹn dữ liệu, Connection Pooling để tối ưu số lượng kết nối đồng thời, và tính năng Realtime để cập nhật trạng thái đơn hàng ngay lập tức.
  #### <a name="_jb5t5k9fy91n"></a>**5.5. Lưu trữ và quản lý tài liệu**
- Sử dụng **Cloudinary** làm kho lưu trữ đối tượng (Object Storage) và mạng phân phối hình ảnh (Image CDN) cho toàn bộ tài nguyên đa phương tiện dung lượng lớn của hệ thống (hình ảnh tour du lịch chất lượng cao, video giới thiệu, ảnh đại diện người dùng, hóa đơn PDF).
- Ứng dụng các API tối ưu hóa tự động của Cloudinary để tự động nén, thay đổi kích thước (Resize), và chuyển đổi định dạng ảnh sang các chuẩn thế hệ mới (WebP, AVIF) trước khi trả về cho Frontend React.js, giúp tiết kiệm băng thông tối đa.
  #### <a name="_y0jwgttoe4ps"></a>**5.6. Bảo mật hệ thống**
- Toàn bộ lưu lượng mạng truyền tải giữa React.js (Client), Express.js (Server), Supabase và Cloudinary bắt buộc phải chạy qua giao thức mã hóa **SSL/TLS (HTTPS/WSS)** nhằm ngăn chặn nguy cơ tấn công nghe lén (Man-in-the-middle).
- Áp dụng tính năng **Supabase RLS (Row Level Security)** tại lớp cơ sở dữ liệu để bảo vệ dữ liệu ở mức độ dòng, đảm bảo người dùng hoặc hacker không thể truy cập hay chỉnh sửa trái phép dữ liệu của người khác ngay cả khi lộ kết nối API.
- Thiết lập hệ thống tường lửa ứng dụng web (WAF) và cơ chế Rate Limiting (thông qua Middleware trong Express.js hoặc Cloudflare) để ngăn chặn các cuộc tấn công Brute Force, DDoS, SQL Injection và Cross-Site Scripting (XSS).
  #### <a name="_k59rnrfq2j5y"></a>**5.7. Thanh toán và bảo mật giao dịch**
Trong phạm vi hệ thống hiện tại, thanh toán được xử lý theo hình thức trực tiếp/thủ công, bao gồm:

- Thanh toán tiền mặt tại văn phòng.
- Chuyển khoản ngân hàng thủ công.
- Nhân viên thu hộ.

Khách hàng tạo payment cho booking và có thể upload chứng từ thanh toán. Payment ban đầu ở trạng thái pending. Staff/Admin/System Admin kiểm tra số tiền thực nhận, thời gian nhận tiền, chứng từ và thông tin người thanh toán trước khi xác nhận hoặc từ chối payment.

Các thao tác checkout, tạo payment, xác nhận payment và refund phải sử dụng Idempotency-Key để tránh phát sinh nhiều booking, payment hoặc refund khi người dùng bấm nhiều lần hoặc hệ thống retry.

Hệ thống không lưu số thẻ, CVV hoặc dữ liệu thanh toán nhạy cảm. Các thông tin chứng từ thanh toán thủ công chỉ được lưu để phục vụ xác nhận giao dịch, đối soát nội bộ, chăm sóc khách hàng và audit.

Payment sau khi xác nhận thành công có thể được Admin/System Admin đánh dấu đã đối soát sau khi kiểm tra số liệu nội bộ.

#### <a name="_opg2oakvxc9r"></a>**5.8. Hạ tầng triển khai và cân bằng tải**
- Ứng dụng mô hình triển khai tự động (Managed Hosting) với **Vercel** (dành cho React.js) và các nền tảng Container hỗ trợ Docker như **Render/Railway** hoặc **AWS ECS Fargate** (dành cho Express.js), giúp hệ thống tự động cân bằng tải (Load Balancing) và co giãn tài nguyên theo chiều ngang (Horizontal Scaling) khi số lượng Request tăng đột biến vào mùa du lịch cao điểm.
  #### <a name="_5n889j8vdiu"></a>**5.9. Giám sát và quản lý log**
- Tích hợp các thư viện ghi log chuyên dụng trong Express.js như **Winston** hoặc **Morgan** để tập trung lưu vết cấu trúc log (Error Logs, Request Logs, Transaction Logs).
- Kết nối log hệ thống với các dịch vụ giám sát tập trung đám mây (như Datadog, Loggly, Supabase Logs hoặc chính hệ thống Log tích hợp của Render/Vercel) giúp đội ngũ kỹ thuật giám sát sức khỏe ứng dụng theo thời gian thực và xử lý nhanh các mã lỗi (5xx, 4xx).
  #### <a name="_a6ztssl33m0k"></a>**5.10. Quy trình CI/CD**
- Thiết lập chu trình tích hợp và triển khai tự động (CI/CD Pipeline) thông qua **GitHub Actions** liên kết trực tiếp với Vercel và môi trường chạy Backend.
- Mỗi khi nhà phát triển đẩy mã nguồn mới lên nhánh main/production, hệ thống sẽ tự động chạy các bài kiểm thử tự động (Unit Test với Jest, Integration Test), nếu vượt qua sẽ tự động build thành Docker Image mới và deploy không gây gián đoạn dịch vụ (Zero-downtime Deployment).
  #### <a name="_565eke6fc9hv"></a>**5.11. Gửi Thông Báo (Notification)**
- Hệ thống xây dựng module thông báo thời gian thực kết hợp giữa Backend Express.js và Frontend React.js:
  - **Thông báo trên ứng dụng (In-app/Push Notifications):** Sử dụng Firebase Cloud Messaging (FCM) hoặc cơ chế Realtime/Websocket của Supabase để đẩy các cập nhật trạng thái đơn hàng trực tiếp lên màn hình của người dùng.
  - **Sự kiện hệ thống:** Áp dụng mô hình Event-Driven bên trong Express.js (sử dụng EventEmitter hoặc các Message Queue nhẹ như Redis BullMQ) để khi một hành động hoàn tất (ví dụ: Thanh toán thành công), hệ thống sẽ tự động kích hoạt tiến trình ngầm gửi mail qua SendGrid và đẩy thông báo mà không làm nghẽn luồng xử lý chính của người dùng.
#### <a name="_dob59ot2jcc5"></a>**5.12. Gửi Email**
- Sử dụng dịch vụ **SendGrid Email API** để phụ trách toàn bộ luồng gửi email giao dịch (Transactional Emails) tự động từ hệ thống Backend Express.js đến khách hàng bao gồm: Email kích hoạt/mã xác thực tài khoản, Email xác nhận đặt chỗ thành công (Booking Confirmation) và Email đính kèm Lịch trình thông minh (Smart Itinerary) kèm hóa đơn giao dịch.
  #### <a name="_dxwei4tiaoae"></a>**5.13. Lưu trữ và Theo dõi Thông Báo và Email**
- Tận dụng hệ thống quản trị Dashboard và tính năng Webhook của **SendGrid** để theo dõi, giám sát trạng thái của toàn bộ email được phát đi (tỷ lệ gửi thành công, tỷ lệ mail bị chuyển vào hòm thư rác - Spam, tỷ lệ email bị trả lại - Bounce Rate, và tỷ lệ mở mail của khách hàng).
- Toàn bộ lịch sử giao dịch và trạng thái gửi email/thông báo thành công hay thất bại đều được ghi nhận lại trong các bảng lịch sử (Log Tables) thuộc cơ sở dữ liệu Supabase PostgreSQL nhằm phục vụ công tác đối soát dữ liệu và hỗ trợ giải quyết khiếu nại của khách hàng.
### <a name="_2du78d5ncck1"></a>**6. Yêu cầu chất lượng ứng dụng**

|**Yêu cầu chất lượng**|**Chuẩn chất lượng tham chiếu**|**Mục tiêu**|**Phương thức**|
| - | - | - | - |
|**Độ tin cậy**|ISO/IEC 25010 (Reliability)|Đảm bảo hệ thống có khả năng vận hành liên tục ổn định, không gặp các lỗi nghiêm trọng gây gián đoạn dịch vụ trong ít nhất 99.9% thời gian vận hành (Chỉ số MTBF - Mean Time Between Failures đạt tối thiểu 1.200 giờ).|Thực hiện định kỳ các bài kiểm tra áp lực (Stress Testing) và kiểm tra khả năng chịu lỗi của hạ tầng (Fault-Tolerance Testing) nhằm đảm bảo hệ thống không bị sập khi chịu tải cao.|
|**Tính chính xác và nhất quán**|ISO/IEC 25012 (Data Quality Model)|Dữ liệu liên quan đến quy trình đặt chỗ (Booking), thông tin hành khách và giao dịch tài chính phải đạt độ chính xác tuyệt đối 100%. Mọi trường hợp sai lệch dữ liệu phát sinh phải được hệ thống phát hiện và xử lý trong vòng 12 giờ.|Áp dụng các bài kiểm tra tích hợp dữ liệu (Integration Testing) dữ dội và xây dựng các script tự động đối soát chéo dữ liệu giữa database hệ thống và log của cổng thanh toán.|
|**Khả năng sử dụng**|ISO 9241-11 (Usability)|Đảm bảo giao diện tối ưu trải nghiệm, chỉ số Usability Score đạt ít nhất 85% trong các đợt kiểm thử chấp nhận người dùng (UAT). Khách hàng bình thường phải có thể hoàn thành quy trình đặt dịch vụ trong vòng tối đa 4 bước thao tác cơ bản.|Thực hiện các bài kiểm tra trải nghiệm người dùng thực tế (UX Testing), theo dõi bản đồ nhiệt tương tác (Heatmap) và thực hiện khảo sát độ hài lòng của khách hàng sau khi hệ thống chạy thử nghiệm.|
|**Tính ổn định**|ISO/IEC 25010 (Stability)|Hệ thống phải duy trì trạng thái hoạt động mượt mà dưới các điều kiện tải tiêu chuẩn mà không phát sinh các lỗi treo ứng dụng bất ngờ. Chỉ số MTTR (Mean Time to Recovery) đối với các lỗi phần mềm thông thường phải dưới 5 phút nhờ cơ chế tự chữa lành (Auto-healing).|Sử dụng công cụ mô phỏng tải cao (Load Testing) để liên tục đánh giá độ ổn định của các container ứng dụng khi có sự tăng trưởng đột biến về lượng truy cập của khách hàng.|
|**Khả năng phục hồi dữ liệu**|ISO/IEC 27040 (Storage Security)|Hệ thống thực hiện sao lưu tự động toàn bộ cơ sở dữ liệu hàng ngày. Chỉ số RPO (Recovery Point Objective - mức độ mất dữ liệu tối đa) không được vượt quá 24 giờ. Thời gian khôi phục toàn bộ hệ thống sau thảm họa (RTO) tối đa là 2 giờ.|Tổ chức các đợt diễn tập khôi phục hệ thống và dữ liệu định kỳ hàng quý từ các bản sao lưu trên Amazon RDS và Amazon S3 nhằm kiểm tra tính sẵn sàng của quy trình Disaster Recovery.|
|**Bảo mật**|ISO/IEC 27001 (Information Security Management), OWASP Top 10, PCI-DSS|<p>**Xác thực & Phân quyền:** Áp dụng xác thực bằng email/password, access token, refresh token và phân quyền chặt chẽ theo RBAC. MFA/2FA chưa thuộc phạm vi MVP, có thể bổ sung ở giai đoạn sau cho các tài khoản quản trị.</p><p></p><p>**Mã hóa dữ liệu:** Mã hóa dữ liệu lưu trữ (Data-at-rest) bằng thuật toán AES-256 và dữ liệu truyền tải (Data-in-transit) bằng giao thức SSL/TLS.</p><p></p><p>**Bảo mật giao dịch:** Trong phạm vi MVP, hệ thống xử lý thanh toán trực tiếp/thủ công, không tích hợp cổng thanh toán online và không lưu dữ liệu thẻ/CVV. Thông tin chứng từ thanh toán được bảo vệ và chỉ sử dụng cho xác nhận giao dịch, đối soát nội bộ và audit.</p>|<p>*Kiểm tra xâm nhập (Penetration Testing):* Thuê đơn vị độc lập thực hiện pentest định kỳ hàng năm nhằm tìm kiếm lỗ hổng.</p><p></p><p>*Đánh giá lỗ hổng:* Quét mã nguồn và kiểm tra hệ thống hàng quý dựa trên danh sách khuyến nghị bảo mật của OWASP Top 10.</p><p></p><p>*Kiểm tra tuân thủ:* Định kỳ rà soát các tiêu chí bảo mật hạ tầng, phân quyền, lưu trữ dữ liệu, log hệ thống và quy trình xử lý thanh toán trực tiếp/thủ công.</p><p></p>|

### <a name="_h8eki1ok2dc2"></a>**7. Tiêu chí chấp nhận ứng dụng**
- ### <a name="_9lh1q6sz7440"></a>Hệ thống phải hiện thực hóa đầy đủ tất cả các yêu cầu chức năng từ module FC-01 đến module FC-12 đã được liệt kê trong bảng chi tiết chức năng, với tỷ lệ lỗi phát sinh trong giai đoạn nghiệm thu phải dưới mức 3%.**.**
- **Đáp ứng phi chức năng:** Hệ thống vượt qua các bài kiểm thử hiệu năng và bảo mật, đảm bảo đạt đúng các thông số kỹ thuật định lượng đã cam kết (Xử lý 1.000 request đồng thời, thời gian phản hồi trang dưới 1.5s - 2.5s).
- **Đạt chuẩn chất lượng:** Ứng dụng phải được chứng minh thỏa mãn các mục tiêu chất lượng dựa trên các chuẩn tham chiếu quốc tế đề ra trong bảng yêu cầu chất lượng ứng dụng (ISO/IEC 25010, ISO/IEC 25012, PCI-DSS).
- **Bàn giao đúng hạn:** Toàn bộ sản phẩm bao gồm mã nguồn sạch, tài liệu đặc tả hệ thống cập nhật, tài liệu hướng dẫn vận hành và hệ thống hoàn chỉnh trên môi trường Production phải được bàn giao chính xác theo đúng các mốc thời gian (Milestones) đã ký kết trong kế hoạch dự án.
- **Kiểm soát ngân sách:** Quy trình thiết kế, phát triển và cấu hình triển khai hạ tầng ban đầu phải được thực hiện trong phạm vi ngân sách đã được phê duyệt, cam kết không phát sinh thêm bất kỳ chi phí ngoài dự kiến nào nếu không có sự thay đổi về phạm vi yêu cầu (Scope) từ phía ban quản lý dự án.

