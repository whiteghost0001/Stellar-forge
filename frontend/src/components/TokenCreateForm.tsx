import { useState } from 'react'
import { Input, Button, MainnetConfirmationModal, ConfirmModal } from './UI'
import { useMainnetConfirmation } from '../hooks/useMainnetConfirmation'
import { useToast } from '../context/ToastContext'
import { useStellarContext } from '../context/StellarContext'
import { TokenDeployParams } from '../types'
import { STELLAR_CONFIG } from '../config/stellar'
import { validateTokenSymbol, validateTokenName, validateDecimals } from '../utils/validation'

const ESTIMATED_FEE = '0.01' // XLM

export const TokenCreateForm: React.FC = () => {
  const { stellarService } = useStellarContext()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('7')
  const [initialSupply, setInitialSupply] = useState('')
  const [description, setDescription] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [pendingParams, setPendingParams] = useState<TokenDeployParams | null>(null)

  const { showModal, tokenParams, requestDeployment, closeModal, confirmDeployment } =
    useMainnetConfirmation()
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateTokenName(name)) { addToast('Invalid token name', 'error'); return }
    if (!validateTokenSymbol(symbol)) { addToast('Invalid token symbol', 'error'); return }
    if (!validateDecimals(parseInt(decimals))) { addToast('Decimals must be between 0 and 18', 'error'); return }

    const params: TokenDeployParams = {
      name,
      symbol,
      decimals: parseInt(decimals),
      initialSupply,
      salt: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      tokenWasmHash: STELLAR_CONFIG.factoryContractId, // Placeholder or actual hash
      feePayment: '100000', // Default fee
      ...(description && { metadata: { description, image: new File([], '') } }),
    }

    setPendingParams(params)
  }

  const handleConfirm = () => {
    if (!pendingParams) return
    setPendingParams(null)
    requestDeployment(pendingParams, () => deployToken(pendingParams))
  }

  const deployToken = async (params: TokenDeployParams) => {
    setIsDeploying(true)
    try {
      const result = await stellarService.deployToken(params) as { success: boolean }
      if (result.success) {
        addToast('Token deployed successfully!', 'success')
        setName(''); setSymbol(''); setDecimals('7'); setInitialSupply(''); setDescription('')
      } else {
        addToast(t('tokenForm.deployFailed'), 'error')
      }
    } catch (error) {
      console.error('Deployment error:', error)
      addToast(t('tokenForm.deployError'), 'error')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Token Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Token" required />
        <Input label="Token Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="MTK" required />
        <Input label="Decimals" type="number" value={decimals} onChange={(e) => setDecimals(e.target.value)} placeholder="7" min="0" max="18" required />
        <Input label="Initial Supply" value={initialSupply} onChange={(e) => setInitialSupply(e.target.value)} placeholder="1000000" required />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('tokenForm.descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tokenForm.descriptionPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        <Button type="submit" disabled={isDeploying}>
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
