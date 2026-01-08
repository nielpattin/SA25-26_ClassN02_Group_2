import React, { useEffect, useState } from 'react'
import { appStyles } from '../styles/appStyles'
import type { AppStyleId } from '../styles/appStyles'
import { injectTheme } from '../styles/injectTheme'
import { ThemeContext } from './ThemeContextCore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<AppStyleId>(() => {
    const saved = localStorage.getItem('kyte-theme')
    if (saved && appStyles.some(s => s.id === saved)) {
      return saved as AppStyleId
    }
    
    // Default to system preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'notion-dark'
    }
    return 'notion-light'
  })

  useEffect(() => {
    injectTheme(themeId)
    localStorage.setItem('kyte-theme', themeId)
  }, [themeId])

  const theme = appStyles.find(s => s.id === themeId) ?? appStyles[0]

  const toggleTheme = () => {
    setThemeId(prev => prev === 'notion-light' ? 'notion-dark' : 'notion-light')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeId, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
