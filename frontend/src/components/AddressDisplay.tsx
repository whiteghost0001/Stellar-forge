import { truncateAddress, stellarExplorerUrl } from '../utils/formatting'
import { useClipboard } from '../hooks/useClipboard'

interface AddressDisplayProps {
  address: string
  type: 'account' | 'contract'
  showCopy?: boolean
  showExplorer?: boolean
}

export const AddressDisplay = ({
  address,
  type,
  showCopy = true,
  showExplorer = true,
}: AddressDisplayProps) => {
  const { copied, copy } = useClipboard()

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span title={address}>{truncateAddress(address)}</span>

      {showCopy && (
        <button
          onClick={() => copy(address)}
          aria-label={copied ? 'Copied' : 'Copy address'}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {copied ? (
            // Checkmark icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            // Copy icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          )}
        </button>
      )}

      {showExplorer && (
        <a
          href={stellarExplorerUrl(address, type)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on Stellar Explorer"
          className="text-gray-400 hover:text-blue-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      )}
    </span>
  )
}
