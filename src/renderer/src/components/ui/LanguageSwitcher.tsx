import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('naseej-language', newLang)
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                 text-muted-foreground hover:text-foreground hover:bg-muted
                 transition-all duration-150 cursor-pointer"
      aria-label={i18n.language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
      title={i18n.language === 'en' ? 'العربية' : 'English'}
    >
      <Languages size={14} />
      <span>{i18n.language === 'en' ? 'AR' : 'EN'}</span>
    </button>
  )
}
