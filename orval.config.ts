import { defineConfig } from "orval";

export default defineConfig({
  pacificAurora: {
    input: {
      target: "./contracts/pacific-aurora.openapi.yaml",
    },
    output: {
      target: "./src/lib/api/generated.ts",
      client: "fetch",
      mode: "single",
      clean: false,
    },
  },
  pacificAuroraSchemas: {
    input: {
      target: "./contracts/pacific-aurora.openapi.yaml",
    },
    output: {
      target: "./src/lib/api/schemas.ts",
      client: "zod",
      mode: "single",
      clean: false,
    },
  },
});
