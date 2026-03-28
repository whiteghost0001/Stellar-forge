import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { stellarService } from '../services/stellar'
import { ShareButton } from './ShareButton'
import type { TokenInfo } from '../types'

const BASE_URL = 'https://stellarforge.app'

function setMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
import { useStellarContext } from '../context/StellarContext'
import { useParams, Link } from 'react-router-dom'
import { ipfsService } from '../services/ipfs'
import { useNetwork } from '../context/NetworkContext'
import { stellarExplorerUrl, ipfsToGatewayUrl, formatAddress } from '../utils/formatting'
import { isValidContractAddress } from '../utils/validation'
import type { TokenInfo, IPFSMetadata } from '../types'
import { CopyButton } from './CopyButton'
import { Card } from './UI/Card'
import { Button } from './UI/Button'
import { Spinner } from './UI/Spinner'
import { QRCodeModal } from './UI/QRCodeModal'
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
  const [token, setToken] = useState<TokenInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()
  const { network } = useNetwork()

  const [token, setToken] = useState<TokenInfo | null>(null)
  const [metadata, setMetadata] = useState<IPFSMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [showQR, setShowQR] = useState(false)

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
      .then((t) => setToken(t as TokenInfo))
      .catch((err: Error) => setError(err.message || 'Unable to load token'))
  }, [address])
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
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const imageUrl = metadata?.image ? ipfsToGatewayUrl(metadata.image) : null

  // Inject Open Graph meta tags for rich link previews
  useEffect(() => {
    if (!token || !address) return

    const title = `${token.name} (${token.symbol}) — StellarForge`
    const description = `${token.name} is a Stellar token with symbol ${token.symbol}, ${token.decimals} decimals, and a total supply of ${token.totalSupply}. Created by ${token.creator}.`
    const url = `${BASE_URL}/token/${address}`

    document.title = title
    setMeta('og:type', 'website')
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:url', url)
    setMeta('og:site_name', 'StellarForge')
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setMeta('twitter:site', '@StellarForge')

    return () => {
      document.title = 'StellarForge - Stellar Token Deployer'
    }
  }, [token, address])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Token Detail</h2>
        {address && (
          <ShareButton
            tokenAddress={address}
            tokenName={token?.name}
            tokenSymbol={token?.symbol}
          />
        )}
      </div>

      <div className="p-4 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700">
        {error && <p className="text-red-500">{error}</p>}
        {!token && !error && <p className="text-gray-500">Loading token {address}...</p>}
        {token && (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{token.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Symbol</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{token.symbol}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Decimals</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{token.decimals}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Total Supply</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{token.totalSupply}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Creator</dt>
              <dd className="font-mono text-xs text-gray-900 dark:text-white break-all">{token.creator}</dd>
            </div>
          </dl>
        )}
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {token.name}
          <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
            ({token.symbol})
          </span>
        </h2>
        <Link to="/tokens">
          <Button variant="outline" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      {/* Token info card */}
      <Card>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Address</dt>
            <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              <a
                href={stellarExplorerUrl('contract', address!, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline"
                title={address}
              >
                {formatAddress(address!)}
              </a>
              <CopyButton value={address!} ariaLabel="Copy token address" />
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
            <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              {token.creator ? (
                <a
                  href={stellarExplorerUrl('account', token.creator, network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:underline"
                  title={token.creator}
                >
                  {formatAddress(token.creator)}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          {token.createdAt && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-900 dark:text-gray-100 mt-1">
                {formatTimestamp(token.createdAt)}
              </dd>
            </div>
          )}
          {token.metadataUri && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500 dark:text-gray-400">Metadata URI</dt>
              <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
                <span className="truncate" title={token.metadataUri}>{token.metadataUri}</span>
                <CopyButton value={token.metadataUri} ariaLabel="Copy metadata URI" />
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
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
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
        <Button onClick={() => setShowQR(true)} variant="outline">
          Show QR
        </Button>
      </div>

      <QRCodeModal isOpen={showQR} address={address!} onClose={() => setShowQR(false)} />

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
