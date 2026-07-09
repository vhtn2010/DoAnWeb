# HỆ THỐNG WEBSITE DU LỊCH ĐA DỊCH VỤ NÉT VIỆT (NÉT VIỆT TRAVEL)

## 1. Mục đích tài liệu

Tài liệu này cung cấp một cái nhìn tổng quan về Hệ thống Đặt dịch vụ và Quản lý du lịch trực tuyến, bằng việc mô tả chi tiết các yêu cầu chức năng, yêu cầu phi chức năng, kiến trúc kỹ thuật và các tiêu chuẩn chất lượng liên quan đến toàn bộ hệ thống.

## 2. Mô tả sơ bộ

Trong bối cảnh ngành du lịch hiện đại, nhu cầu đi du lịch tự túc, đặt phòng khách sạn, vé máy bay và các tour trải nghiệm trực tuyến của khách hàng ngày càng tăng mạnh. Trên thị trường hiện nay có nhiều nền tảng cung cấp dịch vụ đơn lẻ hoặc các đại lý du lịch trực tuyến (OTA) lớn như Agoda, Booking, Traveloka... Tuy nhiên, các hệ thống này đôi khi vẫn gặp hạn chế trong việc tối ưu hóa các gói dịch vụ kết hợp (Combo Tour + Khách sạn + Vé) mang tính cá nhân hóa cao, hoặc chưa cung cấp một bộ công cụ quản trị tinh gọn, linh hoạt cho các doanh nghiệp lữ hành nội địa tại Việt Nam để tự quản lý kho dữ liệu và tối ưu hóa các chương trình khuyến mãi theo thời gian thực.

Nhận thấy cơ hội phát triển này, hệ thống được xây dựng nhằm tạo ra một giải pháp toàn diện, kết hợp chặt chẽ giữa việc cung cấp nền tảng tìm kiếm, đặt chỗ trực tuyến đa dịch vụ (Tour, Khách sạn, Vé máy bay, Vé tàu) cho khách hàng, và một hệ thống quản trị (Admin Dashboard) mạnh mẽ giúp doanh nghiệp tối ưu hóa quy trình vận hành, quản lý doanh thu, chăm sóc khách hàng và triển khai các chiến dịch marketing hiệu quả.

## 3. Đối tượng sử dụng hệ thống

| **Mã đối tượng** | **Tên đối tượng** | **Mô tả** |
| --- | --- | --- |
| **US-01** | Khách hàng (Customer) | Là đối tượng người dùng mặc định khi đăng ký tài khoản hoặc truy cập vào hệ thống. Có thể sử dụng các chức năng tìm kiếm, áp dụng mã giảm giá, đặt dịch vụ, thực hiện thanh toán trực tuyến và theo dõi trạng thái đơn hàng. |
| **US-02** | Nhân viên (Staff) | Là đối tượng được phân quyền bởi Admin hoặc System Admin. Chịu trách nhiệm quản lý kho dữ liệu dịch vụ (thêm, cập nhật tour, phòng, vé) và tiếp nhận, phản hồi các yêu cầu tư vấn, hỗ trợ của khách hàng. |
| **US-03** | Quản trị viên (Admin) | Là đối tượng có quyền quản lý hầu hết các chức năng của hệ thống như kiểm soát tài khoản người dùng, duyệt dịch vụ, quản lý các chương trình khuyến mãi tổng thể, theo dõi báo cáo doanh thu và xử lý yêu cầu hoàn tiền. |
| **US-04** | Quản trị hệ thống (System Admin) | Là đối tượng gốc có toàn quyền cao nhất đối với hệ thống. Phụ trách việc cấu hình các thiết lập hệ thống, quản lý hạ tầng và phân quyền truy cập cho các tài khoản Admin hoặc Staff. Đối tượng này không thể bị xóa. |

## 4. Mô tả chức năng

### 4.1 Yêu cầu chức năng

#### 4.1.1 Phân nhóm chức năng

