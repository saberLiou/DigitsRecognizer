import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the build works under any sub-path (e.g. GitHub Pages /DigitsRecognizer/).
  base: './',
  plugins: [tailwindcss()],
})
