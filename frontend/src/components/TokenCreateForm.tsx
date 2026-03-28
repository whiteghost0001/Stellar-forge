import { useState } from 'react'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { MainnetConfirmationModal } from './UI/MainnetConfirmationModal'
import { ShareButton } from './ShareButton'
import { useMainnetConfirmation } from '../hooks/useMainnetConfirmation'
import { useToast } from '../context/ToastContext'
import { stellarService } from '../services/stellar'
import { TokenDeployParams, DeploymentResult } from '../types'
import { validateTokenSymbol, validateTokenName, validateDecimals } from '../utils/validation'
import { useTranslation } from 'react-i18next'
import { Input, Button, MainnetConfirmationModal, ConfirmModal } from './UI'
import { useMainnetConfirmation } from '../hooks/useMainnetConfirmation'
import { useToast } from '../context/ToastContext'
import { useTos } from '../context/TosContext'
import { useWalletContext } from '../context/WalletContext'
import { useStellarContext } from '../context/StellarContext'
import { TokenDeployParams } from '../types'
import { STELLAR_CONFIG } from '../config/stellar'
import {
  validateTokenSymbol,
  validateTokenName,
  validateDecimals,
  sanitizeTokenInput,
} from '../utils/validation'

const ESTIMATED_FEE = '0.01' // XLM

export const TokenCreateForm: React.FC = () => {
  const { stellarService } = useStellarContext()
  const { refreshBalance } = useWalletContext()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('7')
  const [initialSupply, setInitialSupply] = useState('')
  const [description, setDescription] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedToken, setDeployedToken] = useState<{ address: string; name: string; symbol: string } | null>(null)
  const [pendingParams, setPendingParams] = useState<TokenDeployParams | null>(null)

  const { showModal, tokenParams, requestDeployment, closeModal, confirmDeployment } =
    useMainnetConfirmation()
  const { addToast } = useToast()
  const { requireTos } = useTos()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Sanitize inputs by trimming whitespace
    const sanitizedName = sanitizeTokenInput(name)
    const sanitizedSymbol = sanitizeTokenInput(symbol)
    const sanitizedDescription = sanitizeTokenInput(description)

    if (!validateTokenName(sanitizedName)) {
      addToast('Invalid token name: must be 1-32 characters', 'error')
      return
    }
    if (!validateTokenSymbol(sanitizedSymbol)) {
      addToast('Invalid token symbol: must be 1-12 alphanumeric characters or hyphens', 'error')
      return
    }
    if (!validateDecimals(parseInt(decimals))) {
      addToast('Decimals must be between 0 and 18', 'error')
      return
    }

    const params: TokenDeployParams = {
      name: sanitizedName,
      symbol: sanitizedSymbol,
      decimals: parseInt(decimals),
      initialSupply,
      salt:
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      tokenWasmHash: STELLAR_CONFIG.factoryContractId, // Placeholder or actual hash
      feePayment: '100000', // Default fee
      ...(sanitizedDescription && {
        metadata: { description: sanitizedDescription, image: new File([], '') },
      }),
    }

    setPendingParams(params)
  }

  const handleConfirm = () => {
    if (!pendingParams) return
    const params = pendingParams
    setPendingParams(null)
    requireTos(() => requestDeployment(params, () => deployToken(params)))
  }

  const deployToken = async (params: TokenDeployParams) => {
    setIsDeploying(true)
    try {
      const result = (await stellarService.deployToken(params)) as { success: boolean }
      if (result.success) {
        addToast('Token deployed successfully!', 'success')
        setName('')
        setSymbol('')
        setDecimals('7')
        setInitialSupply('')
        setDescription('')
        // Refresh balance after successful transaction
        await refreshBalance()
      } else {
        addToast(t('tokenForm.deployFailed'), 'error')
      }
    } catch (error: unknown) {
      console.error('Deployment error:', error)
      addToast(t('tokenForm.deployError'), 'error')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      {deployedToken && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800 dark:text-green-300">
                {deployedToken.name} (${deployedToken.symbol}) deployed successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1 font-mono break-all">
                {deployedToken.address}
              </p>
              <div className="mt-3">
                <ShareButton
                  tokenAddress={deployedToken.address}
                  tokenName={deployedToken.name}
                  tokenSymbol={deployedToken.symbol}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Token Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Token"
          required
        />
        <Input
          label="Token Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="MTK"
          required
        />
        <Input
          label="Decimals"
          type="number"
          value={decimals}
          onChange={(e) => setDecimals(e.target.value)}
          placeholder="7"
          min="0"
          max="18"
          required
        />
        <Input
          label="Initial Supply"
          value={initialSupply}
          onChange={(e) => setInitialSupply(e.target.value)}
          placeholder="1000000"
          required
        />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('tokenForm.descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tokenForm.descriptionPlaceholder')}
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
            rows={3}
          />
        </div>
        <Button type="submit" disabled={isDeploying} className="w-full sm:w-auto">
          {isDeploying ? t('tokenForm.deploying') : t('tokenForm.deploy')}
        </Button>
      </form>

      <ConfirmModal
        isOpen={!!pendingParams}
        title="Confirm Token Creation"
        description="Review the details before deploying your token on-chain."
        details={[
          { label: 'Name', value: pendingParams?.name ?? '' },
          { label: 'Symbol', value: pendingParams?.symbol ?? '' },
          { label: 'Decimals', value: pendingParams?.decimals ?? '' },
          { label: 'Initial Supply', value: pendingParams?.initialSupply ?? '' },
          { label: 'Estimated Fee', value: `${ESTIMATED_FEE} XLM` },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPendingParams(null)}
        confirmLabel="Deploy Token"
      />

      {tokenParams && (
        <MainnetConfirmationModal
          isOpen={showModal}
          onClose={closeModal}
          onConfirm={confirmDeployment}
          tokenParams={tokenParams}
        />
      )}
    </>
  )
}
