import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { STELLAR_CONFIG } from '../config/stellar'

export type Network = 'testnet' | 'mainnet'

const STORAGE_KEY = 'stellarforge_network'

function getInitialNetwork(): Network {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'mainnet' || stored === 'testnet') return stored
  } catch { /* ignore */ }
  return (STELLAR_CONFIG.network as Network) ?? 'testnet'
}

interface NetworkContextValue {
  network: Network
  switchNetwork: (n: Network) => void
  rpcUrl: string
  horizonUrl: string
  networkPassphrase: string
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>(getInitialNetwork)

  const switchNetwork = useCallback((n: Network) => {
    setNetwork(n)
    try { localStorage.setItem(STORAGE_KEY, n) } catch { /* ignore */ }
  }, [])

  const cfg = STELLAR_CONFIG[network]

  return (
    <NetworkContext.Provider value={{
      network,
      switchNetwork,
      rpcUrl: cfg.sorobanRpcUrl,
      horizonUrl: cfg.horizonUrl,
      networkPassphrase: cfg.networkPassphrase,
    }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider')
  return ctx
}
