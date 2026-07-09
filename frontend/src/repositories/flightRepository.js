import {
  buildFlightSearchParams as buildFlightSearchParamsWithApiAdapter,
  buildFlightSelectionPayload as buildFlightSelectionPayloadWithApiAdapter,
  checkFlightAvailability as checkFlightAvailabilityWithApiAdapter,
  getFlightDetailBySlug as getFlightDetailBySlugWithApiAdapter,
  getFlightSearchDefaults as getFlightSearchDefaultsWithApiAdapter,
  listFlights as listFlightsWithApiAdapter,
} from '../adapters/api/flightApiAdapter.js'

const flightAdapter = {
  listFlights: listFlightsWithApiAdapter,
  getFlightSearchDefaults: getFlightSearchDefaultsWithApiAdapter,
  buildFlightSearchParams: buildFlightSearchParamsWithApiAdapter,
  getFlightDetailBySlug: getFlightDetailBySlugWithApiAdapter,
  checkFlightAvailability: checkFlightAvailabilityWithApiAdapter,
  buildFlightSelectionPayload: buildFlightSelectionPayloadWithApiAdapter,
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
