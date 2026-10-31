/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          primary: '#714B67',      // Signature Odoo purple
          primaryHover: '#5e3e56',
          secondary: '#017E84',    // Odoo teal
          dark: '#2B2538',
          light: '#F8F9FA',
          accent: '#00A09D',
          border: '#E2E8F0',
          warning: '#F59E0B',
          danger: '#EF4444',
          success: '#10B981'
        }
      }
    },
  },
  plugins: [],
}
