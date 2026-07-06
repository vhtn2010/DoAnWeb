import { NavLink, useLocation } from 'react-router-dom'
import {
  ADMIN_ROUTES,
  buildAdminPath,
  canViewAdminRoute,
  getAdminNavSections,
} from '../../constants/adminRoutes.js'
import './adminLayout.css'

function SidebarIcon({ children }) {
  return (
    <span aria-hidden="true" className="admin-sidebar__icon">
      {children}
    </span>
  )
}

function DashboardIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path d="M12 16V9H16V16H12ZM6 16V0H10V16H6ZM0 16V5H4V16H0Z" fill="currentColor" />
    </svg>
  )
}

function BookingIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M6 20C5.45 20 4.97917 19.8042 4.5875 19.4125C4.19583 19.0208 4 18.55 4 18C4 17.45 4.19583 16.9792 4.5875 16.5875C4.97917 16.1958 5.45 16 6 16C6.55 16 7.02083 16.1958 7.4125 16.5875C7.80417 16.9792 8 17.45 8 18C8 18.55 7.80417 19.0208 7.4125 19.4125C7.02083 19.8042 6.55 20 6 20ZM16 20C15.45 20 14.9792 19.8042 14.5875 19.4125C14.1958 19.0208 14 18.55 14 18C14 17.45 14.1958 16.9792 14.5875 16.5875C14.9792 16.1958 15.45 16 16 16C16.55 16 17.0208 16.1958 17.4125 16.5875C17.8042 16.9792 18 17.45 18 18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20ZM5.15 4L7.55 9H14.55L17.3 4H5.15ZM4.2 2H18.95C19.3333 2 19.625 2.17083 19.825 2.5125C20.025 2.85417 20.0333 3.2 19.85 3.55L16.3 9.95C16.1167 10.2833 15.8708 10.5417 15.5625 10.725C15.2542 10.9083 14.9167 11 14.55 11H7.1L6 13H18V15H6C5.25 15 4.68333 14.6708 4.3 14.0125C3.91667 13.3542 3.9 12.7 4.25 12.05L5.6 9.6L2 2H0V0H3.25L4.2 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M5.5 14.5L12.5 12.5L14.5 5.5L7.5 7.5L5.5 14.5ZM10 11.5C9.58333 11.5 9.22917 11.3542 8.9375 11.0625C8.64583 10.7708 8.5 10.4167 8.5 10C8.5 9.58333 8.64583 9.22917 8.9375 8.9375C9.22917 8.64583 9.58333 8.5 10 8.5C10.4167 8.5 10.7708 8.64583 11.0625 8.9375C11.3542 9.22917 11.5 9.58333 11.5 10C11.5 10.4167 11.3542 10.7708 11.0625 11.0625C10.7708 11.3542 10.4167 11.5 10 11.5ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z"
        fill="currentColor"
      />
    </svg>
  )
}

function InventoryIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M4 7.2 10 4l6 3.2-6 3.2L4 7.2Zm0 0v5.6L10 16l6-3.2V7.2M10 10.4V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M3 16V9H5V16H3ZM9 16V9H11V16H9ZM0 20V18H20V20H0ZM15 16V9H17V16H15ZM0 7V5L10 0L20 5V7H0ZM4.45 5H15.55L10 2.25L4.45 5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function RefundIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 18 20" width="18">
      <path
        d="M9 15L10.4 13.6L8.825 12H13V10H8.825L10.4 8.4L9 7L5 11L9 15ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H6.2C6.41667 1.4 6.77917 0.916667 7.2875 0.55C7.79583 0.183333 8.36667 0 9 0C9.63333 0 10.2042 0.183333 10.7125 0.55C11.2208 0.916667 11.5833 1.4 11.8 2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM2 18H16V4H2V18ZM9 3.25C9.21667 3.25 9.39583 3.17917 9.5375 3.0375C9.67917 2.89583 9.75 2.71667 9.75 2.5C9.75 2.28333 9.67917 2.10417 9.5375 1.9625C9.39583 1.82083 9.21667 1.75 9 1.75C8.78333 1.75 8.60417 1.82083 8.4625 1.9625C8.32083 2.10417 8.25 2.28333 8.25 2.5C8.25 2.71667 8.32083 2.89583 8.4625 3.0375C8.60417 3.17917 8.78333 3.25 9 3.25Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M19.4 12.25L12.25 19.4C12.05 19.6 11.825 19.75 11.575 19.85C11.325 19.95 11.075 20 10.825 20C10.575 20 10.325 19.95 10.075 19.85C9.825 19.75 9.6 19.6 9.4 19.4L0.575 10.575C0.391667 10.3917 0.25 10.1792 0.15 9.9375C0.05 9.69583 0 9.44167 0 9.175V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H9.175C9.44167 0 9.7 0.0541667 9.95 0.1625C10.2 0.270833 10.4167 0.416667 10.6 0.6L19.4 9.425C19.6 9.625 19.7458 9.85 19.8375 10.1C19.9292 10.35 19.975 10.6 19.975 10.85C19.975 11.1 19.9292 11.3458 19.8375 11.5875C19.7458 11.8292 19.6 12.05 19.4 12.25ZM10.825 18L17.975 10.85L9.15 2H2V9.15L10.825 18ZM4.5 6C4.91667 6 5.27083 5.85417 5.5625 5.5625C5.85417 5.27083 6 4.91667 6 4.5C6 4.08333 5.85417 3.72917 5.5625 3.4375C5.27083 3.14583 4.91667 3 4.5 3C4.08333 3 3.72917 3.14583 3.4375 3.4375C3.14583 3.72917 3 4.08333 3 4.5C3 4.91667 3.14583 5.27083 3.4375 5.5625C3.72917 5.85417 4.08333 6 4.5 6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 18 20" width="18">
      <path
        d="M13 15C13.4167 15 13.7708 14.8542 14.0625 14.5625C14.3542 14.2708 14.5 13.9167 14.5 13.5C14.5 13.0833 14.3542 12.7292 14.0625 12.4375C13.7708 12.1458 13.4167 12 13 12C12.5833 12 12.2292 12.1458 11.9375 12.4375C11.6458 12.7292 11.5 13.0833 11.5 13.5C11.5 13.9167 11.6458 14.2708 11.9375 14.5625C12.2292 14.8542 12.5833 15 13 15ZM13 18C13.5167 18 13.9917 17.8792 14.425 17.6375C14.8583 17.3958 15.2083 17.075 15.475 16.675C15.1083 16.4583 14.7167 16.2917 14.3 16.175C13.8833 16.0583 13.45 16 13 16C12.55 16 12.1167 16.0583 11.7 16.175C11.2833 16.2917 10.8917 16.4583 10.525 16.675C10.7917 17.075 11.1417 17.3958 11.575 17.6375C12.0083 17.8792 12.4833 18 13 18ZM8 20C5.68333 19.4167 3.77083 18.0875 2.2625 16.0125C0.754167 13.9375 0 11.6333 0 9.1V3L8 0L16 3V8.675C15.6833 8.54167 15.3583 8.42083 15.025 8.3125C14.6917 8.20417 14.35 8.125 14 8.075V4.4L8 2.15L2 4.4V9.1C2 9.88333 2.10417 10.6667 2.3125 11.45C2.52083 12.2333 2.8125 12.9792 3.1875 13.6875C3.5625 14.3958 4.01667 15.05 4.55 15.65C5.08333 16.25 5.675 16.75 6.325 17.15C6.50833 17.6833 6.75 18.1917 7.05 18.675C7.35 19.1583 7.69167 19.5917 8.075 19.975C8.05833 19.975 8.04583 19.9792 8.0375 19.9875C8.02917 19.9958 8.01667 20 8 20ZM13 20C11.6167 20 10.4375 19.5125 9.4625 18.5375C8.4875 17.5625 8 16.3833 8 15C8 13.6167 8.4875 12.4375 9.4625 11.4625C10.4375 10.4875 11.6167 10 13 10C14.3833 10 15.5625 10.4875 16.5375 11.4625C17.5125 12.4375 18 13.6167 18 15C18 16.3833 17.5125 17.5625 16.5375 18.5375C15.5625 19.5125 14.3833 20 13 20Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg fill="none" height="21" viewBox="0 0 22 21" width="22">
      <path
        d="M7.6 21L5.7 17.8L2.1 17L2.45 13.3L0 10.5L2.45 7.7L2.1 4L5.7 3.2L7.6 0L11 1.45L14.4 0L16.3 3.2L19.9 4L19.55 7.7L22 10.5L19.55 13.3L19.9 17L16.3 17.8L14.4 21L11 19.55L7.6 21ZM8.45 18.45L11 17.35L13.6 18.45L15 16.05L17.75 15.4L17.5 12.6L19.35 10.5L17.5 8.35L17.75 5.55L15 4.95L13.55 2.55L11 3.65L8.4 2.55L7 4.95L4.25 5.55L4.5 8.35L2.65 10.5L4.5 12.6L4.25 15.45L7 16.05L8.45 18.45ZM9.95 14.05L15.6 8.4L14.2 6.95L9.95 11.2L7.8 9.1L6.4 10.5L9.95 14.05Z"
        fill="currentColor"
      />
    </svg>
  )
}

function InfrastructureIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 18 20" width="18">
      <path
        d="M0 20V13H3V9H8V7H5V0H13V7H10V9H15V13H18V20H10V13H13V11H5V13H8V20H0ZM7 5H11V2H7V5ZM2 18H6V15H2V18ZM12 18H16V15H12V18Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 31 30" width="21">
      <path
        d="M24.412 10.5L22.8017 6.9L19.2881 5.25L22.8017 3.6L24.412 0L26.0224 3.6L29.536 5.25L26.0224 6.9L24.412 10.5ZM27.34 21L26.1688 18.45L23.68 17.25L26.1688 16.05L27.34 13.5L28.5112 16.05L31 17.25L28.5112 18.45L27.34 21ZM8.30815 30L7.86895 26.475C7.69815 26.4 7.51515 26.3 7.31995 26.175C7.12475 26.05 6.96616 25.925 6.84416 25.8L3.62338 27.225L0 20.7L2.74498 18.6C2.74498 18.4 2.74498 18.2 2.74498 18C2.74498 17.8 2.74498 17.6 2.74498 17.4L0 15.3L3.62338 8.775L6.84416 10.2C6.96616 10.075 7.12475 9.95 7.31995 9.825C7.51515 9.7 7.69815 9.6 7.86895 9.525L8.30815 6H15.6281L16.0673 9.525C16.2381 9.6 16.4211 9.7 16.6163 9.825C16.8115 9.95 16.9701 10.075 17.0921 10.2L20.3129 8.775L23.9362 15.3L21.1913 17.4C21.1913 17.6 21.1913 17.8 21.1913 18C21.1913 18.2 21.1913 18.4 21.1913 18.6L23.9362 20.7L20.3129 27.225L17.0921 25.8C16.9701 25.925 16.8115 26.05 16.6163 26.175C16.4211 26.3 16.2381 26.4 16.0673 26.475L15.6281 30H8.30815ZM11.9681 22.5C13.1881 22.5 14.2251 22.0625 15.0791 21.1875C15.9331 20.3125 16.3601 19.25 16.3601 18C16.3601 16.75 15.9331 15.6875 15.0791 14.8125C14.2251 13.9375 13.1881 13.5 11.9681 13.5C10.7481 13.5 9.71114 13.9375 8.85714 14.8125C8.00315 15.6875 7.57615 16.75 7.57615 18C7.57615 19.25 8.00315 20.3125 8.85714 21.1875C9.71114 22.0625 10.7481 22.5 11.9681 22.5ZM10.8701 27H13.0661L13.3589 24.3C14.0665 24.1 14.6704 23.8438 15.1706 23.5312C15.6708 23.2188 16.1649 22.8 16.6529 22.275L19.0685 23.4L20.0933 21.525L17.9705 19.875C18.1657 19.3 18.2633 18.675 18.2633 18C18.2633 17.325 18.1657 16.7 17.9705 16.125L20.0933 14.475L19.0685 12.6L16.6529 13.725C16.1649 13.2 15.6708 12.7812 15.1706 12.4688C14.6704 12.1562 14.0665 11.9 13.3589 11.7L13.0661 9H10.8701L10.5773 11.7C9.86974 11.9 9.26584 12.1562 8.76564 12.4688C8.26545 12.7812 7.77135 13.2 7.28335 13.725L4.86777 12.6L3.84298 14.475L5.96576 16.125C5.77056 16.7 5.66686 17.325 5.65466 18C5.64246 18.675 5.74616 19.3 5.96576 19.875L3.84298 21.525L4.86777 23.4L7.28335 22.275C7.77135 22.8 8.26545 23.2188 8.76564 23.5312C9.26584 23.8438 9.86974 24.1 10.5773 24.3L10.8701 27Z"
        fill="currentColor"
      />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 20 18" width="20">
      <path
        d="M9 18V16H17V8.9C17 6.95 16.3208 5.29583 14.9625 3.9375C13.6042 2.57917 11.95 1.9 10 1.9C8.05 1.9 6.39583 2.57917 5.0375 3.9375C3.67917 5.29583 3 6.95 3 8.9V15H2C1.45 15 0.979167 14.8042 0.5875 14.4125C0.195833 14.0208 0 13.55 0 13V11C0 10.65 0.0875 10.3208 0.2625 10.0125C0.4375 9.70417 0.683333 9.45833 1 9.275L1.075 7.95C1.20833 6.81667 1.5375 5.76667 2.0625 4.8C2.5875 3.83333 3.24583 2.99167 4.0375 2.275C4.82917 1.55833 5.7375 1 6.7625 0.6C7.7875 0.2 8.86667 0 10 0C11.1333 0 12.2083 0.2 13.225 0.6C14.2417 1 15.15 1.55417 15.95 2.2625C16.75 2.97083 17.4083 3.80833 17.925 4.775C18.4417 5.74167 18.775 6.79167 18.925 7.925L19 9.225C19.3167 9.375 19.5625 9.6 19.7375 9.9C19.9125 10.2 20 10.5167 20 10.85V13.15C20 13.4833 19.9125 13.8 19.7375 14.1C19.5625 14.4 19.3167 14.625 19 14.775V16C19 16.55 18.8042 17.0208 18.4125 17.4125C18.0208 17.8042 17.55 18 17 18H9ZM7 11C6.71667 11 6.47917 10.9042 6.2875 10.7125C6.09583 10.5208 6 10.2833 6 10C6 9.71667 6.09583 9.47917 6.2875 9.2875C6.47917 9.09583 6.71667 9 7 9C7.28333 9 7.52083 9.09583 7.7125 9.2875C7.90417 9.47917 8 9.71667 8 10C8 10.2833 7.90417 10.5208 7.7125 10.7125C7.52083 10.9042 7.28333 11 7 11ZM13 11C12.7167 11 12.4792 10.9042 12.2875 10.7125C12.0958 10.5208 12 10.2833 12 10C12 9.71667 12.0958 9.47917 12.2875 9.2875C12.4792 9.09583 12.7167 9 13 9C13.2833 9 13.5208 9.09583 13.7125 9.2875C13.9042 9.47917 14 9.71667 14 10C14 10.2833 13.9042 10.5208 13.7125 10.7125C13.5208 10.9042 13.2833 11 13 11ZM4.025 9.45C3.90833 7.68333 4.44167 6.16667 5.625 4.9C6.80833 3.63333 8.28333 3 10.05 3C11.5333 3 12.8375 3.47083 13.9625 4.4125C15.0875 5.35417 15.7667 6.55833 16 8.025C14.4833 8.00833 13.0875 7.6 11.8125 6.8C10.5375 6 9.55833 4.91667 8.875 3.55C8.60833 4.88333 8.04583 6.07083 7.1875 7.1125C6.32917 8.15417 5.275 8.93333 4.025 9.45Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M10 3.5a3.5 3.5 0 0 0-3.5 3.5v1.2c0 .84-.24 1.67-.7 2.38L4.8 12.2c-.33.5.03 1.18.63 1.18h9.14c.6 0 .96-.68.63-1.18l-1-1.62a4.57 4.57 0 0 1-.7-2.38V7A3.5 3.5 0 0 0 10 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 15.5a1.77 1.77 0 0 0 3 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M4.5 6.5h11v7h-11v-7Zm0 .2 5.5 4 5.5-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M10 13V4m0 0 3 3m-3-3L7 7M5 12.5V15a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function AuditIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M6 4.5h8M6 8h8M6 11.5h5M5 16h7a3 3 0 0 0 3-3V5.5A1.5 1.5 0 0 0 13.5 4h-7A1.5 1.5 0 0 0 5 5.5V16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

