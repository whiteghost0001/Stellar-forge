import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { stellarService } from '../services/stellar'

export const TokenDetail: React.FC = () => {
  const { t } = useTranslation()
  const { address } = useParams<{ address: string }>()
  const [token, setToken] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    stellarService
      .getTokenInfo(address)
      .then((tok) => setToken(tok))
      .catch((err) => setError(err.message || t('tokenDetail.loadError')))
  }, [address, t])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t('tokenDetail.title')}</h2>
      <div className="p-4 rounded-lg border border-gray-300 bg-white">
        {error && <p className="text-red-500">{error}</p>}
        {!token && !error && <p className="text-gray-500">{t('tokenDetail.loading', { address })}</p>}
        {token && <pre className="text-xs overflow-auto">{JSON.stringify(token, null, 2)}</pre>}
      </div>
    </div>
  )
}
