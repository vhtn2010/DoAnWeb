import { useEffect, useMemo, useState } from 'react'
import {
  buildFavoriteItem,
  persistStoredFavorites,
  readStoredFavorites,
  resolveFavoriteOwnerKey,
  subscribeFavoriteStorage,
} from '../services/favoriteStorage.js'

export default function useFavorites({ currentUser = null } = {}) {
  const ownerKey = resolveFavoriteOwnerKey(currentUser)
  const [favorites, setFavorites] = useState(() => readStoredFavorites(ownerKey))

  useEffect(() => {
    setFavorites(readStoredFavorites(ownerKey))

    return subscribeFavoriteStorage(ownerKey, () => {
      setFavorites(readStoredFavorites(ownerKey))
    })
  }, [ownerKey])

  const favoriteKeys = useMemo(
    () => new Set(favorites.map((item) => item.favorite_key)),
    [favorites],
  )

  function hasFavorite(favoriteKey = '') {
    return favoriteKeys.has(String(favoriteKey ?? '').trim())
  }

  function updateFavorites(nextFavorites) {
    setFavorites(nextFavorites)
    persistStoredFavorites(ownerKey, nextFavorites)
  }

  function toggleFavorite(item = {}) {
    const favoriteItem = buildFavoriteItem(item)

    if (!favoriteItem) {
      return {
        item: null,
        nextState: false,
        updated: false,
      }
    }

    const alreadyFavorited = favoriteKeys.has(favoriteItem.favorite_key)
    const nextFavorites = alreadyFavorited
      ? favorites.filter((currentItem) => currentItem.favorite_key !== favoriteItem.favorite_key)
      : [favoriteItem, ...favorites]

    updateFavorites(nextFavorites)

    return {
      item: favoriteItem,
      nextState: !alreadyFavorited,
      updated: true,
    }
  }

  function removeFavorite(favoriteKey = '') {
    if (!favoriteKeys.has(String(favoriteKey ?? '').trim())) {
      return false
    }

    updateFavorites(
      favorites.filter((item) => item.favorite_key !== String(favoriteKey ?? '').trim()),
    )

    return true
  }

  return {
    favoriteCount: favorites.length,
    favoriteKeys,
    favorites,
    hasFavorite,
    removeFavorite,
    toggleFavorite,
  }
}
