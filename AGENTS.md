# Mobile application guidance

This independent repository is the English-language Expo client for iOS and Android.
It uses TypeScript, React Native, and Expo SDK 58 with Expo Router. Routes live in
`src/app/`. Keep API access behind `src/api.ts`; the API is authoritative for
identity, permissions, and listing state. Client-side navigation or role checks
do not replace server authorization.

Keep public discovery usable without an account, use MMK only, and provide clear
loading, empty, validation, and API error states. Read `../SPEC.md` for product
behavior and `README.md` for local setup. The first release stays English-only.

Store the session token with `expo-secure-store` on native platforms. Do not put
passwords or tokens in source, logs, or `EXPO_PUBLIC_` variables.

## Expo SDK

Expo ships breaking changes between SDK releases. Before using an Expo, EAS, or
React Native API that is not already in this project, check the major version of
`expo` in `package.json` and the matching docs at
`https://docs.expo.dev/versions/v<major>.0.0/`.

- Add native modules with `npx expo install <package>` so the version matches this SDK.
- Keep navigation in Expo Router. Do not hand-edit generated `ios/` or `android/` directories.
- `npx expo start` runs the dev server. `npm run typecheck` checks TypeScript.
