import {
  buildFlightSearchParams as buildFlightSearchParamsWithMockAdapter,
  buildFlightSelectionPayload as buildFlightSelectionPayloadWithMockAdapter,
  checkFlightAvailability as checkFlightAvailabilityWithMockAdapter,
  getFlightDetailBySlug as getFlightDetailBySlugWithMockAdapter,
  getFlightSearchDefaults as getFlightSearchDefaultsWithMockAdapter,
  listFlights as listFlightsWithMockAdapter,
} from '../adapters/mock/flightMockAdapter.js'

const flightAdapter = {
  listFlights: listFlightsWithMockAdapter,
  getFlightSearchDefaults: getFlightSearchDefaultsWithMockAdapter,
  buildFlightSearchParams: buildFlightSearchParamsWithMockAdapter,
  getFlightDetailBySlug: getFlightDetailBySlugWithMockAdapter,
  checkFlightAvailability: checkFlightAvailabilityWithMockAdapter,
  buildFlightSelectionPayload: buildFlightSelectionPayloadWithMockAdapter,
}

export function listFlights(params) {
  return flightAdapter.listFlights(params)
}

export function getFlightSearchDefaults() {
  return flightAdapter.getFlightSearchDefaults()
}

export function buildFlightSearchParams(formState) {
  return flightAdapter.buildFlightSearchParams(formState)
}

export function getFlightDetailBySlug(slug, params) {
  return flightAdapter.getFlightDetailBySlug(slug, params)
}

export function checkFlightAvailability(payload) {
  return flightAdapter.checkFlightAvailability(payload)
}

export function buildFlightSelectionPayload(flight, selectedFare, searchState) {
  return flightAdapter.buildFlightSelectionPayload(flight, selectedFare, searchState)
}
