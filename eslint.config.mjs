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
  {
    
    ignores: [
      "app/api/**/*",
      "lib/rewards-system.ts",
      "lib/mongodb.ts",
      "components/auth-provider.tsx",
      "components/barcode-scanner.tsx",
      "components/dashboard-layout.tsx",
      "components/reward-notification.tsx",
      "app/carbon-tracking/page.tsx",
      "app/leaderboard/page.tsx",
      "app/rewards/page.tsx",
      "app/scan/page.tsx"
    ]
  }
];