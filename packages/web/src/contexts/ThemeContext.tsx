import React, { useEffect, useState } from 'react'
import { appStyles } from '../styles/appStyles'
import type { AppStyleId } from '../styles/appStyles'
import { injectTheme } from '../styles/injectTheme'
import { ThemeContext } from './ThemeContextCore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lock to the universal theme
  const [themeId] = useState<AppStyleId>('universal')

  useEffect(() => {
    injectTheme(themeId)
  }, [themeId])

  const theme = appStyles[0]

  const toggleTheme = () => {
    // No-op for universal theme
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: () => {}, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
