import { useState, useEffect, useCallback, useRef } from 'react'
import { stellarService } from '../services/stellar'
import { useFactoryState } from './useFactoryState'
import { STELLAR_CONFIG } from '../config/stellar'
import type { TokenInfo } from '../types'

const PAGE_SIZE = 10

export interface TokenRow extends TokenInfo {
  /** Token contract address (from token_created event) */
  address: string
}

export interface UseTokenDashboardResult {
  rows: TokenRow[]
  isLoading: boolean
  error: Error | null
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  setPage: (p: number) => void
  refresh: () => void
}

// Module-level cache
let cachedRows: TokenRow[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 30_000

export function useTokenDashboard(): UseTokenDashboardResult {
  const { state, isLoading: stateLoading, error: stateError, refetch } = useFactoryState()

  const [allRows, setAllRows] = useState<TokenRow[]>(cachedRows ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPageRaw] = useState(1)
  const fetchingRef = useRef(false)

  const totalCount = state?.tokenCount ?? allRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.min(Math.max(1, p), totalPages)),
    [totalPages],
  )

  const load = useCallback(async (bypass: boolean) => {
    const now = Date.now()
    if (!bypass && cachedRows && now - cachedAt < CACHE_TTL_MS) {
      setAllRows(cachedRows)
      return
    }
    if (fetchingRef.current) return
    fetchingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('VITE_FACTORY_CONTRACT_ID is not configured')

      // Collect token addresses from events (token_created events carry the address)
      const { events } = await stellarService.getContractEvents(contractId, 200)
      const addresses = [
        ...new Set(
          events
            .filter((e) => e.type === 'token_created')
            .map((e) => e.data.tokenAddress)
            .filter((a): a is string => !!a),
        ),
      ]

      const results = await Promise.allSettled(
        addresses.map((addr) => stellarService.getTokenInfo(addr)),
      )

      const rows: TokenRow[] = results
        .map((r, i) =>
          r.status === 'fulfilled' ? { ...r.value, address: addresses[i] } : null,
        )
        .filter((r): r is TokenRow => r !== null)

      cachedRows = rows
      cachedAt = Date.now()
      setAllRows(rows)
      setPageRaw(1)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  const refresh = useCallback(() => {
    cachedRows = null
    refetch()
    load(true)
  }, [load, refetch])

  const start = (page - 1) * PAGE_SIZE
  const rows = allRows.slice(start, start + PAGE_SIZE)

  return {
    rows,
    isLoading: stateLoading || isLoading,
    error: stateError ?? error,
    page,
    totalPages,
    totalCount,
    pageSize: PAGE_SIZE,
    setPage,
    refresh,
  }
}
