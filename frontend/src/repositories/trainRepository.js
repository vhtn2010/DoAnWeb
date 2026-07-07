import {
  buildTrainSearchParams as buildTrainSearchParamsWithMockAdapter,
  buildTrainSelectionPayload as buildTrainSelectionPayloadWithMockAdapter,
  getTrainSearchDefaults as getTrainSearchDefaultsWithMockAdapter,
  listTrains as listTrainsWithMockAdapter,
} from '../adapters/mock/trainMockAdapter.js'

const trainAdapter = {
  listTrains: listTrainsWithMockAdapter,
  getTrainSearchDefaults: getTrainSearchDefaultsWithMockAdapter,
  buildTrainSearchParams: buildTrainSearchParamsWithMockAdapter,
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

export function buildTrainSelectionPayload(train, searchState) {
  return trainAdapter.buildTrainSelectionPayload(train, searchState)
}
