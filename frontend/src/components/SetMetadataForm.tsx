import { useState } from 'react'
import { Input, Button, ConfirmModal } from './UI'
import { isValidIPFSUri } from '../utils/validation'
import { useToast } from '../context/ToastContext'
import { isIpfsConfigured } from '../config/env'

const ESTIMATED_FEE = '0.01' // XLM

interface Props {
  tokenAddress?: string
  onSubmit: (tokenAddress: string, metadataUri: string) => Promise<void>
}

export const SetMetadataForm: React.FC<Props> = ({ tokenAddress: initialAddress = '', onSubmit }) => {
  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [metadataUri, setMetadataUri] = useState('')
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const { addToast } = useToast()
  const ipfsReady = isIpfsConfigured()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidIPFSUri(metadataUri)) {
      addToast('Metadata URI must be a valid IPFS URI (e.g. ipfs://Qm...)', 'error')
      return
    }
    setPending(true)
  }

  const handleConfirm = async () => {
    setPending(false)
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
    <>
      {!ipfsReady && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-300 px-4 py-3 text-yellow-800 text-sm" role="alert">
          IPFS upload is disabled. Set <code className="font-mono bg-yellow-100 px-1 rounded">VITE_IPFS_API_KEY</code> and <code className="font-mono bg-yellow-100 px-1 rounded">VITE_IPFS_API_SECRET</code> to enable metadata uploads.
        </div>
      )}
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
          disabled={!ipfsReady}
        />
        <div title={!ipfsReady ? 'IPFS credentials are not configured' : undefined}>
          <Button type="submit" disabled={loading || !ipfsReady}>
            {loading ? 'Submitting...' : 'Set Metadata'}
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={pending}
        title="Confirm Set Metadata"
        description="Review the metadata update before submitting on-chain."
        details={[
          { label: 'Token Address', value: tokenAddress },
          { label: 'Metadata URI', value: metadataUri },
          { label: 'Estimated Fee', value: `${ESTIMATED_FEE} XLM` },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPending(false)}
        confirmLabel="Set Metadata"
      />
    </>
  )
}
