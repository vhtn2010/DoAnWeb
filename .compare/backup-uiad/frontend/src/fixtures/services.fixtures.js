const detailGalleryImages = {
  hero: '/assets/template/service/detail/ha-long-gallery-main.png',
  cabin: '/assets/template/service/detail/ha-long-gallery-cabin.png',
  dinner: '/assets/template/service/detail/ha-long-gallery-dinner.png',
  deck: '/assets/template/service/detail/ha-long-gallery-deck.png',
  sunset: '/assets/template/service/detail/ha-long-gallery-sunset.png',
}

const locationGalleryImages = {
  mienTrung: [
    '/assets/template/service/list/tour-mien-trung.png',
    '/assets/template/service/detail/recommendation-mien-trung.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/10549-Hoi-An_%2837621348460%29.jpg/330px-10549-Hoi-An_%2837621348460%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/2024-12-20_Hoi_An_Old_Town_at_night_5.jpg/250px-2024-12-20_Hoi_An_Old_Town_at_night_5.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/%C4%90%E1%BA%A1i_n%E1%BB%99i.jpg/330px-%C4%90%E1%BA%A1i_n%E1%BB%99i.jpg',
  ],
  daLat: [
    '/assets/template/service/list/tour-da-lat.png',
    '/assets/template/service/detail/recommendation-da-lat.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Xuan_Huong_Lake_11.jpg/250px-Xuan_Huong_Lake_11.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Da_Lat_train_station_12.jpg/500px-Da_Lat_train_station_12.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Bao_Dai%27s_Summer_Palace_00.jpg/330px-Bao_Dai%27s_Summer_Palace_00.jpg',
  ],
  mienTay: [
    '/assets/template/service/list/tour-mien-tay.png',
    '/assets/template/service/detail/recommendation-mien-tay.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/M%E1%BB%99t_c%E1%BA%A3nh_%E1%BB%9F_ch%E1%BB%A3_n%E1%BB%95i_C%C3%A1i_R%C4%83ng.jpg/330px-M%E1%BB%99t_c%E1%BA%A3nh_%E1%BB%9F_ch%E1%BB%A3_n%E1%BB%95i_C%C3%A1i_R%C4%83ng.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/M%E1%BB%99t_c%E1%BA%A3nh_ch%E1%BB%A3_n%E1%BB%95i_C%C3%A1i_R%C4%83ng.jpg/330px-M%E1%BB%99t_c%E1%BA%A3nh_ch%E1%BB%9F_n%E1%BB%95i_C%C3%A1i_R%C4%83ng.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Cai_Rang_1.jpg/120px-Cai_Rang_1.jpg',
  ],
}

const sharedDepartureDates = ['15/11/2024', '22/11/2024', '29/11/2024']

const sharedReviewSamples = [
  {
    author_name: 'Nguyễn Hoàng',
    author_initials: 'NH',
    month_label: 'Tháng 10, 2024',
    rating_value: 5,
    content:
      'Một trải nghiệm thực sự đẳng cấp. Du thuyền mới, sạch sẽ, nhân viên phục vụ rất chuyên nghiệp. Đồ ăn ngon và lịch trình rất hợp lý.',
  },
  {
    author_name: 'Trần Minh Anh',
    author_initials: 'MA',
    month_label: 'Tháng 11, 2024',
    rating_value: 5,
    content:
      'Đặt tour rất nhanh, xe đón đúng giờ và cabin thoải mái hơn mong đợi. Gia đình mình đặc biệt thích bữa tối trên boong tàu.',
  },
]

