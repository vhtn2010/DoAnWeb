import { homePageFixture } from '../../fixtures/homeFigma.fixtures.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function createHomePayload() {
  return cloneValue(homePageFixture)
}

export function getHomePageFallbackData() {
  return {
    success: true,
    message: 'OK',
    data: createHomePayload(),
  }
}

export async function getHomeFeaturedServices({ limit = 3 } = {}) {
  const payload = createHomePayload()
  const safeLimit = Math.max(Number(limit) || 3, 1)

  return {
    success: true,
    message: 'OK',
    data: payload.featured_services.slice(0, safeLimit),
  }
}

export async function getHomeFlashSaleServices({ limit = 3 } = {}) {
  const payload = createHomePayload()
  const safeLimit = Math.max(Number(limit) || 3, 1)

  return {
    success: true,
    message: 'OK',
    data: payload.flash_sale_services.slice(0, safeLimit),
  }
}

export async function getHomeDestinations({ limit = 4 } = {}) {
  const payload = createHomePayload()
  const safeLimit = Math.max(Number(limit) || 4, 1)

  return {
    success: true,
    message: 'OK',
    data: payload.destinations.slice(0, safeLimit),
  }
}

export async function getHomePageData() {
  // TODO: replace mock home sections with public home/search/service APIs in integration phase.
  const payload = createHomePayload()

  return {
    success: true,
    message: 'OK',
    data: {
      hero: payload.hero,
      search_defaults: payload.search_defaults,
      featured_services: payload.featured_services,
      flash_sale_services: payload.flash_sale_services,
      destinations: payload.destinations,
      value_props: payload.value_props,
      flash_sale_meta: payload.flash_sale_meta,
      provinces: payload.provinces,
    },
  }
}
