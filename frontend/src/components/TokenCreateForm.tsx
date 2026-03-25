import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { MainnetConfirmationModal } from './UI/MainnetConfirmationModal'
import { useMainnetConfirmation } from '../hooks/useMainnetConfirmation'
import { useToast } from '../context/ToastContext'
import { stellarService } from '../services/stellar'
import { TokenDeployParams } from '../types'
import { validateTokenSymbol, validateTokenName, validateDecimals } from '../utils/validation'

export const TokenCreateForm: React.FC = () => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('7')
  const [initialSupply, setInitialSupply] = useState('')
  const [description, setDescription] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)

  const { showModal, tokenParams, requestDeployment, closeModal, confirmDeployment } =
    useMainnetConfirmation()
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateTokenName(name)) { addToast(t('tokenForm.invalidName'), 'error'); return }
    if (!validateTokenSymbol(symbol)) { addToast(t('tokenForm.invalidSymbol'), 'error'); return }
    if (!validateDecimals(parseInt(decimals))) { addToast(t('tokenForm.invalidDecimals'), 'error'); return }

    const params: TokenDeployParams = {
      name,
      symbol,
      decimals: parseInt(decimals),
      initialSupply,
      ...(description && { metadata: { description, image: new File([], '') } }),
    }

    requestDeployment(params, () => deployToken(params))
  }

  const deployToken = async (params: TokenDeployParams) => {
    setIsDeploying(true)
    try {
      const result = await stellarService.deployToken(params)
      if (result.success) {
        addToast(t('tokenForm.deploySuccess'), 'success')
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
        <Input label={t('tokenForm.tokenName')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tokenForm.tokenNamePlaceholder')} required />
        <Input label={t('tokenForm.tokenSymbol')} value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder={t('tokenForm.tokenSymbolPlaceholder')} required />
        <Input label={t('tokenForm.decimals')} type="number" value={decimals} onChange={(e) => setDecimals(e.target.value)} placeholder="7" min="0" max="18" required />
        <Input label={t('tokenForm.initialSupply')} value={initialSupply} onChange={(e) => setInitialSupply(e.target.value)} placeholder={t('tokenForm.initialSupplyPlaceholder')} required />

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