| **Mã nhóm chức năng** | **Tên nhóm chức năng** | **Mô tả** |
| --- | --- | --- |
| **FC-01** | **User Module** | Quản lý thông tin đăng ký, đăng nhập và hồ sơ cá nhân của tất cả người dùng (Khách hàng, Staff, Admin, System Admin). Quản lý phân quyền truy cập. |
| **FC-02** | **Service Module** | Chịu trách nhiệm quản lý toàn bộ kho dữ liệu dịch vụ. Cung cấp chức năng cho phép Staff/Admin thêm mới, cập nhật, xóa thông tin tour, khách sạn, vé máy bay, vé tàu. |
| **FC-03** | **Search Module** | Quản lý các công cụ tìm kiếm và bộ lọc giúp khách hàng khám phá các tour, khách sạn, vé máy bay. Hiển thị chi tiết thông tin của từng dịch vụ. |
| **FC-04** | **Booking Module** | Quản lý toàn bộ quy trình đặt chỗ. Bao gồm chức năng giỏ hàng, cho phép người dùng đặt tour, đặt phòng, đặt vé và theo dõi trạng thái đơn hàng, hủy đơn hàng. |
| **FC-05** | **Payment Module** | Chịu trách nhiệm xử lý các giao dịch thanh toán khi người dùng tiến hành chốt đơn đặt dịch vụ. Kết nối với các cổng thanh toán trực tuyến để đảm bảo an toàn. |
| **FC-06** | **Promotion Module** | Quản lý các chương trình khuyến mãi, ưu đãi, mã giảm giá. Cho phép áp dụng mã giảm giá vào quy trình đặt chỗ và thanh toán. |
| **FC-07** | **Support Module** | Quản lý các kênh tương tác với khách hàng, bao gồm chức năng liên hệ tư vấn và giải đáp thắc mắc. |
| **FC-08** | **Admin Module** | Cung cấp giao diện Dashboard tổng quan cho System Admin và Admin để quản lý toàn bộ hệ thống, theo dõi báo cáo doanh thu, tình trạng đơn hàng và hoạt động của người dùng. |
| **FC-09** | **Mail Module** | Phụ trách việc gửi email thông báo ra bên ngoài cho người dùng (email xác nhận tạo tài khoản, xác nhận đặt tour, vé, biên lai thanh toán). |
| **FC-10** | **Notification Module** | Quản lý việc đẩy thông báo trực tiếp trên giao diện website (in-app) đến người dùng, giúp họ cập nhật ngay lập tức các thay đổi về trạng thái đơn hàng hay tin nhắn hỗ trợ. |

#### 4.1.2. Chi tiết chức năng

