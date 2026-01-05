import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#fff1f1',100:'#fee3e3',200:'#f9c9ca',300:'#f1a3a6',400:'#d66a6f',
          500:'#b23036',600:'#8f1920',700:'#6f0e15',800:'#520b11',900:'#3a090d'
        },
        // Alias compatible with provided markup (bg-color1-500)
        color1: {
          50:'#fff1f1',100:'#fee3e3',200:'#f9c9ca',300:'#f1a3a6',400:'#d66a6f',
          500:'#b23036',600:'#8f1920',700:'#6f0e15',800:'#520b11',900:'#3a090d'
        }
      }
    }
  },
  plugins: []
} satisfies Config