const routeIcons = {
  dashboard: <DashboardIcon />,
  revenue: <ChartIcon />,
  bookings: <BookingIcon />,
  inventory: <InventoryIcon />,
  services: <ListIcon />,
  serviceReview: <ReviewIcon />,
  payments: <ClockIcon />,
  refunds: <RefundIcon />,
  promotions: <TagIcon />,
  support: <HelpIcon />,
  emailLogs: <MailIcon />,
  users: <UsersIcon />,
  notifications: <BellIcon />,
  accessControl: <ShieldIcon />,
  roles: <UsersIcon />,
  permissions: <ShieldIcon />,
  auditLogs: <AuditIcon />,
  uploads: <UploadIcon />,
  infrastructure: <InfrastructureIcon />,
  settings: <SettingsIcon />,
}

const sidebarSystemLabels = Object.freeze({
  staff: 'HỆ THỐNG NHÂN VIÊN',
  admin: 'HỆ THỐNG QUẢN LÝ\n(ADMIN)',
  system_admin: 'HỆ THỐNG QUẢN TRỊ\n(SYSTEM ADMIN)',
})

const sidebarRouteLabels = Object.freeze({
  infrastructure: 'Quản lý hạ tầng',
})

function getNavLinkClassName({ isActive }) {
  return `admin-sidebar__item${isActive ? ' admin-sidebar__item--active' : ''}`
}

