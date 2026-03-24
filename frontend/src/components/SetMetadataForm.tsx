import { useState } from 'react'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { isValidIPFSUri } from '../utils/validation'
import { useToast } from '../context/ToastContext'

interface Props {
  tokenAddress?: string
  onSubmit: (tokenAddress: string, metadataUri: string) => Promise<void>
}

export const SetMetadataForm: React.FC<Props> = ({ tokenAddress: initialAddress = '', onSubmit }) => {
  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [metadataUri, setMetadataUri] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidIPFSUri(metadataUri)) {
      addToast('Metadata URI must be a valid IPFS URI (e.g. ipfs://Qm...)', 'error')
      return
    }
    setLoading(true)
    try {
      await onSubmit(tokenAddress, metadataUri)
      addToast('Metadata updated successfully', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to set metadata', 'error')
    } finally {
      setLoading(false)
    }
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
      <Input
        label="Metadata URI"
        value={metadataUri}
        onChange={(e) => setMetadataUri(e.target.value)}
        placeholder="ipfs://Qm..."
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Set Metadata'}
      </Button>
    </form>
  )
}
