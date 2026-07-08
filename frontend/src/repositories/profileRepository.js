import {
  getCurrentProfileLogs as getCurrentProfileLogsWithApiAdapter,
  getCurrentProfile as getCurrentProfileWithApiAdapter,
  updateCurrentAvatar as updateCurrentAvatarWithApiAdapter,
  updateCurrentPassword as updateCurrentPasswordWithApiAdapter,
  updateCurrentProfile as updateCurrentProfileWithApiAdapter,
} from '../adapters/api/profileApiAdapter.js'

const profileAdapter = {
  getCurrentProfileLogs: getCurrentProfileLogsWithApiAdapter,
  getCurrentProfile: getCurrentProfileWithApiAdapter,
  updateCurrentAvatar: updateCurrentAvatarWithApiAdapter,
  updateCurrentPassword: updateCurrentPasswordWithApiAdapter,
  updateCurrentProfile: updateCurrentProfileWithApiAdapter,
}

export function getCurrentProfile() {
  return profileAdapter.getCurrentProfile()
}

export function updateCurrentProfile(payload = {}) {
  return profileAdapter.updateCurrentProfile(payload)
}

export function updateCurrentAvatar(payload = {}) {
  return profileAdapter.updateCurrentAvatar(payload)
}

export function updateCurrentPassword(payload = {}) {
  return profileAdapter.updateCurrentPassword(payload)
}

export function getCurrentProfileLogs(params = {}) {
  return profileAdapter.getCurrentProfileLogs(params)
}