| **Mã nhóm chức năng** | **Mã chức năng** | **Mã đối tượng sử dụng** | **Tên chức năng** | **Mô tả** |
| --- | --- | --- | --- | --- |
| **FC-01** | FC-01-01 | US-01, US-02, US-03, US-04 | Đăng ký tài khoản | Người dùng có thể tạo tài khoản mới bằng cách cung cấp thông tin như email, mật khẩu và họ tên. |
|  | FC-01-02 | US-01, US-02, US-03, US-04 | Đăng nhập / Đăng xuất | Người dùng đăng nhập vào hệ thống để sử dụng các dịch vụ và đăng xuất để bảo mật tài khoản cá nhân. |
|  | FC-01-03 | US-01, US-02, US-03, US-04 | Quản lý hồ sơ cá nhân | Cho phép cập nhật các thông tin cá nhân, thay đổi mật khẩu và xem lại lịch sử hoạt động. |
|  | FC-01-04 | US-03, US-04 | Phân quyền truy cập | Đối tượng quản trị có thể thiết lập, thay đổi quyền hạn cho các tài khoản Staff hoặc Admin khác trong hệ thống. |
| **FC-02** | FC-02-01 | US-02, US-03, US-04 | Thêm mới dịch vụ | Đối tượng quản trị có thể tạo mới thông tin về tour du lịch, khách sạn, vé máy bay, vé tàu lên hệ thống. |
|  | FC-02-02 | US-02, US-03, US-04 | Cập nhật thông tin dịch vụ | Cho phép chỉnh sửa thông tin mô tả, giá cả, lịch trình hoặc hình ảnh của các dịch vụ đang hiện có. |
|  | FC-02-03 | US-03, US-04 | Xóa/Ẩn dịch vụ | Đối tượng có quyền xóa hoặc tạm ẩn các dịch vụ không còn hoạt động hoặc hết chỗ. |
| **FC-03** | FC-03-01 | US-01 | Tìm kiếm dịch vụ | Khách hàng có thể tìm kiếm tour, khách sạn, vé theo từ khóa, địa điểm, thời gian khởi hành. |
|  | FC-03-02 | US-01 | Bộ lọc nâng cao | Cung cấp công cụ lọc kết quả tìm kiếm theo khoảng giá, hạng sao (khách sạn), phương tiện (tour/vé). |
|  | FC-03-03 | US-01 | Xem chi tiết dịch vụ | Khách hàng bấm vào để xem toàn bộ thông tin chi tiết, lịch trình, chính sách hoàn hủy của một dịch vụ. |
| **FC-04** | FC-04-01 | US-01 | Quản lý giỏ hàng | Khách hàng có thể thêm, bớt hoặc lưu lại các dịch vụ (tour, phòng, vé) vào giỏ hàng trước khi thanh toán. |
|  | FC-04-02 | US-01 | Đặt chỗ (Booking) | Khách hàng tiến hành điền thông tin hành khách và chốt đơn đặt các dịch vụ trong giỏ hàng. |
|  | FC-04-03 | US-01, US-02, US-03 | Theo dõi trạng thái đơn hàng | Cung cấp khả năng kiểm tra tiến độ xử lý đơn hàng (Chờ thanh toán, Đã xác nhận, Hoàn tất...). |
|  | FC-04-04 | US-01, US-02, US-03 | Hủy đơn đặt chỗ | Khách hàng có thể yêu cầu hủy đơn, hoặc Staff/Admin tiến hành hủy đơn khi có sự cố, tuân theo chính sách hệ thống. |
| **FC-05** | FC-05-01 | US-01 | Thanh toán trực tuyến | Khách hàng thực hiện các giao dịch thanh toán thông qua việc kết nối với các cổng thanh toán an toàn (VNPay, Momo, Visa...). |
|  | FC-05-02 | US-01, US-02, US-03 | Xem lịch sử giao dịch | Đối tượng có thể xem lại chi tiết các khoản tiền đã giao dịch thành công hoặc thất bại. |
|  | FC-05-03 | US-02, US-03, US-04 | Xử lý hoàn tiền (Refund) | Quản lý và thực hiện lệnh hoàn tiền cho khách hàng đối với các đơn hàng bị hủy hoặc có phát sinh lỗi. |
| **FC-06** | FC-06-01 | US-02, US-03, US-04 | Quản lý chương trình khuyến mãi | Tạo mới, cập nhật hoặc kết thúc các chiến dịch ưu đãi, giảm giá trên toàn hệ thống. |
|  | FC-06-02 | US-02, US-03, US-04 | Tạo mã giảm giá (Voucher) | Phát hành các mã giảm giá với số lượng, phần trăm giảm và điều kiện áp dụng cụ thể. |
|  | FC-06-03 | US-01 | Áp dụng mã giảm giá | Khách hàng nhập mã ưu đãi vào quy trình booking/thanh toán để được giảm trừ chi phí. |
| **FC-07** | FC-07-01 | US-01 | Gửi yêu cầu liên hệ/tư vấn | Khách hàng gửi form câu hỏi, thắc mắc về dịch vụ trực tiếp qua hệ thống. |
|  | FC-07-02 | US-02, US-03 | Quản lý và phản hồi khách hàng | Staff/Admin tiếp nhận yêu cầu, tin nhắn từ khách hàng và thực hiện phản hồi, giải đáp thắc mắc. |
| **FC-08** | FC-08-01 | US-03, US-04 | Xem Dashboard tổng quan | Cung cấp giao diện biểu đồ trực quan thống kê doanh thu, đơn hàng, người dùng mới theo thời gian thực. |
|  | FC-08-02 | US-03, US-04 | Xuất báo cáo | Hỗ trợ xuất các dữ liệu báo cáo kinh doanh, tài chính ra định dạng file Excel/PDF. |
|  | FC-08-03 | US-03, US-04 | Theo dõi hoạt động người dùng | Quản lý, kiểm soát lịch sử truy cập và các thao tác thay đổi dữ liệu của Staff và Admin (Log tracking). |
| **FC-09** | FC-09-01 | Hệ thống | Gửi email xác thực tài khoản | Tự động gửi email kích hoạt/xác nhận khi người dùng đăng ký tài khoản mới thành công. |
|  | FC-09-02 | Hệ thống | Gửi email biên lai, xác nhận booking | Tự động gửi thông tin chi tiết đơn hàng, vé điện tử và biên lai thanh toán vào email của khách hàng. |
| **FC-10** | FC-10-01 | Hệ thống | Thông báo trạng thái đơn hàng | Đẩy thông báo trực tiếp trên giao diện website (in-app) cho khách hàng khi đơn hàng chuyển trạng thái. |
|  | FC-10-02 | Hệ thống | Thông báo tin nhắn hỗ trợ | Báo cho khách hàng biết khi có nhân viên tư vấn vừa trả lời thắc mắc của họ. |
|  | FC-10-03 | Hệ thống | Thông báo ưu đãi mới | Đẩy thông báo đến toàn bộ hoặc một nhóm khách hàng về các chương trình khuyến mãi sắp ra mắt. |

