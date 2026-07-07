import {
  buildTrainSearchParams as buildTrainSearchParamsWithMockAdapter,
  buildTrainSelectionPayload as buildTrainSelectionPayloadWithMockAdapter,
  checkTrainAvailability as checkTrainAvailabilityWithMockAdapter,
  getTrainDetailBySlug as getTrainDetailBySlugWithMockAdapter,
  getTrainSearchDefaults as getTrainSearchDefaultsWithMockAdapter,
  listTrains as listTrainsWithMockAdapter,
} from '../adapters/mock/trainMockAdapter.js'

const trainAdapter = {
  listTrains: listTrainsWithMockAdapter,
  getTrainSearchDefaults: getTrainSearchDefaultsWithMockAdapter,
  buildTrainSearchParams: buildTrainSearchParamsWithMockAdapter,
  getTrainDetailBySlug: getTrainDetailBySlugWithMockAdapter,
  checkTrainAvailability: checkTrainAvailabilityWithMockAdapter,
  buildTrainSelectionPayload: buildTrainSelectionPayloadWithMockAdapter,
}

export function listTrains(params) {
  return trainAdapter.listTrains(params)
}

export function getTrainSearchDefaults() {
  return trainAdapter.getTrainSearchDefaults()
}

export function buildTrainSearchParams(formState) {
  return trainAdapter.buildTrainSearchParams(formState)
}

export function getTrainDetailBySlug(slug, params) {
  return trainAdapter.getTrainDetailBySlug(slug, params)
}

export function checkTrainAvailability(payload) {
  return trainAdapter.checkTrainAvailability(payload)
}

export function buildTrainSelectionPayload(
  train,
  selectedSeat,
  selectedSeatOption,
  searchState,
) {
  return trainAdapter.buildTrainSelectionPayload(
    train,
    selectedSeat,
    selectedSeatOption,
    searchState,
  )
}
