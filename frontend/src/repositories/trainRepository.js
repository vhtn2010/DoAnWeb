import {
  buildTrainSearchParams as buildTrainSearchParamsWithApiAdapter,
  buildTrainSelectionPayload as buildTrainSelectionPayloadWithApiAdapter,
  checkTrainAvailability as checkTrainAvailabilityWithApiAdapter,
  getTrainDetailBySlug as getTrainDetailBySlugWithApiAdapter,
  getTrainSearchDefaults as getTrainSearchDefaultsWithApiAdapter,
  listTrains as listTrainsWithApiAdapter,
} from '../adapters/api/trainApiAdapter.js'

const trainAdapter = {
  listTrains: listTrainsWithApiAdapter,
  getTrainSearchDefaults: getTrainSearchDefaultsWithApiAdapter,
  buildTrainSearchParams: buildTrainSearchParamsWithApiAdapter,
  getTrainDetailBySlug: getTrainDetailBySlugWithApiAdapter,
  checkTrainAvailability: checkTrainAvailabilityWithApiAdapter,
  buildTrainSelectionPayload: buildTrainSelectionPayloadWithApiAdapter,
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
  selectedSeats,
  selectedSeatOption,
  searchState,
) {
  return trainAdapter.buildTrainSelectionPayload(
    train,
    selectedSeats,
    selectedSeatOption,
    searchState,
  )
}
