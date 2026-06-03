import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest para a lógica pura das features (cálculo, correção, agregação).
// Não roda em jsdom (testamos funções puras, não componentes). O alias "@"
// espelha o tsconfig para os imports funcionarem nos testes.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
