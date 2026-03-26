import { useTranslation } from 'react-i18next'

export const CreateToken: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t('createToken.title')}</h2>
      <p className="text-gray-600">{t('createToken.description')}</p>
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-500">
        {t('createToken.placeholder')}
      </div>
    </div>
  )
}
