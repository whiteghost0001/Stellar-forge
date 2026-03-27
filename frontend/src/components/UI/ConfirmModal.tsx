import { useEffect, useRef } from 'react'
import { Button } from './Button'

export interface DetailRow {
  label: string
  value: string | number
}

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: string
  details: DetailRow[]
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  details,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    cancelRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 space-y-4">
          <h2
            id="confirm-modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>

          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
            {details.map(({ label, value }) => (
              <div key={label} className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[60%] break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button ref={cancelRef} variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
