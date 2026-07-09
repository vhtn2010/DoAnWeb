import {
  getFeaturedTourServices as getFeaturedTourServicesWithApiAdapter,
  getTourServiceCatalog as getTourServiceCatalogWithApiAdapter,
  getTourServiceBySlug as getTourServiceBySlugWithApiAdapter,
  listTourServices as listTourServicesWithApiAdapter,
} from '../adapters/api/publicServiceApiAdapter.js'

const publicServiceAdapter = {
  getFeaturedTourServices: getFeaturedTourServicesWithApiAdapter,
  getTourServiceCatalog: getTourServiceCatalogWithApiAdapter,
  getTourServiceBySlug: getTourServiceBySlugWithApiAdapter,
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