#### 4.1.3. Yêu cầu phi chức năng

##### 4.1.3.1. Hiệu năng

- Hệ thống phải có khả năng xử lý ít nhất 1.000 yêu cầu truy cập đồng thời (Concurrent Requests) tại cùng một thời điểm mà không làm suy giảm tốc độ phản hồi của hệ thống.

- Thời gian tải trang trung bình không quá 1.5 giây đối với các trang thông tin cơ bản, và không quá 2.5 giây đối với các trang xử lý dữ liệu lớn (như trang kết quả tìm kiếm, lọc danh sách tour/khách sạn có kèm nhiều hình ảnh chất lượng cao).

##### 4.1.3.2. Khả năng mở rộng

- Hệ thống phải được thiết kế theo kiến trúc linh hoạt, dễ dàng mở rộng theo chiều ngang (Horizontal Scaling) nhằm phục vụ số lượng người dùng tăng trưởng đột biến trong các mùa du lịch cao điểm (Lễ, Tết) mà không ảnh hưởng tới hiệu suất chung.

- Kiến trúc mã nguồn phải có tính module hóa cao, cho phép dễ dàng tích hợp thêm các nhà cung cấp dịch vụ thứ ba (API của các hãng hàng không, chuỗi khách sạn quốc tế) hoặc cập nhật các module tính năng mới.

##### 4.1.3.3. Bảo mật

- Hệ thống bắt buộc phải hỗ trợ các phương thức xác thực mạnh và phân quyền bảo mật nghiêm ngặt để ngăn chặn mọi hành vi truy cập trái phép.

- Việc phân quyền người dùng phải tuân thủ nghiêm ngặt theo chuẩn RBAC (Role-Based Access Control).

- Toàn bộ dữ liệu nhạy cảm của người dùng, đặc biệt là mật khẩu tài khoản, phải được mã hóa một chiều bằng các thuật toán bảo mật tiêu chuẩn (ví dụ: bcrypt hoặc SHA-256) trước khi lưu vào cơ sở dữ liệu.

- Hỗ trợ và bảo mật tuyệt đối các giao dịch tài chính thông qua việc tích hợp mã hóa SSL/TLS cho mọi kết nối truyền tải dữ liệu giữa người dùng và các cổng thanh toán.

##### 4.1.3.4. Khả năng bảo trì

- Mã nguồn hệ thống và cấu trúc kiến trúc phải được thiết kế theo các tiêu chuẩn Clean Code, giúp đội ngũ lập trình viên dễ dàng bảo trì, phát hiện/sửa lỗi và cập nhật tính năng mới.

- Tài liệu kỹ thuật của hệ thống, bao gồm tài liệu thiết kế API, hướng dẫn vận hành và nhật ký thay đổi (changelog) phải được cập nhật định kỳ và liên tục.

##### 4.1.3.5. Tính chính xác và nhất quán

- Hệ thống phải ghi vết (log) đầy đủ và chính xác tất cả các thông tin liên quan đến giao dịch đặt chỗ của người dùng, bao gồm: chi tiết dịch vụ đặt, thông tin khách hàng, lịch sử thay đổi trạng thái đơn hàng và biên lai thanh toán.

- Cung cấp cơ chế tự động đối soát, phát hiện và quản lý các giao dịch lỗi hoặc giao dịch không đồng bộ để đảm bảo dữ liệu tài chính luôn chính xác 100%.

##### 4.1.3.6. Khả năng phục hồi

- Hệ thống phải thiết lập phương án sao lưu (backup) dữ liệu tự động định kỳ hàng ngày nhằm đảm bảo khả năng khôi phục nhanh chóng khi xảy ra sự cố phần cứng, phần mềm hoặc mất mát dữ liệu.

