import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    platform: "neutral",
    treeshake: true,
  },
  {
    entry: { cli: "src/cli-main.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: false,
    target: "es2022",
    platform: "node",
    banner: { js: "#!/usr/bin/env node" },
    define: { __VERSION__: JSON.stringify(version) },
  },
]);
