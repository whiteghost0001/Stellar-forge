import React from 'react'
import { ToastContainer, Button, Spinner } from './components/UI'
import './App.css'
import { useTranslation } from 'react-i18next'
import { useDarkMode } from './hooks/useDarkMode'
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
import { FAQ } from './components/FAQ'
import { isFactoryConfigured } from './config/env'
import ErrorBoundary from './components/ErrorBoundary'
import { TosProvider } from './context/TosContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
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
  const [showOnboarding, setShowOnboarding] = useState(false)

  const { theme, toggleTheme } = useTheme()

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

<div className="min-h-screen bg-gray-100 dark:bg-slate-900">
  <header className="bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-800/95 dark:shadow-slate-900/50 dark:border-b dark:border-slate-700" role="banner">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('app.subtitle')}</p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>
                <LanguageSwitcher />
                <NetworkSwitcher />
                <Button 
                  onClick={() => setDark(!dark)} 
                  variant="secondary" 
                  size="sm" 
                  className="shrink-0 p-2 rounded-full"
                  aria-label="Toggle dark mode"
                >
                  {dark ? '☀️' : '🌙'}
                </Button>

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
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100"
                        title={wallet.address ?? undefined}
                      >
                        {wallet.address && truncateAddress(wallet.address)}
                      </div>
                      <Button onClick={handleDisconnect} variant="secondary" size="sm">
                        {t('wallet.disconnect')}
                      </Button>
                    </div>
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

            {wallet.isConnected && wallet.address && (
              <div className="sm:hidden text-xs text-gray-600 dark:text-gray-400 truncate" title={wallet.address}>
                {truncateAddress(wallet.address)}
                {wallet.balance && <span className="ml-2">{formatXLM(wallet.balance)}</span>}
              </div>
            )}

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

            <NavBar onHelpClick={() => setShowOnboarding(true)} />
          </div>
        </header>
        {showOnboarding && null /* OnboardingModal placeholder */}

        {!isFactoryConfigured() && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700 p-4" role="alert">
            <div className="max-w-7xl mx-auto text-yellow-800 dark:text-yellow-300 text-sm font-medium">
              ⚠️ Factory contract not configured. Please set{' '}
              <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">VITE_FACTORY_CONTRACT_ID</code>{' '}
              in your <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env</code> file.
            </div>
          </div>
        )}

        <main id="main-content" className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="py-2 sm:py-4">
            {error && (
              <div
                className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg"
                role="alert"
              >
                <p className="font-medium">{t('errors.title')}</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary>
                      <Home onGetStarted={handleGetStarted} />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <CreateToken />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mint"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <MintForm />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/burn"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <BurnForm />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tokens"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tokens/:address"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <TokenDetail />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
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
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
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
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
