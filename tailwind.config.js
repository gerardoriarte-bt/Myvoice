/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './constants.ts',
    './types.ts',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Inter"', 'sans-serif'],
      },
      colors: {
        apple: {
          bg: '#F5F5F7',
          text: '#1D1D1F',
          secondary: '#6E6E73',
          tertiary: '#86868B',
          border: 'rgba(0,0,0,0.08)',
          fill: 'rgba(0,0,0,0.05)',
          blue: '#0071E3',
        },
      },
    },
  },
  plugins: [],
};
