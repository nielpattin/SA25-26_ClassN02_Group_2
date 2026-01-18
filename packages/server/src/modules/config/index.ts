export function getOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'longOffset' })
    const offsetPart = formatter.formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || ''
    const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (match) {
      const sign = match[1]
      const hours = match[2].padStart(2, '0')
      const minutes = match[3] || '00'
      return `${sign}${hours}:${minutes}`
    }
    return '+00:00'
  } catch {
    return '+00:00'
  }
}

type Timezone = { id: string; offset: string; label: string }
type Language = { id: string; name: string }

export const languages: Language[] = [
  { id: 'en', name: 'English' },
  { id: 'vi', name: 'Vietnamese' }
]

export const timezones: Timezone[] = (Intl as any).supportedValuesOf('timeZone').map((tz: string) => ({
  id: tz,
  offset: getOffset(tz),
  label: tz.replace(/_/g, ' ')
}))

export const isValidTimezone = (tz: string) => timezones.some(t => t.id === tz)

export const isValidLanguage = (lang: string) => languages.some(l => l.id === lang)
