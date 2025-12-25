// Dark — The chosen style
// Technical monospace, high contrast, developer-focused

export const appStyles = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Technical: JetBrains Mono body, Kalam brand, developer-focused',
    fonts: { 
      brand: '"Kalam", cursive',
      heading: '"JetBrains Mono", monospace', 
      body: '"JetBrains Mono", monospace',
    },
    colors: { 
      bg: '#1e1e22',
      surface: 'rgba(50, 50, 58, 0.5)',
      surfaceElevated: 'rgba(65, 65, 75, 0.5)',
      
      primary: '#ef4444',
      primaryHover: '#dc2626',
      accent: '#ef4444', // Used in landing page
      secondary: '#52525b', // Used for secondary button borders
      
      border: 'rgba(80, 80, 90, 0.5)',
      borderElevated: 'rgba(74, 74, 82, 0.6)',
      
      text: '#ffffff',
      textMuted: '#c0c0c6',
      textSubtle: '#a1a1aa',
      textDanger: '#ef4444',
      
      dangerBg: 'rgba(248, 113, 113, 0.15)',
      dangerBorder: 'rgba(248, 113, 113, 0.3)',
    },
    effects: {
      glow: 'radial-gradient(ellipse at center top, rgba(248, 113, 113, 0.15) 0%, transparent 25%)',
      glass: 'blur(12px)',
    },
    card: { 
      borderRadius: '4px', 
      shadow: 'none', 
      border: '1px solid #27272a',
      padding: '12px 14px',
      gap: '6px',
      titleSize: '13px',
      metaSize: '10px', 
    },
    featureCard: {
      bg: '#1e1e22',
      border: '1px solid #3f3f46',
      borderRadius: '4px',
      padding: '14px',
    },
    column: { 
      borderRadius: '6px',
      padding: '14px', 
      headerBg: '#18181b', 
      headerBorder: '1px solid #27272a',
      headerPadding: '10px 14px',
      headerSize: '11px',
      gap: '6px',
    },
    button: { 
      borderRadius: '2px',
      padding: '10px 20px',
      fontSize: '14px',
    },
    badge: {
      bg: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '2px',
      padding: '6px 12px',
      fontSize: '11px',
    },
    page: {
      titleSize: '24px',
      titleWeight: 600,
      titleSpacing: '0.05em',
      padding: '48px',
      headerMargin: '48px',
    },
    grid: {
      gap: '14px',
      minCardWidth: '280px',
    },
    board: {
      columnWidth: '300px',
      gap: '14px',
    },
    input: {
      bg: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '2px',
      padding: '10px 14px',
      fontSize: '13px',
    },
    layout: 'dark',
    density: 'balanced',
  },
] as const

export type AppStyle = typeof appStyles[number]
export type AppStyleId = AppStyle['id']
