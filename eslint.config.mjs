import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
    },
  },
];
