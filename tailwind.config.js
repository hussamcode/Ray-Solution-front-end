/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'primary-container': '#1d4ed8',
        'on-primary': '#ffffff',
         'primary-container': '#265eae',
        'secondary': '#7c3aed',
        'on-secondary-container': '#4c1d95',
        'surface': '#f8fafc',
        'surface-container': '#f1f5f9',
        'surface-container-high': '#e2e8f0',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#0f172a',
        'on-primary-fixed-variant': '#1e40af',
        'outline-variant': '#cbd5e1',
      }
    }
  },
  plugins: []
}