- Quy trình khôi phục hệ thống (Disaster Recovery) phải đảm bảo đưa hệ thống trở lại trạng thái hoạt động bình thường trong thời gian tối đa là 2 giờ kể từ khi phát hiện sự cố nghiêm trọng gây ngừng hoạt động.

##### 4.1.3.7. Giao diện người dùng

- Giao diện người dùng (UI/UX) phải được thiết kế đơn giản, hiện đại, thân thiện, giúp khách hàng có thể thực hiện quy trình đặt chỗ một cách mượt mà và nhanh chóng.

- Giao diện phải hỗ trợ thiết kế đáp ứng (Responsive Design) hoàn hảo trên các nền tảng thiết bị di động, máy tính bảng và máy tính để bàn; ngôn ngữ hiển thị mặc định và tối ưu là Tiếng Việt.

## 5. Yêu cầu tổng thể

### 5.1. Kiến trúc hệ thống

- Hệ thống được triển khai theo mô hình kiến trúc Client - Server phân lớp tách biệt (Decoupled Architecture) bao gồm ba thành phần chính: Frontend (React.js), Backend (Express.js/Node.js) và Cloud Database (Supabase PostgreSQL).

- Toàn bộ ứng dụng (cả Frontend và Backend) được container hóa bằng Docker nhằm đảm bảo tính nhất quán giữa các môi trường phát triển (Development, Staging, Production).

- Hệ thống được triển khai trên các nền tảng đám mây hiện đại hỗ trợ Serverless hoặc PaaS (như Vercel cho Frontend React.js; và Render, AWS ECS, hoặc Railway cho Backend Express.js) giúp tự động hóa việc điều phối tài nguyên và mở rộng quy mô (Auto Scaling) dựa trên lưu lượng truy cập thực tế.

### 5.2. Công nghệ Backend

- Sử dụng môi trường **Node.js** kết hợp với Framework **Express.js** để xây dựng hệ thống xử lý logic nghiệp vụ phía Backend, cung cấp hệ thống mã nguồn gọn nhẹ, tối ưu hóa xử lý bất đồng bộ (Asynchronous I/O) và cung cấp các chuẩn RESTful API chất lượng cao cho Frontend.

- Sử dụng cơ chế mã thông báo bảo mật **JWT (JSON Web Tokens)** kết hợp phân quyền **RBAC (Role-Based Access Control)** để thực hiện việc xác thực và phân quyền người dùng (Khách hàng, Nhân viên, Admin) trên mỗi phiên làm việc một cách an toàn thông qua Middleware của Express.js.

### 5.3. Công nghệ Frontend

- Sử dụng Framework **React.js** để phát triển giao diện người dùng. Tận dụng các tính năng nâng cao của React.js như SSR (Server-Side Rendering) cho các trang cần tối ưu SEO (trang chủ, chi tiết tour), ISR (Incremental Static Regeneration) cho các trang thông tin tĩnh để tối ưu tốc độ tải và Hydration mượt mà cho trải nghiệm ứng dụng đơn trang (SPA).

- Tận dụng mạng phân phối nội dung **Vercel Edge Network / CDN** mặc định của React.js để phân phối tài nguyên tĩnh gần vị trí địa lý của người dùng nhất, tối ưu hóa tốc độ phản hồi trang tại Việt Nam.

### 5.4. Cơ sở dữ liệu

- Sử dụng **Supabase PostgreSQL** dưới dạng dịch vụ Cloud Database tập trung để quản lý toàn bộ dữ liệu quan hệ của hệ thống (thông tin người dùng, dịch vụ du lịch, trạng thái đơn hàng).

- Tận dụng các tính năng cao cấp của PostgreSQL trên Supabase như Cơ chế giao dịch (Database Transactions) để đảm bảo tính toàn vẹn dữ liệu, Connection Pooling để tối ưu số lượng kết nối đồng thời, và tính năng Realtime để cập nhật trạng thái đơn hàng ngay lập tức.

### 5.5. Lưu trữ và quản lý tài liệu

- Sử dụng **Cloudinary** làm kho lưu trữ đối tượng (Object Storage) và mạng phân phối hình ảnh (Image CDN) cho toàn bộ tài nguyên đa phương tiện dung lượng lớn của hệ thống (hình ảnh tour du lịch chất lượng cao, video giới thiệu, ảnh đại diện người dùng, hóa đơn PDF).

