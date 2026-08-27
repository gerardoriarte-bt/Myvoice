import animate from 'tailwindcss-animate';

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
        /* El negro del producto, uno solo. Antes convivían tres: bg-gray-900
           (#111827), bg-black (#000) y bg-[#1D1D1F], más la clase
           apple-btn-primary. Ver docs/oraculo-diseno.md, F3.
           `ink` es el fondo de las acciones primarias y de los velos de modal;
           `ink-hover` es su único estado hover. */
        ink: {
          DEFAULT: '#1D1D1F',
          hover: '#3A3A3C',
        },
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
  plugins: [animate],
};
