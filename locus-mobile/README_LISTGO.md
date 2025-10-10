# Locus - React Native iOS App

A standalone React Native iOS app for managing hierarchical notes and lists with offline quick notes capability.

## Features

### 1. **Quick Note (Always Available - No Login Required)**
- Persistent floating button at the bottom of the screen
- Click to view/edit your current quick note
- Stored locally on device with no login required
- Perfect for capturing quick thoughts on the go

### 2. **Login System**
- Email-based OTP authentication
- No password required - magic code sent to email
- Secure fingerprint-based device identification

### 3. **Post-Login Features**
- **Search**: Search through your nodes using the search button
- **Hierarchical Nodes**: Browse and navigate through nested nodes
- **Node Details**: View node children, notes, and attached files
- **Collapsible Lists**: Expand/collapse nodes with children
- **Footer Tabs**: Switch between List/Note/File views for each node

## Tech Stack

- **React Native** (0.82.0)
- **TypeScript**
- **NativeWind** (Tailwind CSS for React Native)
- **AsyncStorage** (Local storage)
- **React Native Device Info** (Device fingerprinting)

## Project Structure

```
locus/
├── src/
│   ├── components/
│   │   ├── QuickNoteButton.tsx      # Floating quick note button
│   │   ├── SearchBar.tsx             # Search modal component
│   │   └── NodeItem.tsx              # Node list item component
│   ├── screens/
│   │   ├── LoginScreen.tsx           # OTP login screen
│   │   ├── HomeScreen.tsx            # Main nodes list screen
│   │   └── NodeDetailScreen.tsx      # Node detail with tabs
│   ├── contexts/
│   │   └── AuthContext.tsx           # Authentication context
│   ├── services/
│   │   └── api.ts                    # API service layer
│   ├── utils/
│   │   ├── constants.ts              # App constants
│   │   ├── storage.ts                # AsyncStorage utilities
│   │   └── deviceFingerprint.ts      # Device ID generation
│   └── types/
│       └── index.ts                  # TypeScript types
└── App.tsx                            # Main app entry point
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Xcode (for iOS development)
- CocoaPods
- React Native CLI

### Installation

1. **Install Dependencies**
   ```bash
   cd locus
   npm install
   ```

2. **Install iOS Pods**
   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

3. **Configure Backend URL**

   Edit `src/utils/constants.ts` and update the API base URL:
   ```typescript
   export const API_BASE_URL = 'https://your-domain.com';
   ```

4. **Run on iOS**
   ```bash
   npx react-native run-ios
   ```

   Or open in Xcode:
   ```bash
   open ios/locus.xcworkspace
   ```

## Configuration

### API Endpoints

The app connects to the following API endpoints (as documented in API_SPEC.md):

- `POST /otp/generate` - Generate OTP for email
- `POST /otp/validate` - Validate OTP and login
- `POST /list/get` - Get nodes list
- `GET /list/api/node/:nodeId` - Get node details
- `POST /list/search` - Search nodes
- `POST /list/api/note/create` - Create new note

### Storage Keys

Local storage uses the following keys:
- `@locus_quick_note` - Quick note content
- `@locus_user_email` - User email
- `@locus_user_fingerprint` - Device fingerprint
- `@locus_auth_token` - Auth token (if applicable)

## UI/UX Design Notes

The app follows the design patterns from your existing list app:

### Colors
- **Primary Text**: `#111827` (gray-900)
- **Secondary Text**: `#6B7280` (gray-500)
- **Borders**: `#F3F4F6` (gray-100) for light, `#D1D5DB` (gray-300) for inputs
- **Background**: `#FFFFFF` (white)
- **Accent/Buttons**: `#111827` (gray-900)

### Typography
- **Titles**: 28px, bold (700)
- **Subtitles**: 16px, regular (400)
- **Body Text**: 16px, regular (400)
- **Helper Text**: 14px, light (400)

### Spacing & Layout
- **Padding**: 24px for main containers
- **Border Radius**: 8px for buttons/inputs, 12px for modals
- **Border Width**: 1px for inputs, 2px for major sections

### Icons & Indicators
- 📝 for notes
- ✏️ for scribbles
- 📎 for files
- • for regular nodes
- › / ⌄ for collapsed/expanded states

## Usage

### Quick Note
1. Tap the "Quick Note" button at the bottom right
2. Type your note - it auto-saves as you type
3. Close the modal - your note is stored locally
4. No internet or login required!

### Login
1. Enter your email address
2. Tap "Send OTP"
3. Check your email for the 6-digit code
4. Enter the code (auto-submits when complete)
5. You're logged in!

### Browsing Nodes
1. After login, you'll see the Home screen with your nodes
2. Tap on any node to view its details
3. Use the search button (🔍) to find nodes quickly
4. Navigate into child nodes by tapping them

### Node Details
1. Each node shows up to 3 tabs at the bottom:
   - **List**: Child nodes (if any)
   - **Note**: Note content (if exists)
   - **File**: Attached file (if exists)
2. Tap tabs to switch between views
3. Use the back arrow (←) to return to previous screen

## Development

### Running in Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android (if needed)
npm run android
```

### Building for Production

```bash
# iOS
cd ios
xcodebuild -workspace locus.xcworkspace -scheme locus -configuration Release
```

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache and restart
npm start -- --reset-cache
```

### Pod Install Issues
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### TypeScript Errors
```bash
# Check TypeScript
npx tsc --noEmit
```

## Future Enhancements

- [ ] Offline mode with sync
- [ ] Rich text editor for notes
- [ ] File preview (PDF, images)
- [ ] Push notifications
- [ ] Dark mode
- [ ] iPad support
- [ ] Gestures (swipe to delete, long press)

## API Integration

The app is designed to work with your existing BTW List App backend. Make sure your backend:

1. Supports CORS for your mobile app origin
2. Returns proper authentication cookies
3. Implements all endpoints from API_SPEC.md
4. Has proper fingerprint validation

## License

Private - Internal Use Only

## Support

For issues or questions, check:
1. Console logs in Xcode/Metro
2. API response formats in API_SPEC.md
3. Network tab in React Native Debugger
