/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Field requirement colors
        'required-red': '#dc2626',
        'recommended-yellow': '#f59e0b',
        'optional-gray': '#6b7280',
      }
    },
  },
  plugins: [],
}
