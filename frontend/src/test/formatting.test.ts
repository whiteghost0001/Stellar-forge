import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatTimestamp, timeAgo } from '../utils/formatting'

describe('formatTimestamp', () => {
  it('formats a known timestamp correctly', () => {
    // 2026-03-19T15:28:00Z
    expect(formatTimestamp(1773934080)).toBe('Mar 19, 2026, 3:28 PM UTC')
  })

  it('handles 0 without throwing', () => {
    expect(() => formatTimestamp(0)).not.toThrow()
  })

  it('handles a future timestamp without throwing', () => {
    expect(() => formatTimestamp(9999999999)).not.toThrow()
  })
})

describe('timeAgo', () => {
  afterEach(() => vi.useRealTimers())

  const freeze = (nowSeconds: number) => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
  }

  it('returns seconds ago', () => {
    freeze(1000)
    expect(timeAgo(955)).toBe('45 seconds ago')
  })

  it('returns singular second', () => {
    freeze(1000)
    expect(timeAgo(999)).toBe('1 second ago')
  })

  it('returns minutes ago', () => {
    freeze(1000)
    expect(timeAgo(880)).toBe('2 minutes ago')
  })

  it('returns hours ago', () => {
    freeze(7200)
    expect(timeAgo(3600)).toBe('1 hour ago')
  })

  it('returns days ago', () => {
    freeze(86400 * 3)
    expect(timeAgo(86400)).toBe('2 days ago')
  })

  it('returns just now for future timestamps', () => {
    freeze(1000)
    expect(timeAgo(2000)).toBe('just now')
  })

  it('handles 0 without throwing', () => {
    freeze(1000)
    expect(() => timeAgo(0)).not.toThrow()
  })
})
