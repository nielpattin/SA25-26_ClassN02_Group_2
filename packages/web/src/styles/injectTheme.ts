import { appStyles } from './appStyles'

function toKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const varName = prefix ? `${prefix}-${toKebab(key)}` : toKebab(key)
    
    if (typeof value === 'string') {
      result[varName] = value
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, varName))
    }
  }
  
  return result
}

export function injectTheme(styleId = 'dark'): void {
  const style = appStyles.find(s => s.id === styleId) ?? appStyles[0]
  const { id, name, description, layout, density, ...tokens } = style
  
  const cssVars = flattenObject(tokens)
  const root = document.documentElement
  
  for (const [name, value] of Object.entries(cssVars)) {
    root.style.setProperty(`--${name}`, value)
  }
}
