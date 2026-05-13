/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF2D55',
          dark: '#E61E45',
          50: '#FFF0F3',
          100: '#FFE4EA',
        },
      },
    },
  },
  plugins: [],
}
