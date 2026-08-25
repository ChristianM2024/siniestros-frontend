/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          600: '#1e40af',
          700: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
