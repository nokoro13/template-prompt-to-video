import { config } from "@remotion/eslint-config-flat";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      "app/**",
      "components/**",
      "next.config.ts",
      "tailwind.config.ts",
      "postcss.config.mjs",
    ],
  },
  ...config,
];