export const tourServiceFixtures = [
  {
    id: 'tour-da-nang-hoi-an-hue',
    service_code: 'TOUR-DN-001',
    service_type: 'tour',
    title: 'Di sản Miền Trung: Đà Nẵng - Hội An - Huế Hành trình thượng lưu',
    slug: 'di-san-mien-trung-da-nang-hoi-an-hue',
    short_description:
      'Khám phá miền di sản với lịch trình tinh gọn, nghỉ dưỡng chỉn chu và trải nghiệm đậm bản sắc.',
    description:
      'Hành trình đưa bạn đi qua những biểu tượng di sản miền Trung với nhịp độ vừa vặn, lưu trú cao cấp và những điểm dừng giàu chiều sâu văn hoá.',
    provider_name: 'Net Viet Travel',
    location_text: 'Đà Nẵng - Hội An - Huế',
    base_price: 6500000,
    sale_price: 5200000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-mien-trung.png',
    cancellation_policy: 'Miễn phí đổi ngày trước 5 ngày khởi hành.',
    gallery_images: locationGalleryImages.mienTrung,
    review_samples: sharedReviewSamples,
    details: {
      duration_days: 3,
      duration_nights: 2,
      transport_type: 'car',
      departure_location: 'Đà Nẵng',
      destination_location: 'Đà Nẵng - Hội An - Huế',
      departure_dates: sharedDepartureDates,
      itinerary: [
        {
          day_number: 1,
          title: 'Ngày 1: Đà Nẵng - Hội An - Phố cổ về đêm',
          summary:
            'Đón khách tại sân bay Đà Nẵng, tham quan Ngũ Hành Sơn và dành trọn buổi tối dạo bước trong phố cổ Hội An lung linh đèn lồng.',
          highlights: [
            '09:30: Đón khách tại sân bay Đà Nẵng',
            '11:00: Tham quan Ngũ Hành Sơn',
            '15:00: Check-in resort ven sông Hoài',
            '19:00: Dạo phố cổ, thả hoa đăng',
          ],
        },
        {
          day_number: 2,
          title: 'Ngày 2: Hội An - Cố đô Huế',
          summary:
            'Khởi hành ra Huế qua cung đường đèo Hải Vân, tham quan Đại Nội và thưởng thức ẩm thực cung đình trong không gian cổ kính.',
          highlights: [
            '07:30: Ăn sáng và trả phòng',
            '10:30: Check-in đèo Hải Vân',
            '14:00: Tham quan Đại Nội Huế',
            '19:30: Thưởng thức ẩm thực cung đình',
          ],
        },
        {
          day_number: 3,
          title: 'Ngày 3: Huế - Đà Nẵng',
          summary:
            'Tận hưởng buổi sáng chậm rãi bên sông Hương, ghé chùa Thiên Mụ trước khi xe đưa đoàn quay lại Đà Nẵng.',
          highlights: [
            '06:30: Tản bộ sông Hương',
            '08:30: Chùa Thiên Mụ',
            '11:30: Ăn trưa đặc sản Huế',
            '15:30: Về lại Đà Nẵng',
          ],
        },
      ],
      included_services: [
        'Xe đưa đón theo lịch trình',
        'Khách sạn 4 sao và bữa sáng',
        'Vé tham quan các điểm di sản',
        'Hướng dẫn viên địa phương giàu kinh nghiệm',
      ],
      excluded_services: [
        'Vé máy bay đến/đi Đà Nẵng',
        'Chi phí cá nhân và tiền tip',
        'Đồ uống ngoài chương trình',
      ],
      terms: [
        'Lịch trình có thể thay đổi theo thời tiết và điều kiện vận hành thực tế.',
        'Giá áp dụng cho khách lẻ ghép đoàn, số lượng tối thiểu 2 khách.',
        'Khuyến khích mang giày thấp và trang phục thoải mái khi tham quan.',
      ],
    },
  },
  {
    id: 'tour-ha-long-signature',
    service_code: 'TOUR-HL-002',
    service_type: 'tour',
    title: 'Khám phá Vịnh Hạ Long - Du thuyền Signature 5 sao',
    slug: 'nghi-duong-vinh-ha-long-du-thuyen-signature',
    short_description:
      'Du thuyền chuẩn 5 sao, hải trình riêng tư giữa kỳ quan thiên nhiên nổi tiếng nhất miền Bắc.',
    description:
      'Hành trình nghỉ dưỡng trên du thuyền Signature 5 sao đưa bạn băng qua Vịnh Hạ Long và Bái Tử Long với những khoảnh khắc bình minh, hoạt động ngoài trời và bữa tối tinh tế giữa mặt nước.',
    provider_name: 'Net Viet Travel',
    location_text: 'Vịnh Hạ Long, Quảng Ninh',
    base_price: 6500000,
    sale_price: 4850000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-ha-long.png',
    cancellation_policy: 'Giữ chỗ linh hoạt, miễn phí đổi ngày trước 7 ngày khởi hành.',
    gallery_images: [
      detailGalleryImages.hero,
      detailGalleryImages.cabin,
      detailGalleryImages.dinner,
      detailGalleryImages.deck,
      detailGalleryImages.sunset,
    ],
    review_samples: sharedReviewSamples,
    details: {
      duration_days: 2,
      duration_nights: 1,
      transport_type: 'mixed',
      departure_location: 'Hà Nội',
      destination_location: 'Vịnh Hạ Long - Bái Tử Long',
      departure_dates: sharedDepartureDates,
      itinerary: [
        {
          day_number: 1,
          title: 'Ngày 1: Hà Nội - Vịnh Hạ Long - Vịnh Bái Tử Long',
          summary:
            'Khởi hành từ Hà Nội bằng xe Limousine cao cấp. Làm thủ tục lên tàu, thưởng thức bữa trưa đặc sắc và bắt đầu hành trình khám phá những hòn đảo kỳ thú trên vịnh.',
          highlights: [
            '12:30: Lên du thuyền Signature',
            '13:00: Thưởng thức bữa trưa buffet',
            '15:00: Chèo Kayak tại khu vực Hang Luồn',
            '18:00: Tiệc trà chiều trên Sundeck',
          ],
        },
        {
          day_number: 2,
          title: 'Ngày 2: Hang Thiên Cảnh Sơn - Vịnh Hạ Long - Hà Nội',
          summary:
            'Đón bình minh trên biển, tham gia lớp học Thái Cực Quyền. Khám phá hang động kỳ vĩ và tận hưởng những giờ phút thư giãn cuối cùng trước khi về cảng.',
          highlights: [
            '06:30: Lớp học Tai Chi',
            '07:30: Thăm hang Thiên Cảnh Sơn',
            '10:00: Bữa trưa sớm (Brunch)',
            '11:30: Cập bến, xe đưa về Hà Nội',
          ],
        },
      ],
      included_services: [
        'Xe Limousine khứ hồi Hà Nội - Hạ Long',
        'Cabin hạng sang trên du thuyền 5 sao',
        'Tất cả bữa ăn theo chương trình',
        'Vé tham quan các điểm du lịch',
      ],
      excluded_services: [
        'Đồ uống trong các bữa ăn',
        'Chi phí cá nhân, tiền tip',
        'Thuế VAT',
      ],
      terms: [
        'Lịch trình có thể thay đổi để phù hợp thủy triều và điều kiện thời tiết.',
        'Trẻ em từ 5 đến dưới 11 tuổi tính 70% giá người lớn khi ngủ cùng bố mẹ.',
        'Du khách cần mang theo giấy tờ tùy thân hợp lệ để làm thủ tục lên tàu.',
      ],
    },
  },
  {
    id: 'tour-da-lat-lang-phap',
    service_code: 'TOUR-DL-003',
    service_type: 'tour',
    title: 'Đà Lạt Mộng Mơ: Trải nghiệm Nghỉ dưỡng Cao cấp tại Làng Pháp',
    slug: 'da-lat-mong-mo-nghi-duong-lang-phap',
    short_description:
      'Không gian biệt thự giữa đồi thông, ẩm thực bản địa tinh tế và hành trình chậm rãi đúng chất Đà Lạt.',
    description:
      'Một kỳ nghỉ cao cấp tại Đà Lạt được thiết kế cho những ai yêu tiết trời se lạnh, nhịp sống thư thả và những điểm dừng đậm tính thẩm mỹ giữa đồi thông.',
    provider_name: 'Net Viet Travel',
    location_text: 'Đà Lạt, Lâm Đồng',
    base_price: 7200000,
    sale_price: 6100000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-da-lat.png',
    cancellation_policy: 'Đổi ngày miễn phí trước 10 ngày khởi hành.',
    gallery_images: locationGalleryImages.daLat,
    review_samples: sharedReviewSamples,
    details: {
      duration_days: 4,
      duration_nights: 3,
      transport_type: 'flight',
      departure_location: 'TP.HCM',
      destination_location: 'Đà Lạt',
      departure_dates: sharedDepartureDates,
      itinerary: [
        {
          day_number: 1,
          title: 'Ngày 1: TP.HCM - Đà Lạt - Làng Pháp',
          summary:
            'Bay đến Đà Lạt, nhận phòng biệt thự phong cách châu Âu và tận hưởng bữa tối ấm cúng giữa không gian đồi thông.',
          highlights: [
            '09:00: Bay từ TP.HCM',
            '11:30: Nhận phòng biệt thự',
            '15:30: Café và ngắm thông reo',
            '19:00: Bữa tối set menu',
          ],
        },
        {
          day_number: 2,
          title: 'Ngày 2: Chợ Đà Lạt - Hồ Tuyền Lâm',
          summary:
            'Khám phá nông sản địa phương, dạo hồ Tuyền Lâm và kết thúc ngày bằng một buổi picnic nhẹ nhàng trong tiết trời se lạnh.',
          highlights: [
            '07:00: Buffet sáng',
            '09:30: Chợ Đà Lạt',
            '14:00: Hồ Tuyền Lâm',
            '17:00: Picnic chiều',
          ],
        },
        {
          day_number: 3,
          title: 'Ngày 3: Thung lũng hoa - Làng gốm nghệ thuật',
          summary:
            'Một ngày dành cho nghệ thuật, nhiếp ảnh và những góc nhỏ bình yên mà Đà Lạt luôn khiến người ta muốn ở lại lâu hơn.',
          highlights: [
            '08:00: Vườn hoa theo mùa',
            '11:00: Workshop gốm thủ công',
            '15:00: Check-in tiệm bánh cổ điển',
            '19:30: Tự do khám phá đêm Đà Lạt',
          ],
        },
      ],
      included_services: [
        'Vé máy bay khứ hồi và hành lý tiêu chuẩn',
        'Biệt thự nghỉ dưỡng 4 sao',
        'Bữa sáng hằng ngày và 2 bữa tối',
        'Xe riêng đưa đón theo chương trình',
      ],
      excluded_services: [
        'Đồ uống gọi thêm',
        'Chi phí cá nhân',
        'Hoạt động ngoài lịch trình',
      ],
      terms: [
        'Nên mang áo khoác ấm vì nhiệt độ buổi tối xuống thấp.',
        'Giá chưa bao gồm phụ thu dịp lễ và cuối tuần dài ngày.',
        'Một số điểm check-in có thể thay đổi theo mùa hoa thực tế.',
      ],
    },
  },
  {
    id: 'tour-mien-tay-song-nuoc',
    service_code: 'TOUR-MT-004',
    service_type: 'tour',
    title: 'Miền Tây Sông Nước: Trải nghiệm Văn hoá Chợ Nổi Đích thực',
    slug: 'mien-tay-song-nuoc-cho-noi-dich-thuc',
    short_description:
      'Một vòng chợ nổi buổi sớm, ẩm thực miệt vườn và nhịp sống miền Tây chân thành, mộc mạc.',
    description:
      'Hành trình ngắn ngày nhưng giàu cảm xúc, đưa bạn chạm vào nhịp sống bản địa miền Tây qua chợ nổi, vườn trái cây và những bữa cơm đậm vị quê.',
    provider_name: 'Net Viet Travel',
    location_text: 'Cần Thơ - Sóc Trăng',
    base_price: 3500000,
    sale_price: 2450000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-mien-tay.png',
    cancellation_policy: 'Hỗ trợ đổi lịch trước 3 ngày khởi hành.',
    gallery_images: locationGalleryImages.mienTay,
    review_samples: sharedReviewSamples,
    details: {
      duration_days: 2,
      duration_nights: 1,
      transport_type: 'car',
      departure_location: 'TP.HCM',
      destination_location: 'Cần Thơ - Sóc Trăng',
      departure_dates: sharedDepartureDates,
      itinerary: [
        {
          day_number: 1,
          title: 'Ngày 1: TP.HCM - Cần Thơ - Chợ đêm Ninh Kiều',
          summary:
            'Xuôi về miền Tây, nhận phòng boutique hotel bên bến Ninh Kiều và thưởng thức bữa tối đậm vị sông nước.',
          highlights: [
            '07:30: Khởi hành từ TP.HCM',
            '11:30: Ăn trưa tại nhà vườn',
            '15:00: Nhận phòng khách sạn',
            '19:00: Dạo chợ đêm Ninh Kiều',
          ],
        },
        {
          day_number: 2,
          title: 'Ngày 2: Chợ nổi Cái Răng - Vườn trái cây',
          summary:
            'Dậy sớm xuống thuyền, nghe câu chuyện của thương hồ và ghé vườn trái cây trước khi trở về thành phố.',
          highlights: [
            '05:30: Lên thuyền đi chợ nổi',
            '07:00: Ăn sáng trên ghe',
            '09:30: Tham quan vườn trái cây',
            '14:30: Khởi hành về TP.HCM',
          ],
        },
      ],
      included_services: [
        'Xe đưa đón khứ hồi',
        'Khách sạn trung tâm 3 sao',
        'Tàu tham quan chợ nổi',
        '2 bữa chính và 1 bữa sáng',
      ],
      excluded_services: [
        'Đồ uống cá nhân',
        'Chi phí mua sắm đặc sản',
        'Thuế VAT',
      ],
      terms: [
        'Nên mang nón và quần áo thoáng mát cho hoạt động buổi sáng.',
        'Lịch chợ nổi phụ thuộc thời tiết và nhịp buôn bán thực tế.',
        'Tour phù hợp nhóm bạn và gia đình có trẻ nhỏ.',
      ],
    },
  },
]
