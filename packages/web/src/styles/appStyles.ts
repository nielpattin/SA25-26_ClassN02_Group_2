export const appStyles = [
  {
    id: 'notion-light',
    name: 'Notion Light',
    description: 'Clean, minimalist, Notion-inspired light theme',
    fonts: { 
      brand: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
      heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"', 
      body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
    },
    colors: { 
      bg: '#ffffff',
      surface: '#ffffff',
      surfaceElevated: '#f7f6f3',
      
      primary: '#2383e2',
      primaryHover: '#0070df',
      accent: '#2383e2',
      secondary: '#dfdfde',
      
      border: 'rgba(55, 53, 47, 0.16)',
      borderElevated: 'rgba(55, 53, 47, 0.09)',
      
      text: '#37352f',
      textMuted: '#787774',
      textSubtle: '#9b9a97',
      textDanger: '#eb5757',
      
      dangerBg: 'rgba(235, 87, 87, 0.1)',
      dangerBorder: 'rgba(235, 87, 87, 0.2)',
    },
    effects: {
      glow: 'none',
      glass: 'none',
    },
    card: { 
      borderRadius: '3px', 
      shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
      border: '1px solid rgba(55, 53, 47, 0.16)',
      padding: '8px 10px',
      gap: '4px',
      titleSize: '14px',
      metaSize: '12px', 
    },
    featureCard: {
      bg: '#ffffff',
      border: '1px solid rgba(55, 53, 47, 0.16)',
      borderRadius: '3px',
      padding: '16px',
    },
    column: { 
      borderRadius: '4px',
      padding: '8px', 
      headerBg: 'transparent', 
      headerBorder: 'none',
      headerPadding: '6px 8px',
      headerSize: '14px',
      gap: '8px',
    },
    button: { 
      borderRadius: '3px',
      padding: '6px 12px',
      fontSize: '14px',
    },
    badge: {
      bg: 'rgba(55, 53, 47, 0.08)',
      border: 'none',
      borderRadius: '3px',
      padding: '2px 6px',
      fontSize: '12px',
    },
    page: {
      titleSize: '30px',
      titleWeight: 700,
      titleSpacing: '-0.02em',
      padding: '40px 60px',
      headerMargin: '20px',
    },
    grid: {
      gap: '20px',
      minCardWidth: '260px',
    },
    board: {
      columnWidth: '272px',
      gap: '12px',
    },
    input: {
      bg: '#f7f6f3',
      border: '1px solid rgba(55, 53, 47, 0.16)',
      borderRadius: '3px',
      padding: '4px 8px',
      fontSize: '14px',
    },
    layout: 'light',
    density: 'balanced',
  },
  {
    id: 'notion-dark',
    name: 'Notion Dark',
    description: 'Clean, minimalist, Notion-inspired dark theme',
    fonts: { 
      brand: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
      heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"', 
      body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
    },
    colors: { 
      bg: '#191919',
      surface: '#191919',
      surfaceElevated: '#202020',
      
      primary: '#2383e2',
      primaryHover: '#0070df',
      accent: '#2383e2',
      secondary: '#373737',
      
      border: 'rgba(255, 255, 255, 0.13)',
      borderElevated: 'rgba(255, 255, 255, 0.09)',
      
      text: 'rgba(255, 255, 255, 0.9)',
      textMuted: 'rgba(255, 255, 255, 0.6)',
      textSubtle: 'rgba(255, 255, 255, 0.4)',
      textDanger: '#ff7369',
      
      dangerBg: 'rgba(255, 115, 105, 0.1)',
      dangerBorder: 'rgba(255, 115, 105, 0.2)',
    },
    effects: {
      glow: 'none',
      glass: 'none',
    },
    card: { 
      borderRadius: '3px', 
      shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.1)', 
      border: '1px solid rgba(255, 255, 255, 0.13)',
      padding: '8px 10px',
      gap: '4px',
      titleSize: '14px',
      metaSize: '12px', 
    },
    featureCard: {
      bg: '#191919',
      border: '1px solid rgba(255, 255, 255, 0.13)',
      borderRadius: '3px',
      padding: '16px',
    },
    column: { 
      borderRadius: '4px',
      padding: '8px', 
      headerBg: 'transparent', 
      headerBorder: 'none',
      headerPadding: '6px 8px',
      headerSize: '14px',
      gap: '8px',
    },
    button: { 
      borderRadius: '3px',
      padding: '6px 12px',
      fontSize: '14px',
    },
    badge: {
      bg: 'rgba(255, 255, 255, 0.1)',
      border: 'none',
      borderRadius: '3px',
      padding: '2px 6px',
      fontSize: '12px',
    },
    page: {
      titleSize: '30px',
      titleWeight: 700,
      titleSpacing: '-0.02em',
      padding: '40px 60px',
      headerMargin: '20px',
    },
    grid: {
      gap: '20px',
      minCardWidth: '260px',
    },
    board: {
      columnWidth: '272px',
      gap: '12px',
    },
    input: {
      bg: '#202020',
      border: '1px solid rgba(255, 255, 255, 0.13)',
      borderRadius: '3px',
      padding: '4px 8px',
      fontSize: '14px',
    },
    layout: 'dark',
    density: 'balanced',
  },
] as const

export type AppStyle = typeof appStyles[number]
export type AppStyleId = AppStyle['id']
