import {
  buildFlightSearchParams as buildFlightSearchParamsWithMockAdapter,
  buildFlightSelectionPayload as buildFlightSelectionPayloadWithMockAdapter,
  getFlightSearchDefaults as getFlightSearchDefaultsWithMockAdapter,
  listFlights as listFlightsWithMockAdapter,
} from '../adapters/mock/flightMockAdapter.js'

const flightAdapter = {
  listFlights: listFlightsWithMockAdapter,
  getFlightSearchDefaults: getFlightSearchDefaultsWithMockAdapter,
  buildFlightSearchParams: buildFlightSearchParamsWithMockAdapter,
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

export function buildFlightSelectionPayload(flight, searchState) {
  return flightAdapter.buildFlightSelectionPayload(flight, searchState)
}
