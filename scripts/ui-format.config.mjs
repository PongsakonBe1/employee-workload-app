import checks from "./ui-eslint.config.mjs";
export default [...checks, {
  files: ["frontend/components/ui/**/*.js", "frontend/components/AppShell.js", "frontend/app/dev/ui/**/*.js", "frontend/app/dev/record/**/*.js", "frontend/app/calendar/page.js", "frontend/app/resources/page.js"],
  rules: {
    "react/jsx-one-expression-per-line": ["error", { allow: "single-child" }],
    "react/jsx-max-props-per-line": ["error", { maximum: 2, when: "always" }],
    "react/jsx-first-prop-new-line": ["error", "multiline-multiprop"],
    "react/jsx-closing-bracket-location": ["error", "line-aligned"],
    "react/jsx-indent": ["error", 2],
    "react/jsx-indent-props": ["error", 2],
  },
}];
