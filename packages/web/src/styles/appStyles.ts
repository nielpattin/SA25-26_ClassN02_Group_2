/**
 * Universal Style Token
 * Optimized for high element distinction and visual comfort.
 * Elements are distinguished by depth and saturation layers.
 */
export const appStyles = [
  {
    id: 'universal',
    name: 'Universal',
    description: 'High-distinction workspace theme for all environments',
    fonts: { 
      brand: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', 
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    },
    colors: { 
      // Layer 0: Canvas (Deepest)
      bg: '#EBECEE', 
      
      // Layer 1: Context Zones - Columns, Sidebars (Step up)
      surfaceElevated: '#FFFFFF', 
      
      // Layer 2: Main Interactive Elements - Cards (Highest depth)
      surface: '#FFFFFF', 
      
      primary: '#000000',
      primaryHover: '#222222',
      accent: '#FFD166',
      secondary: '#EBECEE',
      
      border: '#000000', 
      borderElevated: '#000000',
      
      text: '#000000', 
      textMuted: '#444444',
      textSubtle: '#666666',
      textDanger: '#E74C3C',
      
      dangerBg: '#FADBD8',
      dangerBorder: '#E74C3C',
    },
    effects: {
      glow: 'none',
      glass: 'none',
      shadow: '4px 4px 0px #000000',
    },
    card: { 
      borderRadius: '0px', 
      shadow: 'none', 
      border: '2px solid #000000',
      padding: '12px 16px',
      gap: '8px',
      titleSize: '14px',
      metaSize: '12px', 
    },
    column: { 
      borderRadius: '0px',
      padding: '16px', 
      headerBg: 'transparent', 
      headerBorder: 'none',
      headerPadding: '8px 12px',
      headerSize: '14px',
      gap: '16px',
    },
    button: { 
      borderRadius: '0px',
      padding: '8px 16px',
      fontSize: '14px',
    },
    input: {
      bg: '#FFFFFF',
      border: '2px solid #000000',
      borderRadius: '0px',
      padding: '10px 14px',
      fontSize: '14px',
    },
    page: {
      titleSize: '32px',
      titleWeight: 700,
      titleSpacing: '-0.02em',
      padding: '48px 64px',
      headerMargin: '40px',
    },
    board: {
      columnWidth: '300px',
      gap: '24px',
    },
    layout: 'universal',
    density: 'balanced',
  },
] as const

export type AppStyle = typeof appStyles[number]
export type AppStyleId = AppStyle['id']
