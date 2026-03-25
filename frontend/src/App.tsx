import { ToastContainer, Button, Spinner } from './components/UI';
import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { StellarProvider } from './context/StellarContext'
import { WalletProvider } from './context/WalletContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { NetworkProvider, useNetwork } from './context/NetworkContext'
import { NetworkSwitcher } from './components/NetworkSwitcher'
import { useWallet } from './hooks/useWallet'
import { truncateAddress, formatXLM } from './utils/formatting'
import { NavBar } from './components/NavBar'
import { Home } from './components/Home'
import { CreateToken } from './components/CreateToken'
import { MintForm } from './components/MintForm'
import { BurnForm } from './components/BurnForm'
import { Dashboard } from './components/Dashboard'
import { TokenDetail } from './components/TokenDetail'
import { isFactoryConfigured } from './config/env'

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { wallet } = useWallet()

  if (!wallet.isConnected) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppContent() {
  const { wallet, connect, disconnect, isConnecting, error, isInstalled } = useWallet()
  const { addToast } = useToast()
  const { network } = useNetwork()
  const [showBanner, setShowBanner] = useState(true)

  const isLowBalance = wallet.isConnected && wallet.balance && parseFloat(wallet.balance) < 10
  const showFriendbotBanner = showBanner && network === 'testnet' && isLowBalance

  const handleGetStarted = () => addToast("Welcome! Let's deploy your token.", 'info')

  const handleConnect = async () => {
    try {
      await connect()
      if (!error) addToast('Wallet connected', 'success')
    } catch {
      addToast('Failed to connect wallet', 'error')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    addToast('Wallet disconnected', 'info')
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
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">StellarForge</h1>
                <p className="mt-2 text-sm text-gray-600">Stellar Token Deployer</p>
              </div>

              <div className="flex items-center gap-4">
                <NetworkSwitcher />

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

            <NavBar />
          </div>
        </header>

        {showFriendbotBanner && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="text-blue-800 text-sm">
                Your testnet balance is low. Get free testnet XLM from{' '}
                <a
                  href={`https://friendbot.stellar.org/?addr=${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline"
                >
                  Friendbot
                </a>.
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-blue-600 hover:text-blue-800 focus:outline-none ml-4"
                aria-label="Dismiss banner"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!isFactoryConfigured() && (
          <div className="bg-yellow-50 border-b border-yellow-300 p-4" role="alert">
            <div className="max-w-7xl mx-auto text-yellow-800 text-sm font-medium">
              ⚠️ Factory contract not configured. Please set <code className="font-mono bg-yellow-100 px-1 rounded">VITE_FACTORY_CONTRACT_ID</code> in your <code className="font-mono bg-yellow-100 px-1 rounded">.env</code> file.
            </div>
          </div>
        )}

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

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Routes>
                <Route path="/" element={<Home onGetStarted={handleGetStarted} />} />
                <Route path="/create" element={<ProtectedRoute><CreateToken /></ProtectedRoute>} />
                <Route path="/mint" element={<ProtectedRoute><MintForm /></ProtectedRoute>} />
                <Route path="/burn" element={<ProtectedRoute><BurnForm /></ProtectedRoute>} />
                <Route path="/tokens" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/tokens/:address" element={<ProtectedRoute><TokenDetail /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </main>

        <ToastContainer />
      </div>
    </>
  )
}

function App() {
  return (
    <NetworkProvider>
      <StellarProvider>
        <WalletProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </WalletProvider>
      </StellarProvider>
    </NetworkProvider>
  )
}

export default App
