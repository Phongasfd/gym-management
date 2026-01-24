const js = require("@eslint/js");
const globals = require("globals");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    files: ["**/*.{js,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
]);