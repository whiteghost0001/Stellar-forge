import { useState } from 'react'
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
