import js from "@eslint/js"
import importPlugin from "eslint-plugin-import"
import sonarjs from "eslint-plugin-sonarjs"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"

// eslint-disable-next-line import/no-default-export
export default defineConfig([
  globalIgnores(["dist/*"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      "unicorn/no-array-for-each": "off",
      "unicorn/prefer-string-replace-all": "off",
      "unicorn/prevent-abbreviations": "off",
      "no-plusplus": "off",
      "no-param-reassign": ["error", { props: false }],
      "unicorn/no-negated-condition": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "import/extensions": "off",
      "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
      "import/prefer-default-export": "off",
      "import/no-default-export": "error",
      "import/no-unresolved": "off",
    },
  },
])
