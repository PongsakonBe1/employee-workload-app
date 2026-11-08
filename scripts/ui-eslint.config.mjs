// Targeted migration checks using the repository's existing ESLint dependencies.
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import accessibility from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default [{
  files: ["frontend/components/ui/**/*.js", "frontend/components/AppShell.js", "frontend/components/ViewToggle.js", "frontend/app/dev/ui/**/*.js", "frontend/app/dev/record/**/*.js", "frontend/app/dev/calendar/**/*.js", "frontend/app/dev/history/**/*.js", "frontend/app/dev/resources/**/*.js", "frontend/app/dev/equipment/**/*.js", "frontend/app/dev/dashboard/**/*.js", "frontend/app/dev/staff/**/*.js", "frontend/app/dev/previewState.js", "frontend/app/calendar/page.js", "frontend/app/resources/page.js", "frontend/lib/appearance.js", "frontend/lib/navigation.js", "frontend/lib/glassPolicy.js", "frontend/lib/calendarView.js", "frontend/lib/recordPreview.js", "frontend/lib/previewLedger.js", "frontend/lib/historyPreview.js", "frontend/lib/equipmentPreview.js", "frontend/lib/resourceWorklog.js", "frontend/lib/resourcePreview.js", "frontend/lib/previewNavigation.js", "frontend/lib/planningPreview.js", "frontend/lib/assessmentPreview.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser, process: "readonly" }, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { react, "react-hooks": hooks, "jsx-a11y": accessibility },
  rules: { "no-undef": "error", "no-unused-vars": ["error", { argsIgnorePattern: "^_" }], "react/jsx-uses-vars": "error", "react/jsx-no-undef": "error", ...hooks.configs.recommended.rules, "react-hooks/exhaustive-deps": "error", ...accessibility.configs.recommended.rules, "jsx-a11y/label-has-associated-control": ["error", { depth: 3 }] },
}];
