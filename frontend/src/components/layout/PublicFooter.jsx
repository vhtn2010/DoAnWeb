import { useEffect, useMemo, useState } from 'react'
import {
  PublicFooterBottomBar,
  PublicFooterBrandColumn,
  PublicFooterContactList,
  PublicFooterLinkGroup,
  PUBLIC_FOOTER_COMPANY_LINKS,
  PUBLIC_FOOTER_CONTACT_ITEM_DEFINITIONS,
  PUBLIC_FOOTER_SOCIAL_ITEMS,
  PUBLIC_FOOTER_SUPPORT_LINKS,
} from '../public/layout/index.js'
import { getPublicSettings } from '../../repositories/publicSettingsRepository.js'

const DEFAULT_PUBLIC_SETTINGS = Object.freeze({
  address: '',
  business_hours: '',
  hotline: '',
  site_name: 'Net Viet Travel',
  social_links: {},
  support_email: '',
})

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function extractSocialLinkUrl(value) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value && typeof value === 'object') {
    return String(value.url ?? value.href ?? value.link ?? '').trim()
  }

  return ''
}

function formatBusinessHours(value) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ''
  }

  return Object.entries(value)
    .map(([key, hours]) => {
      const normalizedKey = String(key ?? '')
        .trim()
        .replace(/[_-]+/g, ' ')
      const normalizedHours = normalizeText(hours)

      if (!normalizedKey) {
        return normalizedHours
      }

      return normalizedHours ? `${normalizedKey}: ${normalizedHours}` : normalizedKey
    })
    .filter(Boolean)
    .join(' • ')
}

function buildMapLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function buildPhoneLink(phoneNumber) {
  const sanitizedPhoneNumber = String(phoneNumber ?? '').replace(/[^\d+]/g, '')
  return sanitizedPhoneNumber ? `tel:${sanitizedPhoneNumber}` : ''
}

function PublicFooter() {
  const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS)

  useEffect(() => {
    let isActive = true

    async function loadPublicSettings() {
      try {
        const response = await getPublicSettings()

        if (!isActive) {
          return
        }

        setPublicSettings({
          address: normalizeText(response.data?.address),
          business_hours: formatBusinessHours(response.data?.business_hours),
          hotline: normalizeText(response.data?.hotline),
          site_name: normalizeText(response.data?.site_name) || DEFAULT_PUBLIC_SETTINGS.site_name,
          social_links:
            response.data?.social_links && typeof response.data.social_links === 'object'
              ? response.data.social_links
              : {},
          support_email: normalizeText(response.data?.support_email),
        })
      } catch {
        if (isActive) {
          setPublicSettings(DEFAULT_PUBLIC_SETTINGS)
        }
      }
    }

    loadPublicSettings()

    return () => {
      isActive = false
    }
  }, [])

  const contactItems = useMemo(
    () =>
      PUBLIC_FOOTER_CONTACT_ITEM_DEFINITIONS.map((item) => {
        if (item.id === 'address' && publicSettings.address) {
          return {
            ...item,
            href: buildMapLink(publicSettings.address),
            isExternal: true,
            label: publicSettings.address,
          }
        }

        if (item.id === 'support_email' && publicSettings.support_email) {
          return {
            ...item,
            href: `mailto:${publicSettings.support_email}`,
            label: publicSettings.support_email,
          }
        }

        if (item.id === 'hotline' && publicSettings.hotline) {
          return {
            ...item,
            href: buildPhoneLink(publicSettings.hotline),
            label: publicSettings.hotline,
          }
        }

        if (item.id === 'business_hours' && publicSettings.business_hours) {
          return {
            ...item,
            label: publicSettings.business_hours,
          }
        }

        return null
      }).filter(Boolean),
    [
      publicSettings.address,
      publicSettings.business_hours,
      publicSettings.hotline,
      publicSettings.support_email,
    ],
  )

  const socialItems = useMemo(
    () =>
      PUBLIC_FOOTER_SOCIAL_ITEMS.map((item) => ({
        ...item,
        href: extractSocialLinkUrl(publicSettings.social_links?.[item.id]),
      })).filter((item) => item.href),
    [publicSettings.social_links],
  )

  return (
    <footer className="public-footer">
      <div className="public-footer__shell">
        <div className="public-footer__grid">
          <PublicFooterBrandColumn siteName={publicSettings.site_name} socialItems={socialItems} />
          <PublicFooterLinkGroup heading="VỀ CÔNG TY" items={PUBLIC_FOOTER_COMPANY_LINKS} />
          <PublicFooterLinkGroup
            heading="HỖ TRỢ KHÁCH HÀNG"
            items={PUBLIC_FOOTER_SUPPORT_LINKS}
          />
          <PublicFooterContactList items={contactItems} />
        </div>
        <PublicFooterBottomBar siteName={publicSettings.site_name} />
      </div>
    </footer>
  )
}

export default PublicFooter
