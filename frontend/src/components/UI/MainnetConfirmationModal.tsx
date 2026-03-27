import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TokenDeployParams } from '../../types'
import { Button } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'

interface MainnetConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  tokenParams: TokenDeployParams
}

export const MainnetConfirmationModal: React.FC<MainnetConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tokenParams,
}) => {
  const { t } = useTranslation()
  const [confirmSymbol, setConfirmSymbol] = useState('')
  const isConfirmed = confirmSymbol === tokenParams.symbol

  const handleConfirm = () => {
    if (isConfirmed) onConfirm()
  }

  const footer = (
    <>
      <Button onClick={onClose} variant="secondary">Cancel</Button>
      <Button onClick={handleConfirm} disabled={!isConfirmed}>Deploy to Mainnet</Button>
    </>
  )
  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mainnet Deployment Review"
      titleId="mainnet-modal-title"
      footer={footer}
      className="max-w-2xl"
    >
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 font-semibold">⚠️ This action cannot be undone and will cost real XLM</p>
      </div>

      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Token Parameters</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {(
            [
              ['Name', tokenParams.name],
              ['Symbol', tokenParams.symbol],
              ['Decimals', String(tokenParams.decimals)],
              ['Initial Supply', String(tokenParams.initialSupply)],
              ...(tokenParams.metadata?.description ? [['Description', tokenParams.metadata.description]] : []),
              ...(tokenParams.metadata?.image ? [['Image', tokenParams.metadata.image.name]] : []),
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-600">{label}:</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 id="mainnet-modal-title" className="text-2xl font-bold text-gray-900 mb-4">
            {t('mainnetModal.title')}
          </h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">{t('mainnetModal.warning')}</p>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('mainnetModal.tokenParams')}</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mainnetModal.name')}</span>
                <span className="font-medium text-gray-900">{tokenParams.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mainnetModal.symbol')}</span>
                <span className="font-medium text-gray-900">{tokenParams.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mainnetModal.decimals')}</span>
                <span className="font-medium text-gray-900">{tokenParams.decimals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mainnetModal.initialSupply')}</span>
                <span className="font-medium text-gray-900">{tokenParams.initialSupply}</span>
              </div>
              {tokenParams.metadata?.description && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('mainnetModal.description')}</span>
                  <span className="font-medium text-gray-900">{tokenParams.metadata.description}</span>
                </div>
              )}
              {tokenParams.metadata?.image && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('mainnetModal.image')}</span>
                  <span className="font-medium text-gray-900">{tokenParams.metadata.image.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <Input
              label={t('mainnetModal.confirmLabel', { symbol: tokenParams.symbol })}
              value={confirmSymbol}
              onChange={(e) => setConfirmSymbol(e.target.value)}
              placeholder={tokenParams.symbol}
              aria-describedby="confirm-help"
            />
            <p id="confirm-help" className="text-sm text-gray-500 mt-1">
              {t('mainnetModal.confirmHelp')}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button onClick={onClose} variant="secondary">{t('mainnetModal.cancel')}</Button>
            <Button onClick={() => isConfirmed && onConfirm()} disabled={!isConfirmed}>
              {t('mainnetModal.deploy')}
            </Button>
          </div>
        </div>
      </div>

      <Input
        label={`Type "${tokenParams.symbol}" to confirm deployment`}
        value={confirmSymbol}
        onChange={(e) => setConfirmSymbol(e.target.value)}
        placeholder={tokenParams.symbol}
        aria-describedby="confirm-help"
      />
      <p id="confirm-help" className="text-sm text-gray-500 mt-1">
        This confirmation ensures you have reviewed all parameters carefully.
      </p>
    </Modal>
  )
}
