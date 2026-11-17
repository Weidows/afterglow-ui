import { defineConfig } from "vite";

// Two jobs for one config:
//   vite                  → serve the gallery from gallery/
//   vite build --mode lib → ship the library into dist/
export default defineConfig(({ command, mode }) => {
  if (command === "serve" || mode === "gallery") {
    return {
      root: "gallery",
      base: "./",
      server: {
        host: "127.0.0.1",
        port: 5180,
        strictPort: true,
      },
      build: {
        outDir: "../dist-gallery",
        emptyOutDir: true,
        target: "es2022",
        rollupOptions: {
          input: {
            main: "gallery/index.html",
            bench: "gallery/bench.html",
          },
        },
      },
    };
  }

  return {
    build: {
      target: "es2022",
      sourcemap: true,
      lib: {
        entry: "src/index.ts",
        formats: ["es"],
        fileName: "index",
        cssFileName: "afterglow",
      },
      rollupOptions: {
        output: {
          preserveModules: false,
        },
      },
    },
  };
});
