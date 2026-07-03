import {
  getFeaturedTourServices as getFeaturedTourServicesWithMockAdapter,
  getTourServiceBySlug as getTourServiceBySlugWithMockAdapter,
  listTourServices as listTourServicesWithMockAdapter,
} from '../adapters/mock/publicServiceMockAdapter.js'

const publicServiceAdapter = {
  getFeaturedTourServices: getFeaturedTourServicesWithMockAdapter,
  getTourServiceBySlug: getTourServiceBySlugWithMockAdapter,
  listTourServices: listTourServicesWithMockAdapter,
}

export function listTourServices(params) {
  return publicServiceAdapter.listTourServices(params)
}

export function getTourServiceBySlug(slug) {
  return publicServiceAdapter.getTourServiceBySlug(slug)
}

export function getFeaturedTourServices(params) {
  return publicServiceAdapter.getFeaturedTourServices(params)
}
