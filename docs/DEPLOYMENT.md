# Deployment Guide

Complete guide for building and publishing the Digital Wardrobe app using Expo Application Services (EAS).

## Table of Contents

- [Prerequisites](#prerequisites)
- [EAS Setup](#eas-setup)
- [Environment Variables](#environment-variables)
- [Build Profiles](#build-profiles)
- [Building the App](#building-the-app)
- [Over-the-Air Updates](#over-the-air-updates)
- [Store Submission](#store-submission)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

| Account | Purpose | URL |
|---------|---------|-----|
| Expo | EAS builds & updates | https://expo.dev |
| Google Play | Android distribution | https://play.google.com/console |
| Apple Developer | iOS distribution | https://developer.apple.com |

### Required Software

```bash
# Install EAS CLI
npm install -g eas-cli

# Verify installation
eas --version
```

### Login to Expo

```bash
eas login
```

---

## EAS Setup

### Initialize Project

If not already configured:

```bash
eas init
```

This creates/updates `eas.json` and links to your Expo project.

### Current Configuration

**eas.json:**
```json
{
  "cli": {
    "version": ">= 16.32.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### App Configuration

**app.config.js** key settings:

```javascript
{
  owner: "coderwings",
  name: "digital-wardrobe",
  slug: "digital-wardrobe",
  version: "1.0.0",
  
  ios: {
    bundleIdentifier: "com.coderwings.digitalwardrobe",
    supportsTablet: true,
  },
  
  android: {
    package: "com.coderwings.digitalwardrobe",
  },
  
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  
  runtimeVersion: {
    policy: "appVersion",
  },
  
  updates: {
    url: process.env.EAS_UPDATES_URL,
  },
}
```

---

## Environment Variables

### Local Development

Create `.env` file:

```env
EAS_PROJECT_ID=your-project-id
EAS_UPDATES_URL=https://u.expo.dev/your-project-id
```

### EAS Secrets

For CI/CD, set secrets in EAS:

```bash
# Set a secret
eas secret:create --name EAS_PROJECT_ID --value "your-project-id"

# List secrets
eas secret:list

# Delete a secret
eas secret:delete --name SECRET_NAME
```

### Finding Your Project ID

1. Go to https://expo.dev
2. Select your project
3. Copy project ID from URL or settings

---

## Build Profiles

### Development Build

For development with Expo Dev Client:

```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios

# Both
eas build --profile development --platform all
```

**Features:**
- Development client included
- Debug tools available
- Internal distribution only

### Preview Build

For internal testing:

```bash
# Android
eas build --profile preview --platform android

# iOS
eas build --profile preview --platform ios
```

**Features:**
- Production-like build
- Internal distribution
- Good for QA testing

### Production Build

For store submission:

```bash
# Android (AAB for Play Store)
eas build --profile production --platform android

# iOS (IPA for App Store)
eas build --profile production --platform ios
```

**Features:**
- Optimized build
- Auto-incrementing version
- Ready for store submission

---

## Building the App

### Android Build

```bash
# Development (APK)
eas build --profile development --platform android

# Preview (APK)
eas build --profile preview --platform android

# Production (AAB)
eas build --profile production --platform android
```

### iOS Build

```bash
# Development
eas build --profile development --platform ios

# Preview (Ad Hoc)
eas build --profile preview --platform ios

# Production (App Store)
eas build --profile production --platform ios
```

### Build Options

```bash
# Non-interactive (for CI)
eas build --non-interactive --platform android

# Local build (requires Android Studio/Xcode)
eas build --local --platform android

# Clear cache
eas build --clear-cache --platform android
```

### Check Build Status

```bash
# List recent builds
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

### Download Build

After build completes:

1. Check email for download link
2. Or visit: https://expo.dev/accounts/[owner]/projects/[project]/builds
3. Or use CLI:
```bash
eas build:list --status finished
```

---

## Over-the-Air Updates

### How It Works

OTA updates push JavaScript changes without app store review:

1. User opens app
2. App checks for updates
3. Downloads update in background
4. Applies on next launch

### Publishing Updates

```bash
# Publish to preview channel
eas update --branch preview --message "Bug fixes"

# Publish to production
eas update --branch production --message "v1.0.1 hotfix"
```

### Update Channels

Configure in `app.config.js`:

```javascript
updates: {
  url: process.env.EAS_UPDATES_URL,
  requestHeaders: {
    "expo-channel-name": "preview",  // or "production"
  },
},
```

### Runtime Version Policy

```javascript
runtimeVersion: {
  policy: "appVersion",  // Updates tied to app version
},
```

**Policies:**
- `appVersion` - Match app version
- `nativeVersion` - Match native build
- `sdkVersion` - Match Expo SDK
- Custom string for manual control

### Check Update Status

```bash
# List updates
eas update:list

# View update details
eas update:view [UPDATE_ID]

# Rollback
eas update:rollback --branch preview
```

---

## Store Submission

### Google Play Store

#### Prerequisites

1. Google Play Developer account ($25 one-time)
2. App listing created in Play Console
3. AAB file from production build

#### Submit via EAS

```bash
# Configure submission
eas submit --platform android

# Or with build
eas build --profile production --platform android --auto-submit
```

#### Manual Submission

1. Build production AAB
2. Go to Play Console
3. Create new release
4. Upload AAB
5. Complete store listing
6. Submit for review

### Apple App Store

#### Prerequisites

1. Apple Developer account ($99/year)
2. App ID created in App Store Connect
3. IPA file from production build

#### Submit via EAS

```bash
# Configure submission
eas submit --platform ios

# Or with build
eas build --profile production --platform ios --auto-submit
```

#### Manual Submission

1. Build production IPA
2. Use Transporter app or `xcrun altool`
3. Complete App Store listing
4. Submit for review

### Submission Configuration

Add to `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"  // internal, alpha, beta, production
      },
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

---

## Troubleshooting

### Common Build Errors

#### "Invalid credentials"

```bash
# Re-login
eas logout
eas login
```

#### "Missing Android keystore"

```bash
# Generate new keystore
eas credentials
```

#### "iOS provisioning profile error"

```bash
# Sync credentials
eas credentials --platform ios
```

#### Build timeout

```bash
# Increase timeout or use larger instance
# Configure in eas.json:
{
  "build": {
    "production": {
      "resourceClass": "large"
    }
  }
}
```

### Debugging Builds

```bash
# View build logs
eas build:view [BUILD_ID]

# Download build artifacts
eas build:view [BUILD_ID] --json

# Local build for debugging
eas build --local --platform android
```

### Update Issues

#### "Update not applying"

1. Check runtime version matches
2. Verify channel name
3. Force refresh: close and reopen app
4. Check update status:
```bash
eas update:list --branch preview
```

#### "Incompatible update"

Native code changed - requires new build, not OTA update.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - run: npm install
      
      - run: eas build --platform android --non-interactive
```

### Environment Secrets

Set in GitHub repository settings:
- `EXPO_TOKEN` - From expo.dev account settings

---

## Best Practices

1. **Test preview builds** before production
2. **Use OTA updates** for JS-only changes
3. **New builds required** for native changes
4. **Version bump** for store updates
5. **Backup keystores** securely
6. **Monitor crash reports** after releases
7. **Staged rollouts** for production updates
