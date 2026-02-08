# Developer Guide

Complete guide for developing and extending the Digital Wardrobe app.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [Code Conventions](#code-conventions)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Debugging](#debugging)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Expo CLI | Latest | Development tools |
| Git | Latest | Version control |

### Optional Tools

| Tool | Purpose |
|------|---------|
| VS Code | Recommended IDE |
| Android Studio | Android emulator |
| Xcode | iOS simulator (macOS only) |
| Expo Go | Run on physical device |

### Installation

```bash
# Install Node.js (use nvm recommended)
nvm install 18
nvm use 18

# Install Expo CLI globally
npm install -g expo-cli

# Install EAS CLI for builds
npm install -g eas-cli
```

---

## Project Setup

### Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/digital-wardrobe.git
cd digital-wardrobe

# Install dependencies
npm install

# Start development server
npm start
```

### Environment Setup

Create a `.env` file in the project root:

```env
EAS_PROJECT_ID=your-eas-project-id
EAS_UPDATES_URL=https://u.expo.dev/your-project-id
```

---

## Project Structure

```
digital-wardrobe/
├── App.tsx                     # Root component with providers
├── app.config.js               # Expo configuration
├── eas.json                    # EAS build configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── index.ts                    # Entry point
├── toastConfig.js              # Toast notification config
│
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── CustomDialog.tsx    # Cross-platform dialog
│   │   ├── EmptyState.tsx      # Empty list placeholder
│   │   ├── ErrorBoundary.tsx   # Error handling wrapper
│   │   ├── ImagePickerButton.tsx # Photo selection
│   │   └── LoadingScreen.tsx   # Loading indicator
│   │
│   ├── contexts/               # React Context providers
│   │   ├── DatabaseContext.tsx # Database state & operations
│   │   └── ThemeContext.tsx    # Theme state & colors
│   │
│   ├── database/               # SQLite database layer
│   │   ├── index.ts            # DB initialization & events
│   │   ├── migrations.ts       # Schema migrations
│   │   ├── queries.ts          # CRUD operations
│   │   ├── maintenance.ts      # Cleanup & maintenance
│   │   └── schema.ts           # Schema documentation
│   │
│   ├── data/                   # Static data & loaders
│   │   ├── testData.json       # Sample wardrobe items
│   │   └── testDataLoader.ts   # Test data functions
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── filesystem.ts       # Image file operations
│   │   └── logger.ts           # Logging utilities
│   │
│   ├── navigation/             # Navigation setup
│   │   └── AppNavigator.tsx    # Stack navigator config
│   │
│   ├── screens/                # Screen components
│   │   ├── HomeScreen/         # Main list view
│   │   ├── AddItemScreen/      # Add new item form
│   │   ├── ItemDetailsScreen/  # View/edit item
│   │   └── SettingsScreen/     # App settings
│   │
│   └── types/                  # TypeScript definitions
│       └── index.ts            # Shared types
│
├── assets/                     # Static assets
│   ├── icon.png                # App icon
│   ├── splash-icon.png         # Splash screen
│   └── adaptive-icon.png       # Android adaptive icon
│
└── docs/                       # Documentation
    ├── USER_GUIDE.md
    ├── DEVELOPER_GUIDE.md
    ├── DATABASE.md
    ├── API_REFERENCE.md
    └── DEPLOYMENT.md
```

---

## Architecture Overview

### App Structure

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                       │
│  ┌─────────────────────────────────────────┐    │
│  │           SafeAreaProvider               │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │         ErrorBoundary            │    │    │
│  │  │  ┌─────────────────────────┐    │    │    │
│  │  │  │   ActionSheetProvider   │    │    │    │
│  │  │  │  ┌─────────────────┐   │    │    │    │
│  │  │  │  │  ThemeProvider  │   │    │    │    │
│  │  │  │  │  ┌───────────┐  │   │    │    │    │
│  │  │  │  │  │ Database  │  │   │    │    │    │
│  │  │  │  │  │ Provider  │  │   │    │    │    │
│  │  │  │  │  │┌─────────┐│  │   │    │    │    │
│  │  │  │  │  ││AppContent││  │   │    │    │    │
│  │  │  │  │  │└─────────┘│  │   │    │    │    │
└──┴──┴──┴──┴──┴───────────┴──┴───┴────┴────┴────┘
```

### Data Flow

```
User Action
    │
    ▼
Screen Component
    │
    ▼
useDatabase() / useTheme()
    │
    ▼
Context (optimistic update)
    │
    ▼
Database Operations (queries.ts)
    │
    ▼
SQLite (expo-sqlite)
    │
    ▼
Event Emitter (dbEvents)
    │
    ▼
Context Refresh
    │
    ▼
UI Update
```

### Key Patterns

1. **Optimistic Updates** - UI updates immediately, rolls back on error
2. **Soft Delete** - Items marked deleted, not removed until vacuum
3. **Event-Driven Refresh** - Database events trigger UI updates
4. **Dynamic Styling** - Styles created with theme colors

---

## Running the App

### Development Server

```bash
# Start Expo dev server
npm start

# With cache clear
npx expo start --clear
```

### Platform-Specific

```bash
# Android (requires Android Studio or device)
npm run android

# iOS (requires Xcode, macOS only)
npm run ios

# Web browser
npm run web
```

### Using Expo Go

1. Install Expo Go on your phone
2. Run `npm start`
3. Scan QR code with:
   - Android: Expo Go app
   - iOS: Camera app

### Using Development Build

For features requiring native code:

```bash
# Build development client
eas build --profile development --platform android

# Install APK on device, then:
npm start
```

---

## Environment Variables

### Required for EAS

```env
# .env file
EAS_PROJECT_ID=your-project-id
EAS_UPDATES_URL=https://u.expo.dev/your-project-id
```

### Accessing in Code

Variables are loaded via `dotenv/config` in `app.config.js`:

```javascript
extra: {
  eas: {
    projectId: process.env.EAS_PROJECT_ID,
  },
},
```

---

## Code Conventions

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CustomDialog.tsx` |
| Screens | PascalCase/folder | `HomeScreen/index.tsx` |
| Utilities | camelCase | `filesystem.ts` |
| Types | PascalCase | `WardrobeItem` |

### Component Structure

```tsx
// 1. Imports
import React from 'react';
import { View, Text } from 'react-native';

// 2. Types
interface Props {
  title: string;
}

// 3. Component
export default function MyComponent({ title }: Props) {
  // Hooks
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // State
  const [value, setValue] = useState('');

  // Effects
  useEffect(() => {}, []);

  // Handlers
  const handlePress = () => {};

  // Render
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
}

// 4. Styles (dynamic)
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
});
```

### Database Operations

Always use the context methods for optimistic updates:

```tsx
// Good - uses optimistic update
const { addItemOptimistic } = useDatabase();
await addItemOptimistic(data);

