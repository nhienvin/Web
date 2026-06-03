import { useState, useEffect } from 'react'

// Cache toàn cục — chỉ fetch 1 lần suốt session
const cache = {}

async function fetchJSON(path) {
  if (cache[path]) return cache[path]
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Không tải được ${path}`)
  const data = await res.json()
  cache[path] = data
  return data
}

/**
 * Hook load tất cả dữ liệu lịch sử.
 * Trả về { periods, eventsVN, eventsWorld, characters, loading, error }
 */
export function useHistoryData() {
  const [state, setState] = useState({
    periods: [],
    eventsVN: [],
    eventsWorld: [],
    characters: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    Promise.all([
      fetchJSON('/data/periods.json'),
      fetchJSON('/data/events_vn.json'),
      fetchJSON('/data/events_world.json'),
      fetchJSON('/data/characters.json'),
    ])
      .then(([periodsData, eventsVN, eventsWorld, characters]) => {
        setState({
          periods: periodsData.periods,
          eventsVN,
          eventsWorld,
          characters,
          loading: false,
          error: null,
        })
      })
      .catch(err => {
        setState(s => ({ ...s, loading: false, error: err.message }))
      })
  }, [])

  return state
}

/**
 * Thêm sự kiện mới vào events_vn (client-side, reload để persist).
 * Trong production sẽ gọi API; hiện tại cập nhật cache session.
 */
export function addEventToCache(newEvent) {
  if (cache['/data/events_vn.json']) {
    cache['/data/events_vn.json'] = [...cache['/data/events_vn.json'], newEvent]
  }
}
