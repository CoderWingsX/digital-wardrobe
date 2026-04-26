# Deployment Guide

Guide for building and testing the app using Expo Application Services (EAS).

## Table of Contents

- [Prerequisites](#prerequisites)
- [EAS Setup](#eas-setup)
- [Environment Variables](#environment-variables)
- [Building the App](#building-the-app)
- [Installing on Device](#installing-on-device)
- [Over-the-Air Updates](#over-the-air-updates)

---

## Prerequisites

### Required

- Expo account (free): https://expo.dev
- EAS CLI installed:

```bash
npm install -g eas-cli
eas login
```

---

## EAS Setup

### Initialize (if needed)

```bash
eas init
```

### Current Build Profiles

**eas.json:**

```json
{
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
  }
}
```

| Profile       | Use Case                    |
| ------------- | --------------------------- |
| `development` | Dev client with debug tools |
| `preview`     | Testing (recommended)       |
| `production`  | Release-ready build         |

---

## Environment Variables

Create `.env` file:

```env
EAS_PROJECT_ID=your-project-id
EAS_UPDATES_URL=https://u.expo.dev/your-project-id
```

Find your project ID at https://expo.dev → Your Project → Settings

---

## Building the App

### Preview Build (Recommended for Testing)

```bash
# Android APK
eas build --profile preview --platform android

# iOS (requires Apple Developer account)
eas build --profile preview --platform ios
```

### Development Build

For development with hot reload:

```bash
eas build --profile development --platform android
```

### Check Build Status

```bash
eas build:list
```

---

## Installing on Device

### Android

1. Build completes → get download link from terminal or expo.dev
2. Download APK to phone
3. Install (may need to enable "Install from unknown sources")

### iOS

Requires Apple Developer account for device installation.

---

## Over-the-Air Updates

Push JavaScript changes without rebuilding:

```bash
# Push update to preview channel
eas update --branch preview --message "Description of changes"
```

**Note:** OTA updates only work for JS changes. Native changes (new packages, app.config changes) require a new build.

### Check Updates

```bash
eas update:list
```

---

## Quick Reference

```bash
# Build for testing
eas build --profile preview --platform android

# Push JS update
eas update --branch preview --message "Bug fix"

# Check builds
eas build:list

# Check updates
eas update:list
```
