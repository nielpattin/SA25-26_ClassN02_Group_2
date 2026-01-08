import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme.id === 'notion-light' ? 'dark' : 'light'} mode`}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--button-border-radius)',
        color: 'var(--text-muted)',
        transition: 'all 0.2s ease',
      }}
    >
      {theme.id === 'notion-light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
