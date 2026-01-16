import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import betterTailwind from 'eslint-plugin-better-tailwindcss'
import { defineConfig, globalIgnores } from 'eslint/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'better-tailwind': betterTailwind,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'better-tailwind/no-conflicting-classes': ['error', {
        entryPoint: path.resolve(__dirname, 'src/index.css'),
      }],
      'better-tailwind/no-duplicate-classes': 'error',
      'better-tailwind/enforce-consistent-class-order': 'warn',
      'better-tailwind/no-unnecessary-whitespace': 'warn',
      'better-tailwind/enforce-canonical-classes': ['warn', {
        entryPoint: path.resolve(__dirname, 'src/index.css'),
      }],
    },
  },
])
