import { useTranslation } from 'react-i18next'

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  // Add new languages here, e.g.: { code: 'es', label: 'Español' }
]

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-gray-600">
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={i18n.language}
        onChange={handleChange}
        aria-label={t('language.label')}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </label>
  )
}
