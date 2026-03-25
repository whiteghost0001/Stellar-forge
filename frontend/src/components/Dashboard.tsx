import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './UI/Input'
import { TransactionHistory } from './TransactionHistory'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'
import { STELLAR_CONFIG } from '../config/stellar'
import { useWallet } from '../hooks/useWallet'

export const TokenDashboard: React.FC = () => {
  const { t } = useTranslation()
  const { wallet } = useWallet()
  const [tokens, setTokens] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const loadTokens = useCallback(async () => {
    if (!wallet.address) { setTokens([]); setIsLoading(false); return }
    setIsLoading(true); setError(null)
    try {
      const tokenList = await stellarService.getTokensByCreator(wallet.address)
      setTokens(tokenList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens')
      setTokens([])
    } finally {
      setIsLoading(false)
    }
  }, [wallet.address])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 1800)
    } catch {
      setError(t('dashboard.copyError'))
    }
  }

  const results = useMemo(
    () => tokens.filter((r) => JSON.stringify(r).toLowerCase().includes(debouncedSearch.toLowerCase())),
    [tokens, debouncedSearch]
  )

  const factoryContractId = STELLAR_CONFIG.factoryContractId

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          label={t('dashboard.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('dashboard.searchPlaceholder')}
        />
        <ul className="space-y-2">
          {results.map((r, i) => (
            <li key={i} className="p-2 border rounded text-sm">{JSON.stringify(r)}</li>
          ))}
        </ul>
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
