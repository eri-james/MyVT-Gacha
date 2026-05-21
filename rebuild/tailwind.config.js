/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// MyVT brand colors
				primary: {
					50: '#eff6ff',
					100: '#dbeafe',
					200: '#bfdbfe',
					300: '#93c5fd',
					400: '#60a5fa',
					500: '#3b82f6',
					600: '#2563eb',
					700: '#1d4ed8',
					800: '#1e40af',
					900: '#1e3a8a'
				},
				// Rarity colors
				rarity: {
					r: '#9ca3af',
					sr: '#60a5fa',
					ssr: '#c77dff',
					ur: '#fbbf24'
				},
				// Dark theme palette (carried over from overhaul)
				surface: {
					DEFAULT: 'rgba(255,255,255,0.05)',
					hover: 'rgba(255,255,255,0.08)',
					active: 'rgba(255,255,255,0.12)',
					glass: 'rgba(255,255,255,0.06)',
					border: 'rgba(255,255,255,0.1)'
				}
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
			},
			backdropBlur: {
				glass: '12px'
			},
			animation: {
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fadeIn 0.3s ease-out',
				'slide-up': 'slideUp 0.3s ease-out'
			},
			keyframes: {
				fadeIn: {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				slideUp: {
					from: { opacity: '0', transform: 'translateY(10px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				}
			}
		}
	},
	plugins: []
};
