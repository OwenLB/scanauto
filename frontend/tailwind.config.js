/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', 'class'],
  theme: {
  	extend: {
  		fontFamily: {
  			display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  			sans: ['Inter', 'system-ui', 'sans-serif'],
  		},
  		colors: {
  			bg: 'var(--bg)',
  			surface: 'var(--surface)',
  			card: 'var(--card)',
  			border: 'var(--border)',
  			'border-hover': 'var(--border-hover)',
  			text: 'var(--text)',
  			'text-secondary': 'var(--text-secondary)',
  			'text-tertiary': 'var(--text-tertiary)',
  			accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-fg)' },
  			'accent-fg': 'var(--accent-fg)',
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			'card-foreground': 'var(--card-foreground)',
  			primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
  			secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
  			muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
  			destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
}
