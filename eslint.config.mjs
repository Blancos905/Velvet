import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(new URL("./luxury-frontend/package.json", import.meta.url));

const js = (await import(pathToFileURL(require.resolve("@eslint/js")).href)).default;
const tseslint = (await import(pathToFileURL(require.resolve("typescript-eslint")).href)).default;
const reactHooks = (await import(pathToFileURL(require.resolve("eslint-plugin-react-hooks")).href)).default;
const globals = require("globals");

const typescript = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ["**/*.{ts,tsx,mts,cts}"],
}));

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/._*"],
  },
  js.configs.recommended,
  ...typescript,
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["luxury-frontend/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
