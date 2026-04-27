import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    languageOptions: {
      globals: {
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        DragEvent: 'readonly',
        crypto: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        HTMLElement: 'readonly',
      },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  skipFormatting,
)
