export const ADMIN_SERVICE_REVIEW_TYPES = Object.freeze([
  { value: 'tour', label: 'Tours (3)' },
  { value: 'hotel', label: 'Khách sạn (5)' },
  { value: 'flight', label: 'Chuyến bay (1)' },
  { value: 'train', label: 'Tàu hỏa (0)' },
])

export const ADMIN_SERVICE_REVIEW_ITEMS = Object.freeze([
  {
    id: 'review-ha-long-cruise',
    imageUrl: '/assets/template/service/list/tour-ha-long.png',
    capacity: 'Tối đa 10 hành khách',
    description:
      'Trải nghiệm nghỉ dưỡng đẳng cấp trên du thuyền 5 sao, tham quan hang Sửng Sốt, chèo kayak tại hang Luồn và thưởng thức ẩm thực hải sản tươi sống. Dịch vụ trọn gói sang trọng.',
    duration: '3 ngày 2 đêm',
    location: 'Hạ Long, Quảng Ninh',
    partnerName: 'Hạ Long Cruises',
    price: 10500000,
    tag: 'HOT',
    title: 'Khám phá Vịnh Hạ Long trên du thuyền 5 sao',
    type: 'tour',
  },
  {
    id: 'review-cao-bang',
    imageUrl: '/assets/template/home/v39_1679.png',
    capacity: '1 người',
    description:
      'Theo dấu chân người tìm hiểu về Thủ đô gió ngàn: Thác Bản Giốc, Động Ngườm Ngao, Khu di tích Pác Bó và Hồ Ba Bể.',
    duration: '4 ngày 3 đêm',
    location: 'Cao Bằng',
    partnerName: 'Cao Bang Heritage Travels',
    price: 8990000,
    tag: 'HOT',
    title: 'Pác Pó - Thác Bản Giốc - Ba Bể',
    type: 'tour',
  },
  {
    id: 'review-ha-giang',
    imageUrl: '/assets/template/home/v39_1685.png',
    capacity: '1 người',
    description:
      'Hành trình chinh phục những tọa độ biểu tượng của cực Bắc và đắm chìm trong sắc màu văn hóa độc bản trên Cao nguyên đá.',
    duration: '2 ngày 1 đêm',
    location: 'Hà Giang',
    partnerName: 'Ha Giang Adventure Travel',
    price: 3590000,
    tag: 'HOT',
    title: 'Lũng Cú - Cao Nguyên Đá Đồng Văn - Lô Lô Chải',
    type: 'tour',
  },
])

export const ADMIN_SERVICE_CREATE_INITIAL_FORM = Object.freeze({
  amenities: 'Khách sạn 5*, Vé máy bay',
  description: '',
  destination: '',
  itineraryDayOne:
    '08:00 AM - Hướng dẫn viên đón khách tại điểm hẹn. Khởi hành tham quan Đại Nội - Hoàng cung của 13 vị vua triều Nguyễn.',
  itineraryDayTwo: '',
  price: '0',
  serviceType: 'tour',
  status: 'active',
  title: '',
})
