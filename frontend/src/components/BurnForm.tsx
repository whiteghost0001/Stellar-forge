import { useState, useEffect } from 'react'
import { Input } from './UI/Input'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'

export const BurnForm: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<any>(null)

  const debouncedAddress = useDebounce(tokenAddress, 300)

  useEffect(() => {
    if (!debouncedAddress) return
    stellarService.getTokenInfo(debouncedAddress).then(setTokenInfo)
  }, [debouncedAddress])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // burn logic here
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Token Address"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="G..."
      />
      {tokenInfo && <p className="text-sm text-gray-600">Token found: {JSON.stringify(tokenInfo)}</p>}
      <Input
        label="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
      />
      <button type="submit" className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        Burn
      </button>
    </form>
  )
}
