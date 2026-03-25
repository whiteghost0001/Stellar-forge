import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { isValidIPFSUri } from '../utils/validation'
import { useToast } from '../context/ToastContext'

interface Props {
  onSubmit: (tokenAddress: string, metadataUri: string) => Promise<void>
}

export const SetMetadataForm: React.FC<Props> = ({ onSubmit }) => {
  const { t } = useTranslation()
  const [tokenAddress, setTokenAddress] = useState('')
  const [metadataUri, setMetadataUri] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidIPFSUri(metadataUri)) {
      addToast(t('setMetadata.invalidUri'), 'error')
      return
    }
    setLoading(true)
    try {
      await onSubmit(tokenAddress, metadataUri)
      addToast(t('setMetadata.success'), 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('setMetadata.success'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label={t('setMetadata.tokenAddress')} value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder={t('setMetadata.tokenAddressPlaceholder')} required />
      <Input label={t('setMetadata.metadataUri')} value={metadataUri} onChange={(e) => setMetadataUri(e.target.value)} placeholder={t('setMetadata.metadataUriPlaceholder')} required />
      <Button type="submit" disabled={loading}>
        {loading ? t('setMetadata.submitting') : t('setMetadata.submit')}
      </Button>
    </form>
  )
}
