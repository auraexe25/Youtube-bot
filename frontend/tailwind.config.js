/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 80px rgba(21, 12, 58, 0.6)',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -18px, 0) scale(1.05)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.38', transform: 'scale(0.96)' },
          '50%': { opacity: '0.62', transform: 'scale(1.04)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        drift: 'drift 18s ease-in-out infinite',
        pulseSoft: 'pulseSoft 10s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        floatIn: 'floatIn 0.45s ease-out both',
      },
    },
  },
  plugins: [],
}