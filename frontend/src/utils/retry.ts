// Retry utility with exponential backoff for transient errors

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 500

/**
 * Determines if an error is transient and should be retried
 */
export const isTransientError = (error: unknown): boolean => {
  if (!error) return false

  const err = error as Record<string, unknown>
  const errorMessage = (err.message as string)?.toLowerCase() || ''
  const errorCode = (err.code as string)?.toLowerCase() || ''

  // Network errors - should retry
  const networkErrors = [
    'network',
    'timeout',
    'econnrefused',
    'enotfound',
    'etimedout',
    'fetch failed',
    'failed to fetch',
  ]

  // RPC/Server errors - should retry
  const rpcErrors = [
    'rate limit',
    'too many requests',
    'service unavailable',
    'internal server error',
    'bad gateway',
    '502',
    '503',
    '504',
  ]

  // Contract/Auth errors - should NOT retry
  const nonRetryableErrors = [
    'unauthorized',
    'forbidden',
    'invalid signature',
    'insufficient balance',
    'contract error',
    'invalid parameter',
    'already exists',
  ]

  // Check if it's a non-retryable error first
  for (const pattern of nonRetryableErrors) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return false
    }
  }

  // Check if it's a retryable error
  for (const pattern of [...networkErrors, ...rpcErrors]) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return true
    }
  }

  // HTTP status codes
  if (err.status) {
    const status = err.status as number
    // Retry on 5xx server errors and 429 rate limit
    if (status === 429 || (status >= 500 && status < 600)) {
      return true
    }
    // Don't retry on 4xx client errors (except 429)
    if (status >= 400 && status < 500) {
      return false
    }
  }

  // Default: don't retry unknown errors
  return false
}

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    shouldRetry = isTransientError,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error
      }

      // Don't delay after the last attempt
      if (attempt === maxAttempts) {
        break
      }

      // Calculate exponential backoff delay: baseDelay * 2^(attempt-1)
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
      
      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`,
        error
      )

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  // All attempts failed
  throw lastError
}
