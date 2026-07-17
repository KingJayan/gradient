# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Development Commands

```bash
pnpm start                    # Expo dev server
pnpm run ios                  # iOS simulator
pnpm run android              # Android simulator
pnpm run lint                 # ESLint
pnpm run type-check           # tsc --noEmit
pnpm test                     # Jest unit tests
pnpm run prebuild             # Expo prebuild (native code)
pnpm run build:ios            # EAS build for App Store
pnpm run build:ios-simulator  # EAS build for simulator
```

## Tech Stack

- React Native 0.76.9 + Expo SDK 52 (iOS-primary)
- React Navigation 6 (bottom tabs nested inside a native stack)
- TypeScript
- `expo-secure-store` (iOS Keychain) for credentials and prefs
- `@expo/vector-icons` Ionicons only

## Architecture

### Root (app.tsx)
Provider order, outer → inner:
```
ErrorBoundary
  ThemeProvider
    AuthContext.Provider           ← created here from useAuth()
      DataProvider                 ← MUST be inside AuthContext (calls useCreds)
        NavigationContainer
          AuthStack  |  AppStack
```
- `AppStack` (native stack): `Tabs` (default) + `Transcript` and `Attendance` as modal screens.
- `AppTabs`: Home, Grades, GPA, Schedule, Planner, Teachers, Settings.
- Transcript and Attendance are reached by navigating from Home; they are not tabs.

### Auth (context/auth-context.ts + hooks/use-auth.ts)
- `Student = { id, username, hacUrl, name? }` — **never** contains password.
- SecureStore keys: `userToken`, `user` (JSON, no password), `userPass` (password only).
- `bootstrapAsync()` reads all three in parallel; missing any → `SIGN_OUT`.
- `login()` hits `/api/name` to validate, then writes all three keys.
- `logout()` deletes all three keys.

### Credentials (hooks/use-creds.ts)
- `useCreds(): Creds | null` — returns `{ hacUrl, username, password }` or null.
- Reads password from SecureStore on demand; never stored in React state above this hook.
- All API-calling screens guard with `if (!creds) return`.

### Shared cache (context/data-context.tsx)
- `DataProvider` exposes `{ cache: { grades, courses, loading, error }, loadGradesAndCourses, clearCache }`.
- Single fetch for grades feeds both grades view and GPA. Consumers call `loadGradesAndCourses()` via `useFocusEffect`.

### HAC API (services/hac-api.ts)
Exports 7 fetchers — all take `(hacUrl, username, password, ...optional)`:
`fetchGrades`, `fetchAssignments`, `fetchCourses(…, grades?)`, `fetchSchedule(…, rawClasses?)`, `fetchTranscript`, `fetchAttendance`, `fetchTeachers(…, rawClasses?)`.

Implementation details:
- `apiFetch()` wraps `fetch`, maps HTTP status → user-friendly `HACError`.
- `parseGrade`, `parseScore` handle `"87.50"`, `"--"`, `"95 / 100"`.
- `inferWeight(name)` returns 1.0 for AP, 0.5 for Honors, 0.0 otherwise — used by `fetchCourses`; users can override per-course in the GPA screen.
- Period numbers come from HAC; bell times are not exposed by the API.
- `fetchAttendance` always returns `[]` — the district endpoint is unavailable.

### Themes (context/theme-context.ts)
- 6 themes: emerald (default), ocean, violet, rose, amber, slate.
- Each theme: `{ primary, background, surface, text, textSecondary, border }` — dark UI with vibrant primaries.
- Persisted to SecureStore key `appTheme`.
- `useTheme()` → `{ currentTheme, themeName, availableThemes, setTheme }`.

### Screen data pattern
```ts
const creds = useCreds();
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useFocusEffect(React.useCallback(() => { load(); }, [creds]));

const load = async () => {
  if (!creds) { setLoading(false); return; }
  try { setLoading(true); setError(null); /* fetch */ }
  catch (error) { setError(error instanceof Error ? error.message : 'Failed to load'); }
  finally { setLoading(false); }
};
```

### Animations
All `Animated.Value` instances are wrapped in `useRef` to survive re-renders. Used in home, login, loading.

## Files

| File | Purpose |
|------|---------|
| `app.tsx` | Root navigator + providers |
| `context/auth-context.ts` | Auth types + context |
| `context/theme-context.ts` | Theme context + 6 themes |
| `context/data-context.tsx` | Shared grades/courses cache |
| `components/error-boundary.tsx` | Top-level error fallback |
| `hooks/use-auth.ts` | Auth state (useReducer) |
| `hooks/use-creds.ts` | Credentials guard |
| `hooks/use-theme.ts` | Theme accessor |
| `services/hac-api.ts` | All HAC fetchers + adapters |
| `utils/gpa-calculator.ts` | Weighted/unweighted GPA |
| `utils/task-manager.ts` | HAC + personal task merge |
| `utils/schedule-data.ts` | Schedule + attendance helpers |
| `utils/error-logger.ts` | Centralised logging (Sentry-ready) |
| `screens/` | 11 screens (9 in nav, transcript/attendance reachable via stack) |

## Guidelines

### New screen
1. Create `screens/[name].tsx`.
2. Use `useCreds()` guard.
3. Follow the screen data pattern above.
4. Register in `AppTabs` or as a stack screen in `AppStack`.
5. Use `useTheme()`'s `currentTheme` for all colors.

### New fetcher
1. Add to `services/hac-api.ts`.
2. Signature `async fetchXxx(hacUrl, username, password, ...optional)` returning a typed array.
3. Use `apiFetch()` + validation helpers (`isObject`, `safeString`, `safeNumber`).

### Styling
- `StyleSheet.create` at the bottom of each file.
- Reference `currentTheme.*` for dynamic theming.
- `SafeAreaView` at the root of screens.

### Error handling
- Network/HTTP → `HACError` with user-friendly message → screen renders retry.
- Missing credentials → `useCreds()` is null → render empty/login prompt.
- Attendance endpoint missing → returns `[]` (handled in `fetchAttendance`).

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md). Typical flow: `pnpm run prebuild && pnpm run build:ios && eas submit --platform ios`. Update `app.json` `extra.eas.projectId` before first build.

## Security

- All secrets in iOS Keychain via `expo-secure-store`.
- Password never enters the persisted user JSON; fetched on demand by `useCreds()`.
- `.env*.local` ignored by git.

## Testing

Tests live in `__tests__/` subdirectories next to the modules they cover. Run with `pnpm test`.

| Test file | Covers |
|-----------|--------|
| `utils/__tests__/gpa-calculator.test.ts` | `calculateGPA`, `predictedGradeNeeded`, `whatIfScenario` |
| `utils/__tests__/task-manager.test.ts` | `mergeTasks`, `getOverdueTasks`, `getUpcomingTasks`, `groupByDate`, `generateTaskSummary` |
| `utils/__tests__/schedule-data.test.ts` | `calculateAttendancePercentage` |
| `services/__tests__/hac-api.test.ts` | `fetchGrades`, `fetchCourses`, `fetchAssignments`, `fetchTranscript` — fetch is mocked |

CI (`.github/workflows/ci.yml`) runs type-check → lint → test on every push and PR to `main`.

## Known Limitations

- iOS-only target; dark UI only (6 themes, all dark-background).
- HAC responses are inconsistent — adapters in `hac-api.ts` normalise field names.
- Bell times not exposed by HAC API; `fetchAttendance` always returns `[]`.
- Teacher emails not available via HAC API.
- No OTA updates (`updates.enabled: false`).
