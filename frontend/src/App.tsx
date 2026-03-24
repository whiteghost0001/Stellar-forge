import './App.css'
import { useDarkMode } from './hooks/useDarkMode'

function App() {
  const [dark, setDark] = useDarkMode()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">StellarForge</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Stellar Token Deployer</p>
          </div>
          <button
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dark ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Welcome to Nova Launch</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">Deploy your custom tokens on Stellar blockchain</p>
              <button className="bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">
                Get Started
              </button>
import { WalletProvider } from './context/WalletContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { NetworkProvider } from './context/NetworkContext'
import { ToastContainer } from './components/UI/ToastContainer'
import { NetworkSwitcher } from './components/NetworkSwitcher'
import { useWallet } from './hooks/useWallet'
import { Button } from './components/UI/Button'
import { Spinner } from './components/UI/Spinner'
import { truncateAddress, formatXLM } from './utils/formatting'

function AppContent() {
  const { wallet, connect, disconnect, isConnecting, error, isInstalled } = useWallet()
  const { addToast } = useToast()

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
            <div className="flex justify-between items-center">
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

            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
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
      <WalletProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </WalletProvider>
    </NetworkProvider>
  )
}

export default App
