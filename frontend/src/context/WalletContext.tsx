import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { walletService } from '../services/wallet'

interface WalletState {
  address: string | null
  isConnected: boolean
}

interface WalletContextValue {
  wallet: WalletState
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({ address: null, isConnected: false })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const address = await walletService.connect()
      setWallet({ address, isConnected: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    walletService.disconnect()
    setWallet({ address: null, isConnected: false })
  }

  useEffect(() => {
    if (walletService.isInstalled()) {
      // Check if already connected on mount
    }
  }, [])

  return (
    <WalletContext.Provider value={{ wallet, isConnecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWalletContext must be used within a WalletProvider')
  }
  return ctx
}
