import { createContext } from 'react'
import type { AppStyle, AppStyleId } from '../styles/appStyles'

export interface ThemeContextType {
  theme: AppStyle
  setTheme: (id: AppStyleId) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
