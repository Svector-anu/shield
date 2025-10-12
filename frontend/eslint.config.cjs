const { FlatCompat } = require("@eslint/eslintrc");
const typescriptParser = require("@typescript-eslint/parser");
const typescriptPlugin = require("@typescript-eslint/eslint-plugin");
const nextPlugin = require("@next/eslint-plugin-next");
const reactPlugin = require("eslint-plugin-react");
const hooksPlugin = require("eslint-plugin-react-hooks");

const compat = new FlatCompat();

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 12,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
  },
];