- Ứng dụng các API tối ưu hóa tự động của Cloudinary để tự động nén, thay đổi kích thước (Resize), và chuyển đổi định dạng ảnh sang các chuẩn thế hệ mới (WebP, AVIF) trước khi trả về cho Frontend React.js, giúp tiết kiệm băng thông tối đa.

### 5.6. Bảo mật hệ thống

- Toàn bộ lưu lượng mạng truyền tải giữa React.js (Client), Express.js (Server), Supabase và Cloudinary bắt buộc phải chạy qua giao thức mã hóa **SSL/TLS (HTTPS/WSS)** nhằm ngăn chặn nguy cơ tấn công nghe lén (Man-in-the-middle).

- Áp dụng tính năng **Supabase RLS (Row Level Security)** tại lớp cơ sở dữ liệu để bảo vệ dữ liệu ở mức độ dòng, đảm bảo người dùng hoặc hacker không thể truy cập hay chỉnh sửa trái phép dữ liệu của người khác ngay cả khi lộ kết nối API.

- Thiết lập hệ thống tường lửa ứng dụng web (WAF) và cơ chế Rate Limiting (thông qua Middleware trong Express.js hoặc Cloudflare) để ngăn chặn các cuộc tấn công Brute Force, DDoS, SQL Injection và Cross-Site Scripting (XSS).

### 5.7. Thanh toán và bảo mật giao dịch

- Hệ thống tích hợp trực tiếp với các cổng thanh toán trực tuyến và ví điện tử phổ biến tại Việt Nam bao gồm **VNPAY** và **MoMo**, tuân thủ nghiêm ngặt các tiêu chuẩn bảo mật thanh toán quốc tế (như PCI-DSS).

- Toàn bộ quy trình khởi tạo đường dẫn thanh toán (Payment URL) và xác thực gói tin kết quả giao dịch ngầm (**IPN / Webhook**) từ VNPAY/MoMo bắt buộc phải được xử lý biệt lập và bảo mật tại Backend Express.js bằng khóa bí mật (Secret Key/Hash Key), tuyệt đối không để lộ mã kiểm tra tính toàn vẹn (Checksum) ra phía Frontend React.js.

### 5.8. Hạ tầng triển khai và cân bằng tải

- Ứng dụng mô hình triển khai tự động (Managed Hosting) với **Vercel** (dành cho React.js) và các nền tảng Container hỗ trợ Docker như **Render/Railway** hoặc **AWS ECS Fargate** (dành cho Express.js), giúp hệ thống tự động cân bằng tải (Load Balancing) và co giãn tài nguyên theo chiều ngang (Horizontal Scaling) khi số lượng Request tăng đột biến vào mùa du lịch cao điểm.

### 5.9. Giám sát và quản lý log

- Tích hợp các thư viện ghi log chuyên dụng trong Express.js như **Winston** hoặc **Morgan** để tập trung lưu vết cấu trúc log (Error Logs, Request Logs, Transaction Logs).

- Kết nối log hệ thống với các dịch vụ giám sát tập trung đám mây (như Datadog, Loggly, Supabase Logs hoặc chính hệ thống Log tích hợp của Render/Vercel) giúp đội ngũ kỹ thuật giám sát sức khỏe ứng dụng theo thời gian thực và xử lý nhanh các mã lỗi (5xx, 4xx).

### 5.10. Quy trình CI/CD

- Thiết lập chu trình tích hợp và triển khai tự động (CI/CD Pipeline) thông qua **GitHub Actions** liên kết trực tiếp với Vercel và môi trường chạy Backend.

- Mỗi khi nhà phát triển đẩy mã nguồn mới lên nhánh main/production, hệ thống sẽ tự động chạy các bài kiểm thử tự động (Unit Test với Jest, Integration Test), nếu vượt qua sẽ tự động build thành Docker Image mới và deploy không gây gián đoạn dịch vụ (Zero-downtime Deployment).

### 5.11. Gửi Thông Báo (Notification)

