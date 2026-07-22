import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import { vietnamProvinceOptions } from '../data/vietnamProvinces.js'

export const homePageFixture = Object.freeze({
  hero: {
    title_leading: 'Khám phá',
    title_script: 'Việt Nam',
    description:
      'Hành trình di sản cao cấp, kết nối tinh hoa văn hóa truyền thống với những trải nghiệm nghỉ dưỡng xa hoa nhất.',
    cta_label: 'Bắt đầu hành trình',
    cta_path: '/services',
    art_image_alt: 'Nét Việt Travel collage',
    art_image_url: '/assets/template/home/v39_1982.png',
  },
  search_defaults: {
    from: 'TP. Hồ Chí Minh (SGN)',
    to: 'Hà Nội (HAN)',
    start_date: '2026-07-12',
    end_date: '2026-07-24',
    sort: 'Giá rẻ nhất',
    filters: {
      airline: '',
      tour: '',
      hotel: '',
      train: '',
    },
  },
  featured_services: [],
  flash_sale_services: [
    {
      id: 'home-flash-hotel-ha-long',
      service_code: 'HOTEL-HOME-101',
      service_type: SERVICE_TYPES.hotel,
      title: 'Vinpearl Resort & Spa Hạ Long',
      slug: 'vinpearl-resort-spa-ha-long',
      short_description:
        'Thư giãn và tái tạo năng lượng giữa thiên nhiên Vịnh Hạ Long.',
      location_text: 'Hạ Long',
      base_price: 2420000,
      sale_price: 1450000,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v1_107.png',
      details: {
        discount_percent: 40,
        price_unit: '/đêm',
      },
    },
    {
      id: 'home-flash-hotel-nha-trang',
      service_code: 'HOTEL-HOME-102',
      service_type: SERVICE_TYPES.hotel,
      title: 'Amanoi Resort Nha Trang',
      slug: 'amanoi-resort-nha-trang',
      short_description:
        'Đỉnh cao của sự riêng tư và sang trọng bậc nhất Việt Nam.',
      location_text: 'Nha Trang',
      base_price: 18770000,
      sale_price: 12200000,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v1_122.png',
      details: {
        discount_percent: 35,
        price_unit: '/đêm',
      },
    },
    {
      id: 'home-flash-combo-hoi-an',
      service_code: 'COMBO-HOME-103',
      service_type: SERVICE_TYPES.combo,
      title: 'Combo Gourmet Hội An',
      slug: 'combo-gourmet-hoi-an',
      short_description:
        'Thưởng thức tinh hoa ẩm thực phố Hội trên thuyền rồng.',
      location_text: 'Hội An',
      base_price: 2400000,
      sale_price: 1800000,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v1_137.png',
      details: {
        discount_percent: 25,
        price_unit: '/khách',
      },
    },
  ],
  destinations: [
    {
      id: 'home-destination-da-nang',
      service_code: 'DEST-HOME-201',
      service_type: SERVICE_TYPES.tour,
      title: 'Đà Nẵng',
      slug: 'da-nang',
      short_description: 'Thành phố của những cây cầu & bãi biển quyến rũ.',
      location_text: 'Đà Nẵng',
      base_price: 0,
      sale_price: 0,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v39_1669.png',
      details: {
        badge_text: 'HOT DESTINATION',
        card_size: 'tall',
      },
    },
    {
      id: 'home-destination-sapa',
      service_code: 'DEST-HOME-202',
      service_type: SERVICE_TYPES.tour,
      title: 'Sapa',
      slug: 'sapa',
      short_description: 'Sương mù & Ruộng bậc thang.',
      location_text: 'Sapa',
      base_price: 0,
      sale_price: 0,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v39_1679.png',
      details: {
        badge_text: '',
        card_size: 'small',
      },
    },
    {
      id: 'home-destination-ninh-binh',
      service_code: 'DEST-HOME-203',
      service_type: SERVICE_TYPES.tour,
      title: 'Ninh Bình',
      slug: 'ninh-binh',
      short_description: 'Hạ Long trên cạn.',
      location_text: 'Ninh Bình',
      base_price: 0,
      sale_price: 0,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v39_1685.png',
      details: {
        badge_text: '',
        card_size: 'small',
      },
    },
    {
      id: 'home-destination-phu-quoc',
      service_code: 'DEST-HOME-204',
      service_type: SERVICE_TYPES.hotel,
      title: 'Phú Quốc',
      slug: 'phu-quoc',
      short_description: 'Thiên đường nghỉ dưỡng nhiệt đới.',
      location_text: 'Phú Quốc',
      base_price: 0,
      sale_price: 0,
      currency: 'VND',
      status: SERVICE_STATUSES.active,
      image_url: '/assets/template/home/v39_1693.png',
      details: {
        badge_text: '',
        card_size: 'wide',
      },
    },
  ],
  value_props: [
    {
      icon: 'shield',
      tone: 'red',
      title: 'Chất lượng 5 Sao',
      description:
        'Mọi dịch vụ từ khách sạn đến vận chuyển đều đạt tiêu chuẩn cao nhất.',
    },
    {
      icon: 'gem',
      tone: 'gold',
      title: 'Trải nghiệm độc bản',
      description:
        'Các hành trình được thiết kế riêng tư, mang đậm bản sắc văn hóa địa phương.',
    },
    {
      icon: 'support',
      tone: 'red',
      title: 'Hỗ trợ 24/7',
      description:
        'Đội ngũ chuyên gia luôn sẵn sàng đồng hành cùng bạn trên mọi nẻo đường.',
    },
  ],
  flash_sale_meta: {
    day_label: 'NGÀY',
    hour_label: 'GIỜ',
    minute_label: 'PHÚT',
    timer: {
      days: '00',
      hours: '22',
      minutes: '00',
    },
  },
  provinces: vietnamProvinceOptions,
})

