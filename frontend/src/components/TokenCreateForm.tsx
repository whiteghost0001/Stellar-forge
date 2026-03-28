import { useState } from 'react'
import { Input, Button, MainnetConfirmationModal, ConfirmModal, ProgressIndicator } from './UI'
import type { ProgressStep } from './UI'
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
import { ShareButton } from './ShareButton'
import { useTranslation } from 'react-i18next'

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
  const [deploymentSteps, setDeploymentSteps] = useState<ProgressStep[]>([
    { label: 'Deploy contract', status: 'pending' },
    { label: 'Upload metadata to IPFS', status: 'pending' },
    { label: 'Set metadata on-chain', status: 'pending' },
  ])

  const { showModal, tokenParams, requestDeployment, closeModal, confirmDeployment } =
    useMainnetConfirmation()
  const { addToast } = useToast()
  const { requireTos } = useTos()
  const { t } = useTranslation()

  const updateStep = (index: number, status: ProgressStep['status']) => {
    setDeploymentSteps((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Sanitize inputs by trimming whitespace
    const sanitizedName = sanitizeTokenInput(name)
    const sanitizedSymbol = sanitizeTokenInput(symbol)
    const sanitizedDescription = sanitizeTokenInput(description)

    if (!validateTokenName(sanitizedName)) {
      addToast('Invalid token name: must be 1-32 characters using only letters, digits, spaces, hyphens, and underscores', 'error')
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
    setDeploymentSteps([
      { label: 'Deploy contract', status: 'in-progress' },
      { label: 'Upload metadata to IPFS', status: 'pending' },
      { label: 'Set metadata on-chain', status: 'pending' },
    ])

    try {
      const result = (await stellarService.deployToken(params)) as { success: boolean }
      if (result.success) {
        updateStep(0, 'completed')
        updateStep(1, 'completed')
        updateStep(2, 'completed')
        addToast('Token deployed successfully!', 'success')
        setName('')
        setSymbol('')
        setDecimals('7')
        setInitialSupply('')
        setDescription('')
        // Refresh balance after successful transaction
        await refreshBalance()
      } else {
        updateStep(0, 'error')
        addToast(t('tokenForm.deployFailed'), 'error')
      }
    } catch (error: unknown) {
      console.error('Deployment error:', error)
      updateStep(0, 'error')
      addToast(t('tokenForm.deployError'), 'error')
    } finally {
      setIsDeploying(false)
    }
  }
        setInitialSupply('')
        setDescription('')
        // Refresh balance after successful transaction
        await refreshBalance()
      } else {
        addToast(t('tokenForm.deployFailed'), 'error')
      }
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : t('tokenForm.deployError'), 'error')
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

      {isDeploying && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-5 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">Deployment Progress</h3>
          <ProgressIndicator steps={deploymentSteps} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Token Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Token"
          required
          disabled={isDeploying}
        />
        <Input
          label="Token Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="MTK"
          required
          disabled={isDeploying}
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
          disabled={isDeploying}
        />
        <Input
          label="Initial Supply"
          value={initialSupply}
          onChange={(e) => setInitialSupply(e.target.value)}
          placeholder="1000000"
          required
          disabled={isDeploying}
        />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('tokenForm.descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tokenForm.descriptionPlaceholder')}
            disabled={isDeploying}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
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
