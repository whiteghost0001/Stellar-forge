import { useState } from 'react'
import { TokenDeployParams } from '../../types'
import { Button } from './Button'
import { Input } from './Input'

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

  if (!isOpen) return null

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mainnet-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 id="mainnet-modal-title" className="text-2xl font-bold text-gray-900 mb-4">
            Mainnet Deployment Review
          </h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">
              ⚠️ This action cannot be undone and will cost real XLM
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Token Parameters</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium text-gray-900">{tokenParams.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Symbol:</span>
                <span className="font-medium text-gray-900">{tokenParams.symbol}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Decimals:</span>
                <span className="font-medium text-gray-900">{tokenParams.decimals}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Initial Supply:</span>
                <span className="font-medium text-gray-900">{tokenParams.initialSupply}</span>
              </div>
              
              {tokenParams.metadata?.description && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium text-gray-900">{tokenParams.metadata.description}</span>
                </div>
              )}
              
              {tokenParams.metadata?.image && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Image:</span>
                  <span className="font-medium text-gray-900">{tokenParams.metadata.image.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
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
          </div>

          <div className="flex gap-3 justify-end">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isConfirmed}>
              Deploy to Mainnet
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
