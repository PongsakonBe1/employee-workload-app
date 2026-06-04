---
name: testing-unit-tests
description: Run and extend the Vitest unit test suite for backend and frontend pure-logic modules. Use when verifying validation, CSV, fiscal year, worklog filter, or comment suggestion logic.
---

# Unit Test Suite

## Running Tests

```bash
# Full suite (105 tests across 5 files)
npm test

# Single file
npx vitest run backend/src/utils/csv.test.js

# Watch mode during development
npx vitest
```

## Test Files and Covered Modules

| Test File | Source Module | Key Functions |
|-----------|--------------|---------------|
| `backend/src/utils/csv.test.js` | `csv.js` | `csvEscape`, `toCsv` |
| `backend/src/utils/fiscalYear.test.js` | `fiscalYear.js` | `normalizeFiscalYear`, `getFiscalYearRange`, `parseDateOnly` |
| `backend/src/services/workLogFilters.test.js` | `workLogFilters.js` | `buildWorkLogFilter` |
| `frontend/lib/validation.test.js` | `validation.js` | `validateRecipient`, `validateComment`, `validateTime`, `validateDate`, `validateMinorTask`, `validateWorklogForm`, `checkRateLimit`, `sanitizeInput`, `validateEmail` |
| `frontend/lib/commentSuggestions.test.js` | `commentSuggestions.js` | `getCommentSuggestions`, `getMainDutyFromMinorTask`, `hasCommentSuggestions` |

## Configuration

- **Runner**: Vitest (installed as root devDependency)
- **Config**: `vitest.config.js` at project root
- **Pattern**: `backend/src/**/*.test.js` and `frontend/lib/**/*.test.js`

## Notes

- `validation.test.js` uses `vi.useFakeTimers()` to control `Date.now()` for date validation tests. Always call `vi.useRealTimers()` in `afterEach`.
- JavaScript's `new Date("YYYY-MM-DD")` rolls over invalid day-of-month (e.g., Feb 30 → Mar 2) instead of returning `NaN`. The validation module does not reject these.
- The frontend `build` script uses `xcopy` (Windows-only), so Vercel CI deployments might fail. This is unrelated to test changes.
- Modules that depend on Firebase (`quickLogTemplates.js`, `systemLog.js`, `firebase.js`) or browser APIs (`thaiHolidays.js` localStorage) require mocking and are not yet covered.

## Devin Secrets Needed

None — all tested modules are pure functions with no external dependencies.
