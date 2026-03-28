/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional palette - Fin Dzen inspired
        cream: '#FBF3EE',      // Light cream background
        peach: '#F5E6D3',      // Peach tint
        sage: '#7A9B6E',       // Sage green for accents
        tan: '#A89873',        // Muted tan/brown
        charcoal: '#1A1A1A',   // Dark nav background
        accent: '#EF4444',     // Red accent
        success: '#6B9D6C',    // Muted green
        neutral: '#8B8B8B',    // Neutral gray
        dark: '#2A2A2A',       // Dark text
        // Legacy color names for CSS compatibility
        primary: '#7A9B6E',    // Maps to sage
        danger: '#EF4444',     // Red for alerts
        warning: '#F59E0B',    // Amber for caution
        light: '#FBF3EE',      // Light cream
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      fontSize: {
        xs: ['0.75rem', '1rem'],
        sm: ['0.875rem', '1.25rem'],
        base: ['1rem', '1.5rem'],
        lg: ['1.125rem', '1.75rem'],
        xl: ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
        '3xl': ['1.875rem', '2.25rem'],
        '4xl': ['2.25rem', '2.5rem'],
      },
      backgroundImage: {
        'gradient-cream': 'linear-gradient(135deg, #FBF3EE 0%, #F5E6D3 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #FBF3EE 0%, #E8DCC8 100%)',
      },
    },
  },
  plugins: [],
}
