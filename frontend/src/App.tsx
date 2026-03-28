import React from 'react'
import { ToastContainer, Button, Spinner } from './components/UI';
import { OnboardingModal } from './components/UI/OnboardingModal';
import './App.css'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { NetworkProvider } from './context/NetworkContext'
import { StellarProvider } from './context/StellarContext'
import { NetworkSwitcher } from './components/NetworkSwitcher'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { FundbotButton } from './components/FundbotButton'
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
import ErrorBoundary from './components/ErrorBoundary'
import { TosProvider } from './context/TosContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { wallet } = useWallet()
  if (!wallet.isConnected) return <Navigate to="/" replace />
  return children
}

function AppContent() {
  const { wallet, connect, disconnect, isConnecting, error, isInstalled } = useWallet()
  const { addToast } = useToast()
  const { t } = useTranslation()
  const [showFriendbotBanner, setShowBanner] = React.useState(
    () => !!(wallet.isConnected && wallet.balance && parseFloat(wallet.balance) < 1)
  )

  const handleGetStarted = () => addToast(t('home.welcomeToast'), 'info')

  const handleConnect = async () => {
    try {
      await connect()
      if (!error) addToast(t('wallet.connected'), 'success')
    } catch {
      addToast(t('wallet.connectFailed'), 'error')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    addToast(t('wallet.disconnected'), 'info')
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        {t('app.skipToMain')}
      </a>

      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow" role="banner">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('app.title')}</h1>
                <p className="mt-2 text-sm text-gray-600">{t('app.subtitle')}</p>
              </div>

              <div className="flex items-center gap-4">
                <LanguageSwitcher />
                <NetworkSwitcher />

                {!isInstalled && (
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {t('wallet.installFreighter')}
                  </a>
                )}

                {wallet.isConnected ? (
                  <div className="flex items-center gap-3">
                    <FundbotButton />
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {wallet.address && truncateAddress(wallet.address)}
                      </div>
                      <Button onClick={handleDisconnect} variant="secondary" size="sm">
                        {t('wallet.disconnect')}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleConnect} disabled={isConnecting} size="sm">
                      {isConnecting ? (
                        <span className="flex items-center gap-2">
                          <Spinner size="sm" />
                          <span className="hidden sm:inline">{t('wallet.connecting')}</span>
                        </span>
                      ) : (
                        t('wallet.connect')
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Wallet address on mobile when connected */}
              {wallet.isConnected && wallet.address && (
                <div className="sm:hidden text-xs text-gray-600 truncate">
                  {truncateAddress(wallet.address)}
                  {wallet.balance && <span className="ml-2">{formatXLM(wallet.balance)}</span>}
                </div>
              )}

              {/* Install Freighter link on mobile */}
              {!isInstalled && (
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:hidden text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {t('wallet.installFreighter')}
                </a>
              )}
            </div>

            <NavBar onHelpClick={() => setShowOnboarding(true)} />
          </div>
        </header>

        {!isFactoryConfigured() && (
          <div className="bg-yellow-50 border-b border-yellow-300 p-4" role="alert">
            <div className="max-w-7xl mx-auto text-yellow-800 text-sm font-medium">
              ⚠️ Factory contract not configured. Please set <code className="font-mono bg-yellow-100 px-1 rounded">VITE_FACTORY_CONTRACT_ID</code> in your <code className="font-mono bg-yellow-100 px-1 rounded">.env</code> file.
            </div>
          </div>
        )}

        <main id="main-content" className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="py-2 sm:py-4">
            {error && (
              <div
                className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
                role="alert"
              >
                <p className="font-medium">{t('errors.title')}</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
              <Routes>
                <Route path="/" element={<ErrorBoundary><Home onGetStarted={handleGetStarted} /></ErrorBoundary>} />
                <Route path="/create" element={<ProtectedRoute><ErrorBoundary><CreateToken /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/mint" element={<ProtectedRoute><ErrorBoundary><MintForm /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/burn" element={<ProtectedRoute><ErrorBoundary><BurnForm /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/tokens" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/tokens/:address" element={<ProtectedRoute><ErrorBoundary><TokenDetail /></ErrorBoundary></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Dashboard />
          </div>
        </main>

        <ToastContainer />
      </div>
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NetworkProvider>
          <StellarProvider>
            <WalletProvider>
              <ToastProvider>
                <TosProvider>
                  <AppContent />
                </TosProvider>
              </ToastProvider>
            </WalletProvider>
          </StellarProvider>
        </NetworkProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
