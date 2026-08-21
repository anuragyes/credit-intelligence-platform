/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        approve: '#1a7f37',
        conditions: '#9a6700',
        decline: '#cf222e',
        surface: '#0f1420',
        panel: '#161c2c',
      },
    },
  },
  plugins: [],
};
