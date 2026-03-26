// Formatting utilities

import { IPFS_CONFIG } from '../config/ipfs'

export const formatXLM = (amount: string | number): string => {
  return `${parseFloat(amount.toString()).toFixed(7)} XLM`
}

export const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

export const stroopsToXLM = (stroops: number | string): number => {
  return parseFloat(stroops.toString()) / 10000000
}

export const xlmToStroops = (xlm: number | string): number => {
  return Math.floor(parseFloat(xlm.toString()) * 10000000)
}

export const ipfsToGatewayUrl = (uri: string): string => {
  if (!uri.startsWith('ipfs://')) return uri

  const path = uri.slice('ipfs://'.length).replace(/^\/+/, '')
  const gatewayBase = IPFS_CONFIG.pinataGateway.replace(/\/+$/, '')
  return `${gatewayBase}/${path}`
}

// Format as 'Mar 19, 2026, 3:28 PM UTC'
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC', timeZoneName: 'short',
})

export const formatTimestamp = (timestamp: number): string =>
  DATE_FORMAT.format(new Date(timestamp * 1000))

type ExplorerLinkType = 'tx' | 'contract' | 'account'
type Network = 'testnet' | 'mainnet'

const EXPLORER_BASES: Record<Network, string> = {
  mainnet: 'https://stellar.expert/explorer/public',
  testnet: 'https://stellar.expert/explorer/testnet',
}

export const stellarExplorerUrl = (
  type: ExplorerLinkType,
  value: string,
  network: Network = 'testnet',
): string => {
  const base = EXPLORER_BASES[network]
  const path = type === 'tx' ? 'tx' : type === 'contract' ? 'contract' : 'account'
  return `${base}/${path}/${value}`
}

export const timeAgo = (timestamp: number): string => {
  const seconds = Math.floor(Date.now() / 1000) - timestamp
  if (seconds < 0) return 'just now'
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}