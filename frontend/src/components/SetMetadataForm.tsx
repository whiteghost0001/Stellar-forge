import { useState } from 'react'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { isValidIPFSUri } from '../utils/validation'

interface Props {
  onSubmit: (tokenAddress: string, metadataUri: string) => Promise<void>
}

export const SetMetadataForm: React.FC<Props> = ({ onSubmit }) => {
  const [tokenAddress, setTokenAddress] = useState('')
  const [metadataUri, setMetadataUri] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidIPFSUri(metadataUri)) {
      setError('Metadata URI must be a valid IPFS URI (e.g. ipfs://Qm...)')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onSubmit(tokenAddress, metadataUri)
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Set Metadata'}
      </Button>
    </form>
  )
}
