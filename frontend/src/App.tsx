import { useState } from 'react'
import './App.css'
import { WalletProvider } from './context/WalletContext'
import { useWallet } from './hooks/useWallet'
import { Button } from './components/UI/Button'
import { Spinner } from './components/UI/Spinner'
import { truncateAddress, formatXLM } from './utils/formatting'
import { Dashboard } from './components/Dashboard'
import type { TokenInfo } from './types'

function AppContent() {
  const [toast, setToast] = useState<string | null>(null)
  const [tokens] = useState<TokenInfo[]>([])
  const { wallet, connect, disconnect, isConnecting, error, isInstalled } = useWallet()

  const handleGetStarted = () => {
    setToast("Welcome! Let's deploy your token.")
    setTimeout(() => setToast(null), 4000)
  }

  const handleConnect = async () => {
    await connect()
  }

  const handleDisconnect = () => {
    disconnect()
    setToast('Wallet disconnected')
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow" role="banner">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">StellarForge</h1>
                <p className="mt-2 text-sm text-gray-600">Stellar Token Deployer</p>
              </div>

              <div className="flex items-center gap-4">
                {!isInstalled && (
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Install Freighter
                  </a>
                )}

                {wallet.isConnected ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {wallet.address && truncateAddress(wallet.address)}
                      </div>
                      {wallet.balance && (
                        <div className="text-xs text-gray-600">{formatXLM(wallet.balance)}</div>
                      )}
                    </div>
                    <Button onClick={handleDisconnect} variant="secondary" size="sm">
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleConnect} disabled={isConnecting} size="sm">
                    {isConnecting ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" />
                        Connecting...
                      </span>
                    ) : (
                      'Connect Wallet'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {error && (
              <div
                className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
                role="alert"
              >
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 mb-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Welcome to Nova Launch
                </h2>
                <p className="text-gray-600 mb-8">
                  Deploy your custom tokens on Stellar blockchain
                </p>
                <button
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Get Started
                </button>
              </div>
            </div>

            <Dashboard tokens={tokens} />
          </div>
        </main>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-4 right-4 z-50"
        >
          {toast && (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
              {toast}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}

export default App
