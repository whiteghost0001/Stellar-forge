import { useState, useEffect } from 'react'
import { Input, Button, ConfirmModal } from './UI'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'
import type { TokenInfo } from '../types'

const ESTIMATED_FEE = '0.01' // XLM

interface MintFormProps {
  tokenAddress?: string
  onSuccess?: () => void
}

export const MintForm: React.FC<MintFormProps> = ({ tokenAddress: initialAddress = '', onSuccess }) => {
  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [pending, setPending] = useState(false)

  const debouncedAddress = useDebounce(tokenAddress, 300)

  useEffect(() => {
    if (!debouncedAddress) return
    stellarService.getTokenInfo(debouncedAddress).then(setTokenInfo).catch(() => setTokenInfo(null))
  }, [debouncedAddress])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
  }

  const handleConfirm = async () => {
    setPending(false)
    // mint logic placeholder
    onSuccess?.()
  }

  return (
    <>
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
          label="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="G..."
          required
        />
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

      <ConfirmModal
        isOpen={pending}
        title="Confirm Mint"
        description="You are about to mint tokens to the recipient address."
        details={[
          { label: 'Token', value: tokenInfo ? `${tokenInfo.name} (${tokenInfo.symbol})` : tokenAddress },
          { label: 'Recipient', value: recipient },
          { label: 'Amount', value: amount },
          { label: 'Estimated Fee', value: `${ESTIMATED_FEE} XLM` },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPending(false)}
        confirmLabel="Mint Tokens"
      />
    </>
  )
}
