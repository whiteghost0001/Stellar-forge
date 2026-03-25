import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './UI/Input'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'

export const BurnForm: React.FC = () => {
  const { t } = useTranslation()
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
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('burnForm.tokenAddress')}
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder={t('burnForm.tokenAddressPlaceholder')}
      />
      {tokenInfo && <p className="text-sm text-gray-600">{t('burnForm.tokenFound')} {JSON.stringify(tokenInfo)}</p>}
      <Input
        label={t('burnForm.amount')}
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={t('burnForm.amountPlaceholder')}
      />
      <button type="submit" className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        {t('burnForm.burn')}
      </button>
    </form>
  )
}
