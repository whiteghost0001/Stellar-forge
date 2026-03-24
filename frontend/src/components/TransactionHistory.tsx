import { useState, useEffect, useCallback } from 'react'
import { stellarService } from '../services/stellar'
import { Button } from './UI/Button'
import { Spinner } from './UI/Spinner'
import { STELLAR_CONFIG } from '../config/stellar'
import type { ContractEvent, ContractEventType } from '../types'

interface Props {
  contractId: string
  /** Optional: filter to events for a specific token address */
  tokenAddress?: string
  pageSize?: number
}

const EVENT_LABELS: Record<ContractEventType, string> = {
  token_created: 'Token Created',
  tokens_minted: 'Tokens Minted',
  tokens_burned: 'Tokens Burned',
  metadata_set: 'Metadata Set',
  fees_updated: 'Fees Updated',
}

const EVENT_COLORS: Record<ContractEventType, string> = {
  token_created: 'bg-green-100 text-green-800',
  tokens_minted: 'bg-blue-100 text-blue-800',
  tokens_burned: 'bg-red-100 text-red-800',
  metadata_set: 'bg-purple-100 text-purple-800',
  fees_updated: 'bg-yellow-100 text-yellow-800',
}

function formatTimestamp(unix: number): string {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function truncate(str: string, len = 12): string {
  if (!str || str.length <= len) return str
  return `${str.slice(0, 6)}…${str.slice(-4)}`
}

function EventDataRow({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex gap-1 text-xs text-gray-600">
      <span className="font-medium">{label}:</span>
      <span title={value} className="font-mono">{truncate(value, 20)}</span>
    </span>
  )
}

function renderEventData(event: ContractEvent) {
  const d = event.data
  switch (event.type) {
    case 'token_created':
      return (
        <div className="flex flex-wrap gap-3">
          <EventDataRow label="Token" value={d.tokenAddress} />
          <EventDataRow label="Creator" value={d.creator} />
        </div>
      )
    case 'tokens_minted':
      return (
        <div className="flex flex-wrap gap-3">
          <EventDataRow label="Token" value={d.tokenAddress} />
          <EventDataRow label="To" value={d.to} />
          <EventDataRow label="Amount" value={d.amount} />
        </div>
      )
    case 'tokens_burned':
      return (
        <div className="flex flex-wrap gap-3">
          <EventDataRow label="Token" value={d.tokenAddress} />
          <EventDataRow label="From" value={d.from} />
          <EventDataRow label="Amount" value={d.amount} />
        </div>
      )
    case 'metadata_set':
      return (
        <div className="flex flex-wrap gap-3">
          <EventDataRow label="Token" value={d.tokenAddress} />
          <EventDataRow label="URI" value={d.metadataUri} />
        </div>
      )
    case 'fees_updated':
      return (
        <div className="flex flex-wrap gap-3">
          <EventDataRow label="Base fee" value={d.baseFee} />
          <EventDataRow label="Metadata fee" value={d.metadataFee} />
        </div>
      )
  }
}

export const TransactionHistory: React.FC<Props> = ({
  contractId,
  tokenAddress,
  pageSize = 20,
}) => {
  const [events, setEvents] = useState<ContractEvent[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const filterEvents = useCallback(
    (evts: ContractEvent[]) =>
      tokenAddress
        ? evts.filter(
            (e) =>
              e.data.tokenAddress === tokenAddress ||
              e.data.creator === tokenAddress,
          )
        : evts,
    [tokenAddress],
  )

  const fetchInitial = useCallback(async () => {
    if (!contractId) return
    setLoading(true)
    setError(null)
    try {
      const result = await stellarService.getContractEvents(contractId, pageSize)
      setEvents(filterEvents(result.events))
      setCursor(result.cursor)
      setHasMore(result.events.length === pageSize)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [contractId, pageSize, filterEvents])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  const loadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await stellarService.getContractEvents(contractId, pageSize, cursor)
      const filtered = filterEvents(result.events)
      setEvents((prev) => [...prev, ...filtered])
      setCursor(result.cursor)
      setHasMore(result.events.length === pageSize)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more events')
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
        <button
          onClick={fetchInitial}
          className="ml-2 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">No events found.</p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {events.map((event) => (
          <li key={event.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${EVENT_COLORS[event.type]}`}
              >
                {EVENT_LABELS[event.type]}
              </span>
              <span className="text-xs text-gray-400">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
            {renderEventData(event)}
            <a
              href={`https://stellar.expert/explorer/${STELLAR_CONFIG.network}/tx/${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 text-xs text-indigo-500 hover:underline font-mono"
              title={event.txHash}
            >
              tx: {truncate(event.txHash, 24)}
            </a>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={loadMore} loading={loadingMore} variant="secondary">
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