// Avoid - bypasses optimistic update
import { addItem } from '../database/queries';
await addItem(data); // UI won't update immediately
```

---

## Adding New Features

### Adding a New Screen

1. **Create screen folder:**
```
src/screens/NewScreen/
├── index.tsx
└── styles.tsx
```

2. **Add to navigation types:**
```typescript
// src/types/index.ts
export type RootStackParamList = {
  // ... existing
  NewScreen: { param?: string };
};
```

3. **Add to navigator:**
```tsx
// src/navigation/AppNavigator.tsx
import NewScreen from '../screens/NewScreen';

<Stack.Screen
  name="NewScreen"
  component={NewScreen}
  options={{ title: 'New Screen' }}
/>
```

### Adding a Database Column

See [DATABASE.md](DATABASE.md) for migration guide.

### Adding a New Component

1. Create in `src/components/`
2. Use `useTheme()` for colors
3. Export as default

---

## Testing

### Manual Testing

1. Load test data from Settings
2. Test all CRUD operations
3. Test search with various queries
4. Test theme switching
5. Test on both iOS and Android

### Type Checking

```bash
# Run TypeScript compiler
npx tsc --noEmit
```

### Future: Unit Tests

```bash
# Test runner (not yet configured)
npm test
```

---

## Debugging

### Expo DevTools

Press in terminal:
- `j` - Open debugger
- `r` - Reload app
- `m` - Toggle menu

### React Native Debugger

1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug Remote JS"

### Database Debugging

Enable logging in development:
```typescript
// src/lib/logger.ts
// Logs prefixed with [db] and [ui] in development mode
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Metro bundler error | `npx expo start --clear` |
| Module not found | `rm -rf node_modules && npm install` |
| Build failed | Check `eas.json` configuration |
| SQLite error | Check migration version |

---

## Performance Tips

1. **Memoize expensive computations** - Use `useMemo` for filtered lists
2. **Optimize images** - Compress before saving
3. **Batch database operations** - Use transactions
4. **Lazy load screens** - Already handled by React Navigation
5. **Use FlatList** - For long lists with virtualization
