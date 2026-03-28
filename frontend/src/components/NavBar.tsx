import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

interface NavBarProps {
  onHelpClick?: () => void
}

export const NavBar: React.FC<NavBarProps> = ({ onHelpClick }) => {
  const { t } = useTranslation()

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-md text-sm font-medium min-h-[44px] flex items-center dark:text-gray-300 ${
      isActive ? 'bg-blue-600 text-white dark:bg-blue-500' : 'text-gray-700 hover:bg-gray-200 dark:text-white dark:hover:bg-slate-700'
    }`

  return (
<nav aria-label={t('nav.ariaLabel')} className="mt-4 mb-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4">

      <div className="flex flex-wrap gap-2 items-center">
        <NavLink to="/" className={getLinkClass} end>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/create" className={getLinkClass}>
          {t('nav.create')}
        </NavLink>
        <NavLink to="/mint" className={getLinkClass}>
          {t('nav.mint')}
        </NavLink>
        <NavLink to="/burn" className={getLinkClass}>
          {t('nav.burn')}
        </NavLink>
        <NavLink to="/tokens" className={getLinkClass}>
          {t('nav.tokens')}
        </NavLink>
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-700 ml-auto"

            aria-label="Open tutorial"
          >
            ? Help
          </button>
        )}
      </div>
    </nav>
  )
}
