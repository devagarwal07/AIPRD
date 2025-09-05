/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3ccff',
          300: '#83a8ff',
          400: '#4d7cff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
      },
      boxShadow: {
        card: '0 2px 10px rgba(2, 6, 23, 0.06), 0 1px 3px rgba(2, 6, 23, 0.08)',
        soft: '0 1px 2px rgba(2,6,23,0.06), 0 1px 1px rgba(2,6,23,0.05)'
      },
      borderRadius: {
        xl: '0.875rem',
      }
    },
  },
  plugins: [],
};
