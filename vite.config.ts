import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/explicit-function-return-type": [
        "error",
        {
          allowDirectConstAssertionInArrowFunctions: false,
          allowHigherOrderFunctions: false,
          allowTypedFunctionExpressions: false,
        },
      ],
    },
    options: { typeAware: true, typeCheck: true },
  },
});
