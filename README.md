# Digital Wardrobe

A clean, offline-first mobile app for managing your personal wardrobe. Built with React Native and Expo.

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)
![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

Digital Wardrobe helps you catalog and organize your clothing items with photos, categories, tags, and custom metadata. All data is stored locally on your device - no account required, no cloud sync, complete privacy.

## Features

- **Offline-First** - All data stored locally using SQLite
- **Photo Management** - Take photos or choose from library
- **Smart Search** - Search by name, category, tags, or metadata
- **Custom Metadata** - Add any key-value pairs (brand, size, color, etc.)
- **Tagging System** - Organize items with multiple tags
- **Dark/Light Mode** - System detection + manual override
- **Database Maintenance** - Cleanup, vacuum, integrity checks
- **Data Export** - Export all data as JSON backup
- **Test Data** - Load sample items for testing

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your device (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/digital-wardrobe.git
cd digital-wardrobe

# Install dependencies
npm install

# Start development server
npm start
```

### Running the App

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

Scan the QR code with Expo Go (Android) or Camera app (iOS) to run on your device.

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER_GUIDE.md) | How to use the app |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Setup, architecture, conventions |
| [Database](docs/DATABASE.md) | Schema, migrations, queries |
| [API Reference](docs/API_REFERENCE.md) | Functions, hooks, components |
| [Deployment](docs/DEPLOYMENT.md) | EAS build & publish |

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81 |
| Platform | Expo SDK 54 |
| Database | SQLite (expo-sqlite) |
| Navigation | React Navigation 7 |
| State | React Context |
| Styling | StyleSheet (dynamic themes) |
| Storage | AsyncStorage (preferences) |
| Images | expo-image-picker, expo-file-system |

## Project Structure

```
digital-wardrobe/
├── App.tsx                 # App entry point
├── src/
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts (Database, Theme)
│   ├── database/           # SQLite schema, migrations, queries
│   ├── data/               # Test data and loaders
│   ├── lib/                # Utilities (filesystem, logger)
│   ├── navigation/         # Navigation configuration
│   ├── screens/            # Screen components
│   └── types/              # TypeScript definitions
├── docs/                   # Documentation
├── assets/                 # Images and icons
└── app.config.js           # Expo configuration
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS device/simulator |
| `npm run web` | Run in web browser |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Expo](https://expo.dev/) - React Native platform
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [Unsplash](https://unsplash.com/) - Test data images
