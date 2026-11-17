// Targeted migration checks using the repository's existing ESLint dependencies.
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import accessibility from "eslint-plugin-jsx-a11y";
import globals from "globals";

const classroomFiles = ["frontend/lib/calendarMutationReplayQa.js","frontend/lib/calendarStagingEntry.js", "frontend/lib/calendarStagingSession.js", "frontend/lib/firebaseAppSelection.js", "frontend/lib/calendarRoleWriteQa.js", "frontend/lib/calendarRoleWriteSdk.js", "frontend/lib/calendarRoleProbe.js", "frontend/lib/calendarWriter.js", "frontend/lib/calendarCreatePlan.js", "frontend/lib/calendarStagingAuthError.js", "frontend/lib/calendarSdkTransport.js", "frontend/lib/calendarStagingClient.js", "frontend/lib/calendarStagingConfig.js", "frontend/lib/calendarReadOnly.js", "frontend/lib/calendarEmulatorConfig.js", "frontend/lib/calendarEmulatorClient.js", "frontend/lib/calendarDataAdapter.js", "frontend/lib/dlImageImport.js", "frontend/lib/readDlImage.js", "frontend/lib/dockMotion.js", "frontend/lib/classroomImport.js", "frontend/lib/classroomPdfGeometry.js", "frontend/lib/readClassroomPdf.js"];
export default [{
  files: ["frontend/app/dev/calendar-mutation-replay/**/*.js", "frontend/components/calendar/**/*.js", "frontend/components/staging/**/*.js", "frontend/app/staging/**/*.js", "frontend/app/calendar/legacy.js", "frontend/lib/previewState.js", "frontend/lib/firebase.js", "frontend/components/ui/**/*.js", "frontend/components/DevelopmentAuthBoundary.js", "frontend/app/dev/calendar-readonly/**/*.js", "frontend/app/dev/calendar-staging/**/*.js", "frontend/app/dev/calendar-staging-roles/**/*.js", "frontend/app/dev/calendar-staging-role-write/**/*.js", "frontend/app/dev/calendar-write/**/*.js", "frontend/app/dev/calendar-staging-write/**/*.js", "frontend/components/AppShell.js", "frontend/components/ViewToggle.js", "frontend/app/dev/ui/**/*.js", "frontend/app/dev/record/**/*.js", "frontend/app/dev/calendar/**/*.js", "frontend/app/dev/history/**/*.js", "frontend/app/dev/resources/**/*.js", "frontend/app/dev/equipment/**/*.js", "frontend/app/dev/dashboard/**/*.js", "frontend/app/dev/staff/**/*.js", "frontend/app/dev/templates/**/*.js", "frontend/app/dev/previewState.js", "frontend/app/calendar/page.js", "frontend/app/resources/page.js", "frontend/lib/appearance.js", "frontend/lib/navigation.js", "frontend/lib/glassPolicy.js", "frontend/lib/calendarView.js", "frontend/lib/recordPreview.js", "frontend/lib/previewLedger.js", "frontend/lib/historyPreview.js", "frontend/lib/equipmentPreview.js", "frontend/lib/resourceWorklog.js", "frontend/lib/resourcePreview.js", "frontend/lib/previewNavigation.js", "frontend/lib/planningPreview.js", "frontend/lib/assessmentPreview.js", "frontend/lib/templatePreview.js", "frontend/lib/templatePayload.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser, process: "readonly" }, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { react, "react-hooks": hooks, "jsx-a11y": accessibility },
  rules: { "no-undef": "error", "no-unused-vars": ["error", { argsIgnorePattern: "^_" }], "react/jsx-uses-vars": "error", "react/jsx-no-undef": "error", ...hooks.configs.recommended.rules, "react-hooks/exhaustive-deps": "error", ...accessibility.configs.recommended.rules, "jsx-a11y/label-has-associated-control": ["error", { depth: 3 }] },
}, {
  files: classroomFiles,
  languageOptions: { ecmaVersion:2022,sourceType:"module",globals:globals.browser },
  rules: {"no-undef":"error","no-unused-vars":"error"},
}, {
  files: ["frontend/lib/calendarTrusted*.js", "frontend/lib/calendarServer*.js", "frontend/lib/calendarStagingServerConfig.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.browser },
  rules: { "no-undef": "error", "no-unused-vars": "error" },
}, {
  files: ["backend/src/calendar/**/*.js", "calendar-server/src/**/*.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  rules: { "no-undef": "error", "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
}];
