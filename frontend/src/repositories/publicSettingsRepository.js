import { getPublicSettings as getPublicSettingsWithApiAdapter } from '../adapters/api/publicSettingsApiAdapter.js'

export function getPublicSettings() {
  return getPublicSettingsWithApiAdapter()
}
