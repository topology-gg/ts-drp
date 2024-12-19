import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: ["**/node_modules"],
    coverage: {
      enabled: true, // Enable coverage collection
      reporter: ["text", "lcov"], // Output coverage report in text format and lcov format
      include: ["packages/**/*.{ts,tsx}"], // Specify file patterns to include for coverage
      exclude: ["**/node_modules/**", "**/__tests__/**", "**/tests/**"], // Exclude test and node_modules directories
    },
  },
});
