import { useEffect, useState } from 'react'
import { useStellarContext } from '../context/StellarContext'
import { useParams, Link } from 'react-router-dom'
import { ipfsService } from '../services/ipfs'
import { useNetwork } from '../context/NetworkContext'
import { stellarExplorerUrl, ipfsToGatewayUrl } from '../utils/formatting'
import { isValidContractAddress } from '../utils/validation'
import type { TokenInfo, IPFSMetadata } from '../types'
import { Card } from './UI/Card'
import { Button } from './UI/Button'
import { Spinner } from './UI/Spinner'
import { MintForm } from './MintForm'
import { BurnForm } from './BurnForm'
import { SetMetadataForm } from './SetMetadataForm'
import { useToast } from '../context/ToastContext'

type ActivePanel = 'mint' | 'burn' | 'metadata' | null

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString()
}

export const TokenDetail: React.FC = () => {
  const { stellarService } = useStellarContext()
  const { address } = useParams<{ address: string }>()
  const { addToast } = useToast()
  const { network } = useNetwork()

  const [token, setToken] = useState<TokenInfo | null>(null)
  const [metadata, setMetadata] = useState<IPFSMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  useEffect(() => {
    if (!address || !isValidContractAddress(address)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setNotFound(false)

    stellarService
      .getTokenInfo(address)
      .then(async (info) => {
        setToken(info)
        if (info.metadataUri) {
          try {
            const meta = await ipfsService.getMetadata(info.metadataUri)
            setMetadata(meta as IPFSMetadata)
          } catch {
            // metadata fetch failure is non-fatal
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [address, stellarService])

  const handleSetMetadata = async (_addr: string, uri: string) => {
    // placeholder — real impl would sign + submit a contract call
    addToast(`Metadata URI set: ${uri}`, 'success')
    if (token) setToken({ ...token, metadataUri: uri })
    setActivePanel(null)
  }

  const togglePanel = (panel: ActivePanel) =>
    setActivePanel((prev: ActivePanel) => (prev === panel ? null : panel))

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20" aria-live="polite">
        <Spinner size="lg" label="Loading token details…" />
      </div>
    )
  }

  if (notFound || !token) {
    return (
      <div className="text-center py-20 space-y-4" role="alert">
        <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Token not found</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm break-all">
          No token found at address: <span className="font-mono">{address}</span>
        </p>
        <Link to="/tokens">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const imageUrl = metadata?.image ? ipfsToGatewayUrl(metadata.image) : null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {token.name}
          <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
            ({token.symbol})
          </span>
        </h2>
        <Link to="/tokens">
          <Button variant="outline" size="sm">← Back</Button>
        </Link>
      </div>

      {/* Token info card */}
      <Card>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Address</dt>
            <dd className="font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              <a
                href={stellarExplorerUrl('contract', address!, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline"
              >
                {address}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Total Supply</dt>
            <dd className="text-gray-900 dark:text-gray-100 mt-1">{token.totalSupply}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Decimals</dt>
            <dd className="text-gray-900 dark:text-gray-100 mt-1">{token.decimals}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Creator</dt>
            <dd className="font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              {token.creator ? (
                <a
                  href={stellarExplorerUrl('account', token.creator, network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:underline"
                >
                  {token.creator}
                </a>
              ) : '—'}
            </dd>
          </div>
          {token.createdAt && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-900 dark:text-gray-100 mt-1">{formatTimestamp(token.createdAt)}</dd>
            </div>
          )}
          {token.metadataUri && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500 dark:text-gray-400">Metadata URI</dt>
              <dd className="font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
                {token.metadataUri}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {/* IPFS metadata card */}
      {metadata && (
        <Card title="Metadata">
          <div className="flex gap-4 items-start">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={`${token.name} token art`}
                className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="space-y-1 text-sm">
              {metadata.name && (
                <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.name}</p>
              )}
              {metadata.description && (
                <p className="text-gray-600 dark:text-gray-400">{metadata.description}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => togglePanel('mint')} variant="primary">
          {activePanel === 'mint' ? 'Cancel Mint' : 'Mint More'}
        </Button>
        <Button onClick={() => togglePanel('burn')} variant="secondary">
          {activePanel === 'burn' ? 'Cancel Burn' : 'Burn Tokens'}
        </Button>
        {!token.metadataUri && (
          <Button onClick={() => togglePanel('metadata')} variant="outline">
            {activePanel === 'metadata' ? 'Cancel' : 'Set Metadata'}
          </Button>
        )}
      </div>

      {/* Inline action panels */}
      {activePanel === 'mint' && address && (
        <Card title="Mint More Tokens">
          <MintForm tokenAddress={address} onSuccess={() => setActivePanel(null)} />
        </Card>
      )}
      {activePanel === 'burn' && address && (
        <Card title="Burn Tokens">
          <BurnForm tokenAddress={address} onSuccess={() => setActivePanel(null)} />
        </Card>
      )}
      {activePanel === 'metadata' && address && (
        <Card title="Set Metadata">
          <SetMetadataForm tokenAddress={address} onSubmit={handleSetMetadata} />
        </Card>
      )}
    </div>
  )
}
