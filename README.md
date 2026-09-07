# Din & Donya

A mobile task and goal-management application with an API server, an internal AI service, and an Expo app. It works as a standard task manager, with optional Groq integration for AI-powered features.

## Live deployment

| Service | URL |
| --- | --- |
| Backend API | [deen-w-donia.onrender.com](https://deen-w-donia.onrender.com) |
| AI service | [deen-w-donia-ai.onrender.com](https://deen-w-donia-ai.onrender.com) |
| Android APK | [Download the latest Expo build](https://expo.dev/accounts/ammarelmihy/projects/deen-w-donya/builds/4cf2296a-c42f-40c0-9d65-72723a545751) |

The Android APK is available from the Expo build page. Install it on an Android device to use the released mobile app.

## Project structure

| Path | Description |
| --- | --- |
| `server` | Node.js API server and MongoDB integration |
| `ai-service` | Internal Python AI service |
| `mobile` | Expo / React Native mobile application |

## Requirements

- Node.js 18 or later
- Docker and Docker Compose
- Python 3.10 or later
- A physical device or emulator for the mobile app
- A Groq account for optional AI features

## Run locally

### 1. Configure environment variables

Copy the example files to create the local environment files:

```bash
Copy-Item server/.env.example server/.env
Copy-Item ai-service/.env.example ai-service/.env
Copy-Item mobile/.env.example mobile/.env
```

On macOS or Linux, use `cp` instead of `Copy-Item`.

Replace the placeholder values in `server/.env` before use, especially the JWT secrets and encryption key. `AI_SERVICE_SECRET` must have the same value in both `server/.env` and `ai-service/.env`.

To run the app on a physical device, update `mobile/.env` with your computer's LAN IP address:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000/api/v1
```

Find the address with `ipconfig` on Windows or `ifconfig` on macOS/Linux.

For a release build that connects to the deployed API, use the Render URL instead:

```env
EXPO_PUBLIC_API_URL=https://deen-w-donia.onrender.com/api/v1
```

### 2. Start the API and AI service

From the project root:

```bash
docker-compose up -d --build
```

Check that both services are running:

- Node API: `http://localhost:4000/health`
- AI service: `http://localhost:8000/health`

To run the API server locally without Docker during development:

```bash
cd server
npm run dev
```

### 3. Start the mobile app

```bash
cd mobile
npx expo start
```

Install Expo Go on your phone, then scan the QR code shown in the terminal. Make sure the phone and computer are on the same network and that `EXPO_PUBLIC_API_URL` points to the correct LAN IP address.

## Build an Android APK

From the `mobile` directory:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Create or update `eas.json` with an APK build profile:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Then start the build:

```bash
eas build --platform android --profile preview
```

When the build is complete, EAS provides a download link for the APK.

## AI features

To enable Smart Add, progress analysis, and complex-goal breakdowns:

1. Create an API key in the [Groq Console](https://console.groq.com/keys).
2. Open the app and go to **Settings**.
3. Select **Connect Groq Key** and enter the key.

The key is encrypted on the server and is never stored as plain text. It is not required if you only want to use the app for task management.

## Password recovery

- From the sign-in screen, select **Forgot password?**, enter your email, then enter the six-digit code and your new password. The code expires after 15 minutes.
- To change your password while signed in, go to **Settings → Security → Change password**.

> In development only, the server prints the reset code in the terminal. For production, add the following Resend settings to `server/.env`:

```env
RESEND_API_KEY=re_xxxxxxxxx
PASSWORD_RESET_FROM="Din & Donya <support@your-domain.com>"
```