function isSidebarRouteActive(pathname, routeId, route) {
  if (route.path === '/admin') {
    return pathname === '/admin'
  }

  if (routeId === 'services') {
    return pathname === '/admin/services' || pathname === '/admin/services/new'
  }

  if (routeId === 'bookings') {
    return pathname === '/admin/bookings' || pathname.startsWith('/admin/bookings/')
  }

  return pathname === route.path
}

function getExactNavLinkClassName(isActive) {
  return `admin-sidebar__item${isActive ? ' admin-sidebar__item--active' : ''}`
}

function getSidebarRouteLabel(routeId, route) {
  return sidebarRouteLabels[routeId] ?? route.label
}

function AdminSidebar({
  currentPermissions = undefined,
  currentRole = 'system_admin',
  loggingOut = false,
  onLogout,
}) {
  const { pathname } = useLocation()
  const canAccessDashboard = canViewAdminRoute(
    currentRole,
    ADMIN_ROUTES.dashboard,
    currentPermissions,
  )
  const navSections = getAdminNavSections(currentRole)

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <img
          alt="Net Viet Admin"
          className="admin-sidebar__logo"
          src="/assets/template/brand/admin-logo.png"
        />
        <p className="admin-sidebar__system">
          {sidebarSystemLabels[currentRole] ?? sidebarSystemLabels.system_admin}
        </p>
      </div>

      {canAccessDashboard && !navSections.some((section) => section.routeIds.includes('dashboard')) ? (
        <NavLink
          className={getNavLinkClassName}
          end
          to={buildAdminPath(ADMIN_ROUTES.dashboard.path, currentRole)}
        >
          <SidebarIcon>{routeIcons.dashboard}</SidebarIcon>
          <span>{ADMIN_ROUTES.dashboard.label}</span>
        </NavLink>
      ) : null}

      {navSections.map((section) => {
        const visibleRouteIds = section.routeIds.filter((routeId) =>
          canViewAdminRoute(currentRole, ADMIN_ROUTES[routeId], currentPermissions),
        )

        if (visibleRouteIds.length === 0) {
          return null
        }

        return (
          <section className="admin-sidebar__section" key={section.heading}>
            {section.heading ? <p className="admin-sidebar__heading">{section.heading}</p> : null}
            <nav className="admin-sidebar__nav">
              {visibleRouteIds.map((routeId) => {
                const route = ADMIN_ROUTES[routeId]

                return (
                  <NavLink
                    className={() =>
                      getExactNavLinkClassName(isSidebarRouteActive(pathname, routeId, route))
                    }
                    end={route.path === '/admin'}
                    key={routeId}
                    to={buildAdminPath(route.path, currentRole)}
                  >
                    <SidebarIcon>{routeIcons[routeId]}</SidebarIcon>
                    <span>{getSidebarRouteLabel(routeId, route)}</span>
                  </NavLink>
                )
              })}
            </nav>
          </section>
        )
      })}

      <div className="admin-sidebar__spacer" />

      <div className="admin-sidebar__account">
        <button className="admin-sidebar__account-row admin-sidebar__account-row--neutral" type="button">
          <SidebarIcon>
            <UsersIcon />
          </SidebarIcon>
          <span>Hồ sơ</span>
        </button>
        <button
          className="admin-sidebar__account-row admin-sidebar__account-row--danger"
          disabled={loggingOut}
          type="button"
          onClick={onLogout}
        >
          <SidebarIcon>
            <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
              <path
                d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v7A1.5 1.5 0 0 0 5.5 15H8m3-3 3-2-3-2m3 2H8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </SidebarIcon>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
