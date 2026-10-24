# Property Portal Mobile App

The iOS and Android client for discovering properties for sale or rent and using marketplace account workflows. It is a standalone Expo and TypeScript project that communicates with the Property Portal API over HTTP.

## Requirements

- Node.js and npm
- The Property Portal API running locally for live data
- Expo SDK 58 tooling, installed with this project
- Xcode Simulator, an Android emulator, or Expo Go with SDK 58 support

## Local development

Start the API first. From this directory:

```sh
npm install
npm start
```

Expo prints a QR code and simulator shortcuts. The app uses `http://127.0.0.1:4000/api/v1` on iOS and web, and `http://10.0.2.2:4000/api/v1` on the Android emulator. Set `EXPO_PUBLIC_API_URL` when the API is somewhere else, then restart Expo. See `.env.example`.

The API listens on `127.0.0.1` by default. A phone on the same network cannot reach that address until the API is started with `HOST=0.0.0.0` and `EXPO_PUBLIC_API_URL` points at the computer's LAN address, for example `http://192.168.1.20:4000/api/v1`.

Native iOS and Android builds call the API directly. Expo web is a browser app, so the API must allow its origin through `WEB_ORIGIN`, for example `http://localhost:8081`, or a comma-separated list that also includes the web app.

For local role-based walkthroughs, seed the API using its README (in the coordinated workspace, see [`../api/README.md`](../api/README.md)). In development builds, the sign-in screen offers the seeded accounts. You can also register a buyer/renter, owner, or authorized agent account in the app.

## Available commands

- `npm start` — start the Expo development server.
- `npm run ios` — open the app in the iOS Simulator.
- `npm run android` — open the app in an Android emulator.
- `npm run web` — run the same client in a browser.
- `npm run typecheck` — run the TypeScript project checks.

The mobile app is a standalone project with its own dependencies and Git history. When working in the full Property Portal workspace, the coordination root's `SPEC.md` describes the shared product behavior. This README contains the setup and run commands needed for local mobile development.
