import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs}'],
  },

  globalIgnores(['**/dist/**', 'public/model/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,

  // 關閉與 Prettier 衝突的格式規則（需放在最後）
  skipFormatting,
])
