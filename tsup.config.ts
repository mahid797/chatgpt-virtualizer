import { defineConfig } from "tsup";

export default defineConfig((opts) => ({
  entry: {
    "background": "src/background/service_worker.ts",
    "content": "src/content/content.ts",
    "popup": "src/ui/popup.ts",
  },
  format: ["esm"],
  splitting: false,
  sourcemap: opts.watch ? true : false,
  clean: true,
  outDir: "dist",
  dts: false,
  minify: !opts.watch,
}));
