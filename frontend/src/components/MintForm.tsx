import { useState, useEffect } from 'react'
import { Input, Button, ConfirmModal } from './UI'
import { useDebounce } from '../hooks/useDebounce'
import { useTos } from '../context/TosContext'
import { useStellarContext } from '../context/StellarContext'
import { useWalletContext } from '../context/WalletContext'
import { useToast } from '../context/ToastContext'
import { isValidStellarAddress } from '../utils/validation'
import type { TokenInfo } from '../types'

const BASE_FEE_STROOPS = '100000' // 0.01 XLM
const ESTIMATED_FEE_DISPLAY = '0.01 XLM'
const ADDRESS_DEBOUNCE_DELAY = 500

interface MintFormProps {
  tokenAddress?: string
  onSuccess?: () => void
}

export const MintForm: React.FC<MintFormProps> = ({
  tokenAddress: initialAddress = '',
  onSuccess,
}) => {
  const { stellarService } = useStellarContext()
  const { wallet } = useWalletContext()
  const { addToast } = useToast()
  const { requireTos } = useTos()

  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [pending, setPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recipientHasAccount, setRecipientHasAccount] = useState<boolean | null>(null)
  const [recipientValidationError, setRecipientValidationError] = useState<string | null>(null)
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false)

  const debouncedAddress = useDebounce(tokenAddress, ADDRESS_DEBOUNCE_DELAY)
  const debouncedRecipient = useDebounce(recipient, ADDRESS_DEBOUNCE_DELAY)

  useEffect(() => {
    if (!debouncedAddress) { setTokenInfo(null); return }
    stellarService
      .getTokenInfo(debouncedAddress)
      .then(setTokenInfo)
      .catch(() => setTokenInfo(null))
  }, [debouncedAddress, stellarService])

  useEffect(() => {
    const trimmed = debouncedRecipient.trim()
    if (!trimmed) {
      setRecipientHasAccount(null)
      setRecipientValidationError(null)
      setIsCheckingRecipient(false)
      return
    }
    if (!isValidStellarAddress(trimmed)) {
      setRecipientHasAccount(null)
      setRecipientValidationError('Enter a valid Stellar account address.')
      setIsCheckingRecipient(false)
      return
    }
    let cancelled = false
    setRecipientValidationError(null)
    setIsCheckingRecipient(true)
    stellarService
      .accountExists(trimmed)
      .then((exists) => { if (!cancelled) setRecipientHasAccount(exists) })
      .catch(() => {
        if (!cancelled) {
          setRecipientHasAccount(null)
          setRecipientValidationError('Could not verify whether this address is funded right now.')
        }
      })
      .finally(() => { if (!cancelled) setIsCheckingRecipient(false) })
    return () => { cancelled = true }
  }, [debouncedRecipient, stellarService])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.isConnected) { addToast('Connect your wallet first', 'error'); return }
    requireTos(() => setPending(true))
  }

  const handleConfirm = async () => {
    setPending(false)
    setIsSubmitting(true)
    try {
      await stellarService.mintTokens({
        tokenAddress,
        to: recipient,
        amount,
        feePayment: BASE_FEE_STROOPS,
      })
      addToast('Tokens minted successfully', 'success')
      setAmount('')
      setRecipient('')
      setRecipientHasAccount(null)
      onSuccess?.()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Mint failed', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Token Address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="C..."
          required
          disabled={!!initialAddress}
        />
        {tokenInfo && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Token: {tokenInfo.name} ({tokenInfo.symbol})
          </p>
        )}
        <Input
          label="Recipient Address"
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value)
            setRecipientHasAccount(null)
            setRecipientValidationError(null)
            setIsCheckingRecipient(false)
          }}
          placeholder="G..."
          {...(recipientValidationError ? { error: recipientValidationError } : {})}
          required
        />
        {isCheckingRecipient && !recipientValidationError && (
          <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
            Checking whether the recipient account is funded...
          </p>
        )}
        {recipientHasAccount === false && !recipientValidationError && (
          <p className="text-sm text-amber-600 dark:text-amber-400" role="status" aria-live="polite">
            This address does not have a Stellar account yet. It may need to be funded first.
          </p>
        )}
        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Estimated fee: {ESTIMATED_FEE_DISPLAY}
        </p>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Mint Tokens
        </Button>
      </form>

      <ConfirmModal
        isOpen={pending}
        title="Confirm Mint"
        description="You are about to mint tokens to the recipient address. This action cannot be undone."
        details={[
          {
            label: 'Token',
            value: tokenInfo ? `${tokenInfo.name} (${tokenInfo.symbol})` : tokenAddress,
          },
          { label: 'Recipient', value: recipient },
          { label: 'Amount', value: amount },
          { label: 'Estimated Fee', value: ESTIMATED_FEE_DISPLAY },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPending(false)}
        confirmLabel="Mint Tokens"
      />
    </>
  )
}
