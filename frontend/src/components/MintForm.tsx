import { useState, useEffect } from 'react'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'
import type { TokenInfo } from '../types'

interface MintFormProps {
  tokenAddress?: string
  onSuccess?: () => void
}

export const MintForm: React.FC<MintFormProps> = ({ tokenAddress: initialAddress = '', onSuccess }) => {
  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)

  const debouncedAddress = useDebounce(tokenAddress, 300)

  useEffect(() => {
    if (!debouncedAddress) return
    stellarService.getTokenInfo(debouncedAddress).then(setTokenInfo).catch(() => setTokenInfo(null))
  }, [debouncedAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // mint logic placeholder
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Token Address"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="G..."
        required
      />
      {tokenInfo && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Token: {tokenInfo.name} ({tokenInfo.symbol})
        </p>
      )}
      <Input
        label="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
        min="0"
        required
      />
      <Button type="submit" variant="primary">Mint</Button>
    </form>
  )
}
