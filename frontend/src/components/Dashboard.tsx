import { useState, useEffect, useCallback, useMemo } from 'react'
import { Input } from './UI/Input'
import { TransactionHistory } from './TransactionHistory'
import { useDebounce } from '../hooks/useDebounce'
import { useWallet } from '../hooks/useWallet'
import { stellarService } from '../services/stellar'
import { STELLAR_CONFIG } from '../config/stellar'
import type { TokenInfo } from '../types'

export const TokenDashboard: React.FC = () => {
  const { wallet } = useWallet()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadTokens = useCallback(async () => {
    if (!wallet.address) {
      setTokens([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const tokenList = await stellarService.getTokensByCreator(wallet.address)
      setTokens(tokenList)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tokens'
      setError(message)
      setTokens([])
    } finally {
      setIsLoading(false)
    }
  }, [wallet.address])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 1800)
    } catch {
      setError('Unable to copy token address. Check browser clipboard permissions and try again.')
    }
  }

  const formatCreationDate = useMemo(
    () => (createdAt: number | undefined) => {
      if (!createdAt) return 'Unknown'
      return new Date(createdAt * 1000).toLocaleString()
    },
    []
  )

  const results = useMemo(() => {
    if (!search.trim()) return tokens
    const query = search.toLowerCase()
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.symbol.toLowerCase().includes(query) ||
        t.creator.toLowerCase().includes(query)
    )
  }, [tokens, search])

  const factoryContractId = STELLAR_CONFIG.factoryContractId

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Search tokens"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address or name..."
        />
        <ul className="space-y-2">
          {results.map((r, i) => (
            <li key={i} className="p-2 border rounded text-sm">{JSON.stringify(r)}</li>
          ))}
        </ul>
      </div>

      {factoryContractId && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">Recent Activity</h2>
          <TransactionHistory contractId={factoryContractId} />
        </div>
      )}
    </div>
  )
}

export const Dashboard = TokenDashboard
