<div align="center">
<h2><code>KingJayan/gradient</code></h2>
<p>minimalist ios app for viewing home access center (HAC) grades. react native + expo.</p>
</div>

> [!IMPORTANT]
> project & api still in early development, not expected to work

## features

- grades, GPA (weighted + unweighted), schedule, planner, transcript, attendance
- personal tasks merged with HAC assignments
- 6 dark themes
- creds stored in ios keychain, never on a server

## quick start

```bash
npm install
npm start         # press `i` for ios simulator
```

sign in with your district's HAC url, username, and password. four districts are preset; add more in [screens/login.tsx](screens/login.tsx).

## scripts

| command | what it does |
|---|---|
| `npm start` | expo dev server |
| `npm run ios` | ios simulator |
| `npm run lint` | eslint |
| `npm run type-check` | typescript check |
| `npm run build:ios` | eas production build |

## stack

react native 0.76 · expo sdk 52 · react navigation 6 · ts · expo-secure-store

see [claude.md](./CLAUDE.md) for arch and [deployment.md](./DEPLOYMENT.md) for shipping.

## security

passwords live only in the ios keychain (`expo-secure-store`), read on demand via `usecreds()`, never persisted in user json.

uses an [api](https://github.com/KingJayan/gradient-hac-api) written in Go; specialized clone of [nitheesh-cpu/HomeAccessCenterApiv2](https://github.com/nitheesh-cpu/HomeAccessCenterAPIv2) (MIT)
> deployments for both apis available on their github pages

---

<div align="center">
<p>made with :) by jayan</p>
</div>
