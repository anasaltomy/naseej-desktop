import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../content/en.json'
import ar from '../../content/ar.json'

const savedLanguage = localStorage.getItem('naseej-language') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar }
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
