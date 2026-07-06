import {
  getCurrentProfile as getCurrentProfileWithApiAdapter,
} from '../adapters/api/profileApiAdapter.js'

const profileAdapter = {
  getCurrentProfile: getCurrentProfileWithApiAdapter,
}

export function getCurrentProfile() {
  return profileAdapter.getCurrentProfile()
}
