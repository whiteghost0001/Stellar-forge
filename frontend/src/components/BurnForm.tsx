import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Button, ConfirmModal } from './UI'
import { useDebounce } from '../hooks/useDebounce'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { useWalletContext } from '../context/WalletContext'
import { useTos } from '../context/TosContext'
import { stellarService } from '../services/stellar'
import type { TokenInfo } from '../types'

interface BurnFormProps {
  tokenAddress?: string
  onSuccess?: () => void
}

export const BurnForm: React.FC<BurnFormProps> = ({ tokenAddress: initialAddress = '', onSuccess }) => {
  const { t } = useTranslation()
  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [pending, setPending] = useState(false)

  const { wallet } = useWalletContext()
  const { requireTos } = useTos()
  const debouncedAddress = useDebounce(tokenAddress, 300)

  const { balance, refresh: refreshBalance } = useTokenBalance(
    debouncedAddress,
    wallet.address ?? '',
  )

  useEffect(() => {
    if (!debouncedAddress) return
    stellarService.getTokenInfo(debouncedAddress).then(setTokenInfo).catch(() => setTokenInfo(null))
  }, [debouncedAddress])

  const amountExceedsBalance =
    !!amount && !!balance && BigInt(balance) > 0n && BigInt(amount) > BigInt(balance)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amountExceedsBalance) return
    requireTos(() => setPending(true))
  }

  const handleConfirm = () => {
    setPending(false)
    refreshBalance()
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
        {wallet.address && debouncedAddress && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your balance: {balance}
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
        {amountExceedsBalance && (
          <p className="text-sm text-red-500">Amount exceeds your balance of {balance}</p>
        )}
        <Button type="submit" variant="secondary" disabled={amountExceedsBalance}>
          {t('burnForm.burn')}
        </Button>
      </form>

      <ConfirmModal
        isOpen={pending}
        title="Confirm Burn"
        description="This will permanently destroy the specified token amount."
        details={[
          { label: 'Token', value: tokenInfo ? `${tokenInfo.name} (${tokenInfo.symbol})` : tokenAddress },
          { label: 'Amount to Burn', value: amount },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPending(false)}
        confirmLabel="Burn Tokens"
      />
    </>
  )
}
