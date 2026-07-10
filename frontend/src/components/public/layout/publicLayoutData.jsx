export const PUBLIC_PRIMARY_NAV_ITEMS = Object.freeze([
  { label: 'Trang chủ', to: '/', end: true },
  { label: 'Tour', to: '/services' },
  { label: 'Khách sạn', to: '/hotels' },
])

export const PUBLIC_FOOTER_COMPANY_LINKS = Object.freeze([
  {
    id: 'services',
    label: 'Khám phá tour',
    to: '/services',
  },
  {
    id: 'travel-handbook',
    label: 'Cẩm nang du lịch',
    to: '/travel-handbook',
  },
  {
    id: 'blog',
    label: 'Blog & cảm hứng',
    to: '/blog',
  },
])

export const PUBLIC_FOOTER_SUPPORT_LINKS = Object.freeze([
  {
    id: 'help-center',
    label: 'Trung tâm trợ giúp',
    to: '/help-center',
  },
  {
    id: 'customer-care',
    label: 'Chăm sóc khách hàng',
    to: '/customer-care',
  },
  {
    id: 'profile',
    label: 'Tài khoản của bạn',
    to: '/profile',
  },
])

export const PUBLIC_FOOTER_CONTACT_ITEM_DEFINITIONS = Object.freeze([
  {
    id: 'address',
    title: 'Địa chỉ',
    icon: (
      <path d="M12 2.6a5.9 5.9 0 0 0-5.9 5.9c0 4.5 5.9 11.3 5.9 11.3s5.9-6.8 5.9-11.3A5.9 5.9 0 0 0 12 2.6Zm0 8.3A2.4 2.4 0 1 1 12 6a2.4 2.4 0 0 1 0 4.9Z" />
    ),
  },
  {
    id: 'support_email',
    title: 'Email',
    icon: (
      <path d="M3.5 5.8h17a1 1 0 0 1 1 1v10.4a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V6.8a1 1 0 0 1 1-1Zm0 1.7v.2l8.5 5.9 8.5-5.9v-.2h-17Zm17 8.9V9.6l-8 5.5a1 1 0 0 1-1 0l-8-5.5v6.8h17Z" />
    ),
  },
  {
    id: 'hotline',
    title: 'Điện thoại',
    icon: (
      <path d="M6.8 3.4h2.7c.5 0 .9.3 1 .8l.5 2.8c.1.4 0 .8-.3 1l-1.4 1.5a13 13 0 0 0 5.4 5.4l1.5-1.4c.3-.3.7-.4 1-.3l2.8.5c.5.1.8.5.8 1v2.7c0 .6-.5 1.1-1.1 1.1A17.2 17.2 0 0 1 5.7 4.5c0-.6.5-1.1 1.1-1.1Z" />
    ),
  },
  {
    id: 'business_hours',
    title: 'Giờ làm việc',
    icon: (
      <>
        <circle cx="12" cy="12" fill="none" r="8.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 7.8v4.6l3 1.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </>
    ),
  },
])

export const PUBLIC_FOOTER_SOCIAL_ITEMS = Object.freeze([
  {
    id: 'instagram',
    label: 'Instagram',
    icon: (
      <>
        <rect
          fill="none"
          height="13"
          rx="4"
          ry="4"
          stroke="currentColor"
          strokeWidth="1.8"
          width="13"
          x="5.5"
          y="5.5"
        />
        <circle cx="12" cy="12" fill="none" r="3.1" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.8" cy="7.3" r="1.15" />
      </>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <path d="M13.8 20v-6h2.6l.4-3h-3V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V11H8.3v3h2.5v6h3Z" />
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: (
      <path d="M14.7 4.5c.5 1.5 1.5 2.6 3 3.2v2.6a5.6 5.6 0 0 1-3-1v4.7a4.7 4.7 0 1 1-4.7-4.7c.3 0 .7 0 1 .1v2.7a2.2 2.2 0 1 0 1.2 2v-9.6h2.5Z" />
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: (
      <>
        <path
          d="M18.7 7.1c-.3-1.1-1.2-1.9-2.3-2.2C15 4.5 12 4.5 12 4.5s-3 0-4.4.4C6.5 5.2 5.6 6 5.3 7.1 5 8.5 5 11 5 11s0 2.5.3 3.9c.3 1.1 1.2 1.9 2.3 2.2 1.4.4 4.4.4 4.4.4s3 0 4.4-.4c1.1-.3 2-1.1 2.3-2.2.3-1.4.3-3.9.3-3.9s0-2.5-.3-3.9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="m10.2 13.9 4.4-2.9-4.4-2.9v5.8Z" />
      </>
    ),
  },
])
