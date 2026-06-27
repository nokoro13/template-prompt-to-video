// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import path from "path";

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

/** Match Next.js/tsconfig `@/*` so Remotion can bundle lib/ imports from Root.tsx. */
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(typeof config.resolve?.alias === "object" && config.resolve.alias
        ? config.resolve.alias
        : {}),
      "@": path.resolve(process.cwd()),
    },
  },
}));
