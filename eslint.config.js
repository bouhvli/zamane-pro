import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      ".vercel",
      ".tanstack",
      ".ux-forge",
      "src/client/routeTree.gen.ts",
      "public/theme-init.js",
      "playwright-report",
      "test-results",
      "tests/visual/report",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/client/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The forms mirror the prototype's imperative focus moves after async work; these are deliberate.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["scripts/**/*.ts", "*.config.{ts,js}", "tests/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // The shared layer must not import from either runtime.
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/client/**", "**/worker/**"], message: "src/shared must not import from client or worker." },
          ],
        },
      ],
    },
  },
);
