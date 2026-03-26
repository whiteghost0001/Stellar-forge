import { createContext, useContext, useMemo, ReactNode } from 'react'
import { StellarService } from '../services/stellar'
import { IPFSService } from '../services/ipfs'

interface StellarContextValue {
  stellarService: StellarService
  ipfsService: IPFSService
}

const StellarContext = createContext<StellarContextValue | null>(null)

export function StellarProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({
    stellarService: new StellarService(),
    ipfsService: new IPFSService(),
  }), [])

  return <StellarContext.Provider value={value}>{children}</StellarContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStellarContext(): StellarContextValue {
  const ctx = useContext(StellarContext)
  if (!ctx) throw new Error('useStellarContext must be used within a StellarProvider')
  return ctx
}
