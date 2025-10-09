# Quick Start Guide - List-Go

## Installation (First Time)

```bash
# 1. Install dependencies
npm install

# 2. Install iOS dependencies
cd ios
bundle install
bundle exec pod install
cd ..

# 3. Configure your backend URL
# Edit src/utils/constants.ts and set your API URL
```

## Running the App

```bash
# Start Metro bundler (in one terminal)
npm start

# Run on iOS simulator (in another terminal)
npm run ios

# OR open in Xcode
open ios/listgo.xcworkspace
```

## Before First Run

**IMPORTANT**: Update your backend URL in `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = 'https://your-domain.com';
```

## First Time User Flow

1. App opens → Quick Note button is immediately visible
2. Tap Quick Note to test offline functionality
3. Enter email to login
4. Check email for OTP code
5. Enter OTP (auto-submits)
6. Browse your nodes!

## Testing Features

### Test Quick Note (No Login)
1. Tap "Quick Note" button
2. Type anything
3. Close modal
4. Tap again - your note persists!

### Test Search (After Login)
1. Login first
2. Tap search icon (🔍) in header
3. Type at least 2 characters
4. Results appear instantly

### Test Node Navigation
1. Tap any node from home
2. See child nodes (if any)
3. Switch tabs at bottom: List/Note/File
4. Tap child nodes to go deeper
5. Use back arrow (←) to go back

## Troubleshooting

**Metro bundler won't start?**
```bash
npm start -- --reset-cache
```

**iOS build fails?**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Can't connect to API?**
- Check src/utils/constants.ts has correct URL
- Check your backend is running
- Check backend has CORS enabled
- Check network logs in console

**Quick Note not saving?**
- This should always work - it's offline!
- Check console for AsyncStorage errors

## Development Tips

1. **Console Logs**: `npx react-native log-ios` in separate terminal
2. **Debug Menu**: Cmd+D (simulator) or shake (device)
3. **Reload**: Cmd+R
4. **TypeScript Check**: `npx tsc --noEmit`

## Common Issues

**Issue**: "Unable to boot simulator"
**Fix**: Open Xcode → Preferences → Locations → Command Line Tools

**Issue**: "No bundle URL present"
**Fix**: Make sure Metro is running (`npm start`)

**Issue**: "CocoaPods not installed"
**Fix**: `sudo gem install cocoapods`

## Next Steps

1. Customize colors in component StyleSheets
2. Add more icons/indicators
3. Implement file preview
4. Add offline sync
5. Add dark mode

Happy coding! 🚀
