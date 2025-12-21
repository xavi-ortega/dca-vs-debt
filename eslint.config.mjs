import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const tsRuleSet = {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tsPlugin.configs.recommended.rules,
    "no-console": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.vite/**",
      "**/*.d.ts",
    ],
  },
  tsRuleSet,
  {
    files: ["packages/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        document: "readonly",
        window: "readonly",
        fetch: "readonly",
      },
    },
  },
  {
    files: [
      "packages/core/src/**/*.{ts,tsx}",
      "packages/cli/src/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parserOptions: { sourceType: "module" },
    },
  },
];
