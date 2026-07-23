<div align="center">
<h2><code>KingJayan/gradient</code></h2>
<p>minimalist ios app for viewing home access center (HAC) grades. react native + expo.</p>
</div>

> [!IMPORTANT]
> project & api still in early beta, not expected to work

## features

- grades, GPA (weighted + unweighted), schedule, planner, transcript
- "what if?" — pick a target GPA to see the average you need, or mock a grade to see where it lands you
- personal tasks merged with HAC assignments
- grade-change notifications ("your chemistry average changed 84 → 88"), with an in-app notification center — one tap from the home bell; what counts as a change is yours to tune, everything else lives in iOS Settings
- per-class grade trend sparklines and a GPA-over-time chart
- 6 themes, each in light and dark; matching app icon and splash; optional face id lock
- offline-friendly: last fetch is cached and shown instantly on cold start, refreshed in the background (respects iOS background app refresh), with an "updated X min ago" label on every screen
- creds stored in ios keychain, never on a server
- tells you *why* things broke: "HAC is down for FRISCOISD" beats a spinner
- over-the-air updates, so parser fixes ship without app store review

## quick start

```bash
pnpm install
pnpm start         # press `i` for ios simulator
```

sign in with your district's HAC url, username, and password. search the built-in district directory, or tap "my district isn't listed" to enter and validate a custom HAC url. the directory lives in [utils/district.ts](utils/district.ts).

no HAC account? tap **explore the demo account** on the login screen (or sign in as `demo` / `demo`) — every screen renders from fixtures in [services/api/demo.ts](services/api/demo.ts), no network. turn it off with `extra.demoMode: false` in [app.json](app.json).

## scripts

| command | what it does |
|---|---|
| `pnpm start` | expo dev server |
| `pnpm run ios` | ios simulator |
| `pnpm run lint` | eslint |
| `pnpm run type-check` | typescript check |
| `pnpm test` | jest + react native testing library |
| `maestro test .maestro` | end-to-end smoke flow on a simulator build |
| `pnpm run assets` | regenerate app icons + splashes from `assets/themes.json` |
| `pnpm run build:ios` | eas production build |
| `pnpm run update` | publish an OTA update to the current branch's channel |

## stack

react native 0.81 · expo sdk 54 · react navigation 6 · ts · expo-secure-store

## releases & monitoring

- **ota updates:** run through eas (`production` and `preview` channels). updates download in the background and swap in on next launch (or force it via settings). app icons and the splash are native — they need a full rebuild.
- **error tracking:** drop `EXPO_PUBLIC_SENTRY_DSN` into `.env.local` to enable sentry. it tracks crash-free sessions and tags errors with the active ota update id.
- **dev-friendly:** monitoring is a safe no-op in dev mode or if keys are missing. 
- **source maps:** require `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` in your prod build environment.

## security

- **local only:** passwords live strictly in the ios keychain (`expo-secure-store`) and are read on demand. gradient stores nothing server-side.
- **nuclear option:** settings → delete account instantly wipes all keychain entries, cached grades, and local tasks from the device. your district HAC account remains untouched.
- **telemetry:** limited strictly to crash and performance diagnostics. completely anonymized, zero tracking.
- **backend:** uses our own [Go api](https://github.com/KingJayan/gradient-hac-api) ([docs](https://gradient-hac-api-docs.vercel.app)), a specialized fork of [HomeAccessCenterAPIv2](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2).

---

<div align="center">
<p>made with :) by jayan</p>
</div>
