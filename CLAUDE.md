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
pnpm run precommit            # type-check + lint + test
pnpm run prebuild             # Expo prebuild (native code)
pnpm run build:ios            # EAS build for App Store
pnpm run build:ios-simulator  # EAS build for simulator
```

## Tech Stack

- React Native 0.81 + Expo SDK 54 (iOS-primary)
- React Navigation 6 (bottom tabs nested inside a native stack)
- TypeScript
- `expo-secure-store` (iOS Keychain) for credentials and prefs
- `@react-native-async-storage/async-storage` for non-secret local data (query cache, bell times, personal tasks)
- `expo-local-authentication` for the optional Face ID app lock
- `@expo/vector-icons` Ionicons only

## Architecture

### Root (app.tsx)
Provider order, outer → inner:
```
ErrorBoundary
  ThemeProvider
    AuthContext.Provider           ← created here from useAuth()
      AppLockProvider
        DataProvider               ← MUST be inside AuthContext (calls useCreds)
          AppShell
            NavigationContainer
              AuthStack  |  AppStack
```
- `AppStack` (native stack): `Tabs` (default) + `Transcript` as a modal screen.
- `AppTabs`: Home, Grades, GPA, Schedule, Planner, Settings.
- Transcript is reached by navigating from Home; it is not a tab.
- Every screen is wrapped in its own `ErrorBoundary` via `withBoundary`, so one
  crashing screen does not take down the app or the tab bar.
- `AppShell` renders `LockScreen` instead of the navigator while the app lock is
  engaged, and overlays the offline banner driven by `useNetworkStatus()`.

### Auth (context/auth-context.ts + hooks/use-auth.ts)
- `Student = { id, username, hacUrl, name? }` — **never** contains password.
- SecureStore keys: `userToken` (presence marker), `user` (JSON, no password), `userPass` (password only).
- `bootstrapAsync()` reads all three in parallel; missing any → `SIGN_OUT`.
- `login()` hits `/api/name` to validate, then writes all three keys.
- `logout()` deletes all three keys.
- See [ADR 2](./docs/adr/0002-credential-presence-marker.md) and [ADR 3](./docs/adr/0003-split-securestore-keys.md).

### Credentials (hooks/use-creds.ts)
- `useCreds(): Creds | null` — returns `{ hacUrl, username, password }` or null.
- Reads password from SecureStore on demand; never stored in React state above this hook.
- All API-calling screens guard on it (directly or through `useScreenData`).

### App lock (context/app-lock-context.tsx)
- `useAppLock()` → `{ enabled, locked, authenticate, setEnabled, isSupported }`.
- Persisted to SecureStore key `appLockEnabled`; re-locks when the app backgrounds.

### Query cache (hooks/use-hac-query.ts + hooks/query-persist.ts)
- `useHacQuery(key, fetcher, options?)` — module-level store, subscriber notify,
  5-minute default TTL, in-flight dedup, one `AbortController` per key.
- Passing a `null` key disables the query (used for the credentials guard).
- Results are mirrored to AsyncStorage (`hacQueryCache`) so a cold start renders
  stale data immediately; `invalidateAllQueries()` clears both on logout.
- `useScreenData(key, fetcher)` wraps the `useCreds` + `useHacQuery` pairing.

### Shared cache (context/data-context.tsx)
- `DataProvider` exposes `{ cache: { grades, courses, assignments, schedule, loading, error }, loadGradesAndCourses, clearCache }`.
- One `dashboard` query fetches grades, assignments, and schedule in parallel and
  derives courses from the grades already in hand — Home, Grades, GPA, Schedule,
  and Planner all read it instead of fetching per screen.

### HAC API (services/api/)
The app never talks to HAC directly — see [ADR 1](./docs/adr/0001-proxy-api.md).

| module | exports |
|---|---|
| `config.ts` | `API_BASE_URL`, `API_URL` (overridable via `app.json` `extra.apiBaseUrl`) |
| `client.ts` | `apiFetch`, `HACError`, `isObject`, `safeString`, `safeNumber` |
| `schema.ts` | `recordResponse`, `tableResponse` — shape validation, prototype-key stripping |
| `parsers.ts` | `parseGrade`, `parseScore`, `inferWeight`, `gradeLetterToPoints`, `colIndex` |
| `grades.ts` | `fetchGrades`, `fetchCourses(…, grades?)` |
| `assignments.ts` | `fetchAssignments` |
| `schedule.ts` | `fetchSchedule` |
| `transcript.ts` | `fetchTranscript` |

Implementation details:
- Fetchers take `(hacUrl, username, password, ...optional, signal?)` and return typed arrays.
- `apiFetch()` maps HTTP status → user-friendly `HACError`, and retries network
  failures and 429/5xx up to 3 attempts with abortable exponential backoff.
  Retries live here only — do not add a second retry layer above it.
- `parseGrade`, `parseScore` handle `"87.50"`, `"--"`, `"95 / 100"`.
- `inferWeight(name)` returns 1.0 for AP, 0.5 for Honors, 0.0 otherwise — used by `fetchCourses`; users can override per-course in the GPA screen.
- Period numbers come from HAC; bell times are not exposed by the API and are
  entered by the user (AsyncStorage key `bellSchedule`).

### Themes (context/theme-context.ts)
- 6 themes: emerald (default), ocean, violet, rose, amber, slate.
- Each theme: `{ primary, background, surface, text, textSecondary, border }` — dark UI with vibrant primaries.
- Persisted to SecureStore key `appTheme`.
- `useTheme()` → `{ currentTheme, themeName, availableThemes, setTheme }`.

### Design tokens (utils/tokens.ts + utils/colors.ts)
- `SPACING`, `RADIUS`, `FONT`, `TOUCH_TARGET` — every padding, margin, gap,
  border radius, and font size in the UI comes from these.
- `utils/colors.ts` holds the color tokens (`UI_COLORS`, `BRAND`, `FALLBACK`) and
  the canonical grade scale: `gradeLetter(avg)` → letter, `gradeColorFromLetter`
  → color, `gradeColor(avg)` delegating through both, `onPrimary(hex)` for
  contrast-safe text on a themed background.
- Both are lint-enforced: raw hex literals and raw spacing/radius/font numbers
  are `no-restricted-syntax` errors outside the token modules.

### Screen scaffolding (components/screen.tsx)
`Screen`, `ScreenHeader`, `AsyncContent`, `RetryButton`, `IconButton`, `Skeleton`.
`AsyncContent` owns the loading/error/empty/retry switch and keeps stale content
on screen while refetching. `IconButton` is the only way icon-only controls are
built — it guarantees a label and a 44pt target.

### Accessibility
- Every touchable carries `accessibilityRole` + `accessibilityLabel`, and
  `accessibilityState` where it is stateful (`expanded`, `selected`, `checked`,
  `disabled`/`busy`).
- Grades are always announced and rendered as a letter alongside the color.
- Minimum 44pt (`TOUCH_TARGET`) on every control; prefer `minHeight` over a
  fixed `height` so Dynamic Type can grow the control.
- `maxFontSizeMultiplier` only on genuinely size-constrained badges.

### Animations
All `Animated.Value` instances are wrapped in `useRef` to survive re-renders. Used in home, login, loading.

## Files

| File | Purpose |
|------|---------|
| `app.tsx` | Root navigator + providers + per-tab error boundaries |
| `context/auth-context.ts` | Auth types + context |
| `context/theme-context.ts` | Theme context + 6 themes |
| `context/data-context.tsx` | Shared dashboard cache |
| `context/app-lock-context.tsx` | Face ID app lock |
| `components/screen.tsx` | Screen scaffolding primitives |
| `components/error-boundary.tsx` | Error fallback (root and per screen) |
| `hooks/use-auth.ts` | Auth state (useReducer) |
| `hooks/use-creds.ts` | Credentials guard |
| `hooks/use-hac-query.ts` | Query store (TTL, dedup, abort, persistence) |
| `hooks/query-persist.ts` | AsyncStorage mirror of the query store |
| `hooks/use-screen-data.ts` | `useCreds` + `useHacQuery` for one-off screens |
| `hooks/use-network.ts` | Offline probe for the banner |
| `hooks/use-theme.ts` | Theme accessor |
| `services/api/` | Proxy client + per-endpoint fetchers |
| `utils/tokens.ts` | Spacing, radius, type scale, touch target |
| `utils/colors.ts` | Color tokens + grade letter/color scale |
| `utils/gpa-calculator.ts` | Weighted/unweighted GPA, what-if scenarios |
| `utils/task-manager.ts` | HAC + personal task merge |
| `utils/error-logger.ts` | Centralised logging (Sentry-ready) |
| `utils/perf.ts` | `mark`/`measure` timings |
| `screens/` | 10 screens (6 tabs, transcript modal, login, lock, loading) |
| `docs/adr/` | Decision records for the non-obvious choices |

## Guidelines

### New screen
1. Create `screens/[name].tsx`.
2. Get data from `useDataCache()` if it is already in the dashboard query,
   otherwise `useScreenData(key, fetcher)`.
3. Wrap the body in `Screen` + `AsyncContent`.
4. Register in `AppTabs` or as a stack screen in `AppStack`, wrapped in `withBoundary`.
5. Colors from `useTheme()`'s `currentTheme` or `utils/colors.ts`; metrics from `utils/tokens.ts`.

### New fetcher
1. Add a module under `services/api/` (or extend the matching one).
2. Signature `async fetchXxx(hacUrl, username, password, ...optional, signal?)` returning a typed array.
3. Use `apiFetch()` with a `schema.ts` validator + the `client.ts` helpers.

### Styling
- `StyleSheet.create` at the bottom of each file.
- Reference `currentTheme.*` for dynamic theming.
- `SPACING` / `RADIUS` / `FONT` / `TOUCH_TARGET` for every metric — raw numbers fail lint.
- `SafeAreaView` at the root of screens (via `Screen`).

### Error handling
- Network/HTTP → `HACError` with user-friendly message → `AsyncContent` renders retry.
- Missing credentials → `useCreds()` is null → the query stays disabled and the screen renders empty.
- Render crashes → the screen's own `ErrorBoundary`.
- Log through `utils/error-logger.ts`; `console.*` fails lint.

## Deployment

Typical flow: `pnpm run prebuild && pnpm run build:ios && eas submit --platform ios`.
`app.json` carries `extra.eas.projectId` and `extra.apiBaseUrl`.

## Security

- All secrets in iOS Keychain via `expo-secure-store`.
- Password never enters the persisted user JSON; fetched on demand by `useCreds()`.
- The persisted query cache is cleared on logout.
- `.env*.local` ignored by git.

## Testing

Tests live in `__tests__/` subdirectories next to the modules they cover. Run with `pnpm test`.

| Test file | Covers |
|-----------|--------|
| `utils/__tests__/gpa-calculator.test.ts` | `calculateGPA`, `whatIfScenario` |
| `utils/__tests__/task-manager.test.ts` | `mergeTasks`, `getOverdueTasks`, `groupByDate` |
| `services/api/__tests__/fetchers.test.ts` | `fetchGrades`, `fetchCourses`, `fetchAssignments`, `fetchTranscript` — fetch is mocked |

CI (`.github/workflows/ci.yml`) runs type-check → lint → test on every push and PR to `main`.

## Known Limitations

- iOS-only target; dark UI only (6 themes, all dark-background).
- HAC responses are inconsistent — the `services/api/` adapters normalise field names.
- Bell times not exposed by HAC API; the user enters them in the Schedule screen.
- Attendance and teacher emails are not available via the proxy.
- No OTA updates (`updates.enabled: false`).
