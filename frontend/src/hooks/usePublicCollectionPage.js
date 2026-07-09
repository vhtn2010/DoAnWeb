import { useDeferredValue, useMemo, useState } from 'react'

function normalizeSearchValue(value = '') {
  return String(value).trim().toLowerCase()
}

export default function usePublicCollectionPage({
  defaultFilter = 'all',
  filterItem,
  getSearchText,
  items = [],
} = {}) {
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState(defaultFilter)
  const deferredQuery = useDeferredValue(normalizeSearchValue(query))

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter =
        selectedFilter === defaultFilter || !filterItem
          ? true
          : filterItem(item, selectedFilter)
      const haystack = normalizeSearchValue(getSearchText?.(item) ?? '')
      const matchesQuery = deferredQuery ? haystack.includes(deferredQuery) : true

      return matchesFilter && matchesQuery
    })
  }, [defaultFilter, deferredQuery, filterItem, getSearchText, items, selectedFilter])

  function resetFilters() {
    setQuery('')
    setSelectedFilter(defaultFilter)
  }

  return {
    filteredItems,
    query,
    resetFilters,
    selectedFilter,
    setQuery,
    setSelectedFilter,
  }
}
