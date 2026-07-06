import {
  getFeaturedTourServices as getFeaturedTourServicesWithMockAdapter,
  getTourServiceBySlug as getTourServiceBySlugWithMockAdapter,
} from '../adapters/mock/publicServiceMockAdapter.js'
import {
  getTourServiceCatalog as getTourServiceCatalogWithApiAdapter,
  listTourServices as listTourServicesWithApiAdapter,
} from '../adapters/api/publicServiceApiAdapter.js'

const publicServiceAdapter = {
  getFeaturedTourServices: getFeaturedTourServicesWithMockAdapter,
  getTourServiceCatalog: getTourServiceCatalogWithApiAdapter,
  getTourServiceBySlug: getTourServiceBySlugWithMockAdapter,
  listTourServices: listTourServicesWithApiAdapter,
}

export function listTourServices(params) {
  return publicServiceAdapter.listTourServices(params)
}

export function getTourServiceCatalog() {
  return publicServiceAdapter.getTourServiceCatalog()
}

export function getTourServiceBySlug(slug) {
  return publicServiceAdapter.getTourServiceBySlug(slug)
}

export function getFeaturedTourServices(params) {
  return publicServiceAdapter.getFeaturedTourServices(params)
}
