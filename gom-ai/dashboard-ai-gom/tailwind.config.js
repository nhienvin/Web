/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{jsx,js}"
    ],
    theme: {
      extend: {
        colors: {
          'gom-brown': '#6B4226',
          'gom-green': '#9BC5A2',
          'gom-white': '#FAF3E0',
          'gom-green-dark': '#4A7C59'
        }
      },
    },
    plugins: [],
  }
  