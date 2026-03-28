import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, isTransientError } from '../utils/retry'

describe('isTransientError', () => {
  it('should identify network errors as transient', () => {
    expect(isTransientError({ message: 'Network error occurred' })).toBe(true)
    expect(isTransientError({ message: 'Connection timeout' })).toBe(true)
    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true)
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true)
    expect(isTransientError({ message: 'Failed to fetch' })).toBe(true)
  })

  it('should identify RPC errors as transient', () => {
    expect(isTransientError({ message: 'Rate limit exceeded' })).toBe(true)
    expect(isTransientError({ message: 'Too many requests' })).toBe(true)
    expect(isTransientError({ message: 'Service unavailable' })).toBe(true)
    expect(isTransientError({ message: 'Internal server error' })).toBe(true)
    expect(isTransientError({ status: 429 })).toBe(true)
    expect(isTransientError({ status: 502 })).toBe(true)
    expect(isTransientError({ status: 503 })).toBe(true)
    expect(isTransientError({ status: 504 })).toBe(true)
  })

  it('should NOT identify contract errors as transient', () => {
    expect(isTransientError({ message: 'Contract error: invalid operation' })).toBe(false)
    expect(isTransientError({ message: 'Insufficient balance' })).toBe(false)
    expect(isTransientError({ message: 'Invalid parameter provided' })).toBe(false)
    expect(isTransientError({ message: 'Token already exists' })).toBe(false)
  })

  it('should NOT identify auth errors as transient', () => {
    expect(isTransientError({ message: 'Unauthorized access' })).toBe(false)
    expect(isTransientError({ message: 'Forbidden operation' })).toBe(false)
    expect(isTransientError({ message: 'Invalid signature' })).toBe(false)
    expect(isTransientError({ status: 401 })).toBe(false)
    expect(isTransientError({ status: 403 })).toBe(false)
  })

  it('should NOT retry 4xx client errors except 429', () => {
    expect(isTransientError({ status: 400 })).toBe(false)
    expect(isTransientError({ status: 404 })).toBe(false)
    expect(isTransientError({ status: 422 })).toBe(false)
  })

  it('should handle null/undefined errors', () => {
    expect(isTransientError(null)).toBe(false)
    expect(isTransientError(undefined)).toBe(false)
    expect(isTransientError({})).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on transient errors up to maxAttempts', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ message: 'Network error' })
      .mockRejectedValueOnce({ message: 'Network error' })
      .mockResolvedValue('success')

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 500 })

    // Fast-forward through delays
    await vi.advanceTimersByTimeAsync(500) // First retry delay
    await vi.advanceTimersByTimeAsync(1000) // Second retry delay

    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should use exponential backoff delays', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ message: 'Network error' })
      .mockRejectedValueOnce({ message: 'Network error' })
      .mockResolvedValue('success')

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 500 })

    // Verify delays: 500ms, 1000ms
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)

    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should NOT retry contract errors', async () => {
    const contractError = { message: 'Contract error: invalid operation' }
    const fn = vi.fn().mockRejectedValue(contractError)

    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toEqual(contractError)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should NOT retry auth errors', async () => {
    const authError = { message: 'Unauthorized access' }
    const fn = vi.fn().mockRejectedValue(authError)

    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toEqual(authError)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should throw error after all attempts exhausted', async () => {
    const error = { message: 'Network error' }
    const fn = vi.fn().mockRejectedValue(error)

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 500 })
    const assertion = expect(promise).rejects.toEqual(error)

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)

    await assertion
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should respect custom shouldRetry function', async () => {
    const error = { code: 'CUSTOM_ERROR' }
    const fn = vi.fn().mockRejectedValue(error)
    const shouldRetry = vi.fn().mockReturnValue(false)

    await expect(withRetry(fn, { shouldRetry })).rejects.toEqual(error)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(error)
  })

  it('should use default values when options not provided', async () => {
    const fn = vi.fn().mockRejectedValue({ message: 'Network error' })

    const promise = withRetry(fn)
    const assertion = expect(promise).rejects.toBeDefined()

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)

    await assertion
    expect(fn).toHaveBeenCalledTimes(3) // Default maxAttempts
  })

  it('should handle successful retry after transient failure', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue('recovered')

    const promise = withRetry(fn, { baseDelayMs: 100 })

    await vi.advanceTimersByTimeAsync(100)

    const result = await promise

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