- Hệ thống xây dựng module thông báo thời gian thực kết hợp giữa Backend Express.js và Frontend React.js:

  - **Thông báo trên ứng dụng (In-app/Push Notifications):** Sử dụng Firebase Cloud Messaging (FCM) hoặc cơ chế Realtime/Websocket của Supabase để đẩy các cập nhật trạng thái đơn hàng trực tiếp lên màn hình của người dùng.

  - **Sự kiện hệ thống:** Áp dụng mô hình Event-Driven bên trong Express.js (sử dụng EventEmitter hoặc các Message Queue nhẹ như Redis BullMQ) để khi một hành động hoàn tất (ví dụ: Thanh toán thành công), hệ thống sẽ tự động kích hoạt tiến trình ngầm gửi mail qua SendGrid và đẩy thông báo mà không làm nghẽn luồng xử lý chính của người dùng.

### 5.12. Gửi Email

- Sử dụng dịch vụ **SendGrid Email API** để phụ trách toàn bộ luồng gửi email giao dịch (Transactional Emails) tự động từ hệ thống Backend Express.js đến khách hàng bao gồm: Email kích hoạt/mã xác thực tài khoản, Email xác nhận đặt chỗ thành công (Booking Confirmation) và Email đính kèm Lịch trình thông minh (Smart Itinerary) kèm hóa đơn giao dịch.

### 5.13. Lưu trữ và Theo dõi Thông Báo và Email

- Tận dụng hệ thống quản trị Dashboard và tính năng Webhook của **SendGrid** để theo dõi, giám sát trạng thái của toàn bộ email được phát đi (tỷ lệ gửi thành công, tỷ lệ mail bị chuyển vào hòm thư rác - Spam, tỷ lệ email bị trả lại - Bounce Rate, và tỷ lệ mở mail của khách hàng).

- Toàn bộ lịch sử giao dịch và trạng thái gửi email/thông báo thành công hay thất bại đều được ghi nhận lại trong các bảng lịch sử (Log Tables) thuộc cơ sở dữ liệu Supabase PostgreSQL nhằm phục vụ công tác đối soát dữ liệu và hỗ trợ giải quyết khiếu nại của khách hàng.

## 6. Yêu cầu chất lượng ứng dụng

