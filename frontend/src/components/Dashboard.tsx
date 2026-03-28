import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyButton } from './CopyButton'
import { Input, PaginationControls } from './UI'
import { TransactionHistory } from './TransactionHistory'
import { useDebounce } from '../hooks/useDebounce'
import { useTokenDashboard } from '../hooks/useTokenDashboard'
import { STELLAR_CONFIG } from '../config/stellar'
import { formatAddress } from '../utils/formatting'

function explorerUrl(address: string): string {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  const base =
    network === 'mainnet'
      ? 'https://stellar.expert/explorer/public/contract'
      : 'https://stellar.expert/explorer/testnet/contract'
  return `${base}/${address}`
}

function SkeletonRow() {
  return (
    <li className="p-3 border rounded animate-pulse flex items-center justify-between gap-2">
      <div className="space-y-1.5 flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-20" />
    </li>
  )
}

export const TokenDashboard: React.FC = () => {
  const { rows, isLoading, error, page, totalPages, totalCount, pageSize, setPage, refresh } =
    useTokenDashboard()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filteredRows = useMemo(() => {
    if (!debouncedSearch.trim()) return rows
    const q = debouncedSearch.toLowerCase()
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q),
    )
  }, [rows, debouncedSearch])

  const factoryContractId = STELLAR_CONFIG.factoryContractId

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            label={t('dashboard.searchLabel')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or symbol..."
          />
          <button
            onClick={refresh}
            disabled={isLoading}
            className="mt-6 px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 transition-colors shrink-0"
            aria-label="Refresh token list"
          >
            ↻ Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error.message}</p>}

        <ul className="space-y-2" aria-label="Deployed tokens">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filteredRows.length === 0 ? (
            <li className="text-sm text-gray-500 py-4 text-center">
              {totalCount === 0
                ? 'No tokens have been deployed yet.'
                : 'No tokens match your search.'}
            </li>
          ) : (
            filteredRows.map((token) => (
              <li
                key={token.address}
                className="p-3 border rounded text-sm flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-medium">{token.name}</span>
                  <span className="ml-2 text-gray-500 font-mono">({token.symbol})</span>
                  <div
                    className="text-xs text-gray-400 mt-0.5 font-mono truncate"
                    title={token.address}
                  >
                    {formatAddress(token.address)}
                  </div>
                  {token.creator && (
                    <div className="text-xs text-gray-400 font-mono truncate" title={token.creator}>
                      Creator: {formatAddress(token.creator)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-blue-500 hover:underline shrink-0 truncate max-w-[100px]" title={token.address} aria-label={`View ${token.name} on Stellar Explorer`}>
                    {token.address}
                  </span>
                  <CopyButton value={token.address} ariaLabel="Copy token address" />
                  <a
                    href={explorerUrl(token.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline shrink-0"
                    aria-label={`View ${token.name} on Stellar Explorer`}
                  >
                    ↗
                  </a>
                </div>
              </li>
            ))
          )}
        </ul>

        {!debouncedSearch.trim() && !isLoading && totalCount > 0 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPrev={() => setPage(page - 1)}
            onNext={() => setPage(page + 1)}
          />
        )}
      </div>

      {factoryContractId && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">{t('dashboard.recentActivity')}</h2>
          <TransactionHistory contractId={factoryContractId} />
        </div>
      )}
    </div>
  )
}

export const Dashboard = TokenDashboard

