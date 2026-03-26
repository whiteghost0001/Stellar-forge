import { useState, useEffect, useCallback, useRef } from 'react'
import { stellarService } from '../services/stellar'
import { STELLAR_CONFIG } from '../config/stellar'
import type { TokenInfo } from '../types'

// ── Module-level cache keyed by creator address ('' = all tokens) ─────────────
const CACHE_TTL_MS = 30_000

interface CacheEntry {
  tokens: TokenInfo[]
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

/** Exposed for testing only */
export function _clearCache() { cache.clear() }

// ── Parallel token fetcher ────────────────────────────────────────────────────

async function fetchTokens(creator?: string): Promise<TokenInfo[]> {
  const contractId = STELLAR_CONFIG.factoryContractId
  if (!contractId) throw new Error('VITE_FACTORY_CONTRACT_ID is not configured')

  if (creator) {
    return stellarService.getTokensByCreator(creator)
  }

  // Fetch all: get event list then resolve each token address in parallel
  const { events } = await stellarService.getContractEvents(contractId, 100)
  const addresses = [
    ...new Set(
      events
        .filter((e) => e.type === 'token_created')
        .map((e) => e.data.tokenAddress)
        .filter(Boolean),
    ),
  ]

  const results = await Promise.allSettled(
    addresses.map((addr) => stellarService.getTokenInfo(addr)),
  )

  return results
    .filter((r): r is PromiseFulfilledResult<TokenInfo> => r.status === 'fulfilled')
    .map((r) => r.value)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseTokensResult {
  tokens: TokenInfo[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useTokens(creator?: string): UseTokensResult {
  const cacheKey = creator ?? ''
  const cached = cache.get(cacheKey)

  const [tokens, setTokens] = useState<TokenInfo[]>(cached?.tokens ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetchingRef = useRef(false)

  const load = useCallback(async (bypassCache: boolean) => {
    const now = Date.now()
    const hit = cache.get(cacheKey)

    if (!bypassCache && hit && now - hit.fetchedAt < CACHE_TTL_MS) {
      setTokens(hit.tokens)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchTokens(creator)
      cache.set(cacheKey, { tokens: result, fetchedAt: Date.now() })
      setTokens(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [cacheKey, creator])

  useEffect(() => {
    load(false)
  }, [load])

  const refetch = useCallback(() => load(true), [load])

  return { tokens, isLoading, error, refetch }
}