| **Yêu cầu chất lượng** | **Chuẩn chất lượng tham chiếu** | **Mục tiêu** | **Phương thức** |
| --- | --- | --- | --- |
| **Độ tin cậy** | ISO/IEC 25010 (Reliability) | Đảm bảo hệ thống có khả năng vận hành liên tục ổn định, không gặp các lỗi nghiêm trọng gây gián đoạn dịch vụ trong ít nhất 99.9% thời gian vận hành (Chỉ số MTBF - Mean Time Between Failures đạt tối thiểu 1.200 giờ). | Thực hiện định kỳ các bài kiểm tra áp lực (Stress Testing) và kiểm tra khả năng chịu lỗi của hạ tầng (Fault-Tolerance Testing) nhằm đảm bảo hệ thống không bị sập khi chịu tải cao. |
| **Tính chính xác và nhất quán** | ISO/IEC 25012 (Data Quality Model) | Dữ liệu liên quan đến quy trình đặt chỗ (Booking), thông tin hành khách và giao dịch tài chính phải đạt độ chính xác tuyệt đối 100%. Mọi trường hợp sai lệch dữ liệu phát sinh phải được hệ thống phát hiện và xử lý trong vòng 12 giờ. | Áp dụng các bài kiểm tra tích hợp dữ liệu (Integration Testing) dữ dội và xây dựng các script tự động đối soát chéo dữ liệu giữa database hệ thống và log của cổng thanh toán. |
| **Khả năng sử dụng** | ISO 9241-11 (Usability) | Đảm bảo giao diện tối ưu trải nghiệm, chỉ số Usability Score đạt ít nhất 85% trong các đợt kiểm thử chấp nhận người dùng (UAT). Khách hàng bình thường phải có thể hoàn thành quy trình đặt dịch vụ trong vòng tối đa 4 bước thao tác cơ bản. | Thực hiện các bài kiểm tra trải nghiệm người dùng thực tế (UX Testing), theo dõi bản đồ nhiệt tương tác (Heatmap) và thực hiện khảo sát độ hài lòng của khách hàng sau khi hệ thống chạy thử nghiệm. |
| **Tính ổn định** | ISO/IEC 25010 (Stability) | Hệ thống phải duy trì trạng thái hoạt động mượt mà dưới các điều kiện tải tiêu chuẩn mà không phát sinh các lỗi treo ứng dụng bất ngờ. Chỉ số MTTR (Mean Time to Recovery) đối với các lỗi phần mềm thông thường phải dưới 5 phút nhờ cơ chế tự chữa lành (Auto-healing). | Sử dụng công cụ mô phỏng tải cao (Load Testing) để liên tục đánh giá độ ổn định của các container ứng dụng khi có sự tăng trưởng đột biến về lượng truy cập của khách hàng. |
| **Khả năng phục hồi dữ liệu** | ISO/IEC 27040 (Storage Security) | Hệ thống thực hiện sao lưu tự động toàn bộ cơ sở dữ liệu hàng ngày. Chỉ số RPO (Recovery Point Objective - mức độ mất dữ liệu tối đa) không được vượt quá 24 giờ. Thời gian khôi phục toàn bộ hệ thống sau thảm họa (RTO) tối đa là 2 giờ. | Tổ chức các đợt diễn tập khôi phục hệ thống và dữ liệu định kỳ hàng quý từ các bản sao lưu trên Amazon RDS và Amazon S3 nhằm kiểm tra tính sẵn sàng của quy trình Disaster Recovery. |
| **Bảo mật** | ISO/IEC 27001 (Information Security Management), OWASP Top 10, PCI-DSS | **Xác thực & Phân quyền:** Bắt buộc áp dụng bảo mật 2 lớp (2FA) cho toàn bộ tài khoản có quyền quản trị (Admin/Staff) và phân quyền chặt chẽ theo chuẩn RBAC.<br><br>**Mã hóa dữ liệu:** Mã hóa dữ liệu lưu trữ (Data-at-rest) bằng thuật toán AES-256 và dữ liệu truyền tải (Data-in-transit) bằng giao thức SSL/TLS.<br><br>**Bảo mật giao dịch:** Tuân thủ các nguyên tắc cốt lõi của PCI-DSS khi tích hợp các cổng thanh toán. | *Kiểm tra xâm nhập (Penetration Testing):* Thuê đơn vị độc lập thực hiện pentest định kỳ hàng năm nhằm tìm kiếm lỗ hổng.<br><br>*Đánh giá lỗ hổng:* Quét mã nguồn và kiểm tra hệ thống hàng quý dựa trên danh sách khuyến nghị bảo mật của OWASP Top 10.<br><br>*Kiểm tra tuân thủ:* Định kỳ rà soát các tiêu chí bảo mật hạ tầng mạng và lưu trữ dữ liệu theo chuẩn PCI-DSS. |

## 7. Tiêu chí chấp nhận ứng dụng

- **Hoàn thành chức năng:** Hệ thống phải hiện thực hóa đầy đủ tất cả các yêu cầu chức năng từ module FC-01 đến module FC-10 đã được liệt kê trong bảng chi tiết chức năng, với tỷ lệ lỗi phát sinh (Bug rate) kiểm thử trong giai đoạn nghiệm thu (UAT) phải dưới mức 3%.

- **Đáp ứng phi chức năng:** Hệ thống vượt qua các bài kiểm thử hiệu năng và bảo mật, đảm bảo đạt đúng các thông số kỹ thuật định lượng đã cam kết (Xử lý 1.000 request đồng thời, thời gian phản hồi trang dưới 1.5s - 2.5s).

- **Đạt chuẩn chất lượng:** Ứng dụng phải được chứng minh thỏa mãn các mục tiêu chất lượng dựa trên các chuẩn tham chiếu quốc tế đề ra trong bảng yêu cầu chất lượng ứng dụng (ISO/IEC 25010, ISO/IEC 25012, PCI-DSS).

- **Bàn giao đúng hạn:** Toàn bộ sản phẩm bao gồm mã nguồn sạch, tài liệu đặc tả hệ thống cập nhật, tài liệu hướng dẫn vận hành và hệ thống hoàn chỉnh trên môi trường Production phải được bàn giao chính xác theo đúng các mốc thời gian (Milestones) đã ký kết trong kế hoạch dự án.

- **Kiểm soát ngân sách:** Quy trình thiết kế, phát triển và cấu hình triển khai hạ tầng ban đầu phải được thực hiện trong phạm vi ngân sách đã được phê duyệt, cam kết không phát sinh thêm bất kỳ chi phí ngoài dự kiến nào nếu không có sự thay đổi về phạm vi yêu cầu (Scope) từ phía ban quản lý dự án.
