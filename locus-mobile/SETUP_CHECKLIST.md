# Setup Checklist - Locus

## ✅ What's Already Done

- [x] React Native project created
- [x] NativeWind configured
- [x] Project structure created
- [x] All components implemented
- [x] All screens implemented
- [x] API service layer created
- [x] Auth context implemented
- [x] Storage utilities created
- [x] TypeScript types defined
- [x] Main App.tsx configured
- [x] Documentation written

## 🔧 What You Need to Do

### 1. Configure Backend URL
- [ ] Open `src/utils/constants.ts`
- [ ] Replace `'https://your-domain.com'` with your actual backend URL
- [ ] Save the file

### 2. Install Dependencies
```bash
cd /Users/siddharthagunti/Documents/code/btw/locus
npm install
```

### 3. Install iOS Pods
```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### 4. Verify Configuration
- [ ] Backend URL is correct
- [ ] All npm packages installed
- [ ] iOS pods installed successfully

### 5. Run the App
```bash
# Terminal 1 - Start Metro
npm start

# Terminal 2 - Run iOS
npm run ios
```

## 📱 First Run Testing

### Test 1: Quick Note (No Login)
- [ ] App loads successfully
- [ ] Quick Note button visible at bottom-right
- [ ] Tap button opens modal
- [ ] Type text in note
- [ ] Close modal
- [ ] Re-open - text persists
- [ ] Close app, re-open - text still there ✨

### Test 2: Login Flow
- [ ] Enter your email
- [ ] Tap "Send OTP"
- [ ] Receive email with 6-digit code
- [ ] Enter code digit by digit
- [ ] Auto-submits after 6th digit
- [ ] Successfully logged in
- [ ] Home screen appears

### Test 3: Browse Nodes
- [ ] See list of nodes on Home screen
- [ ] Tap search icon (🔍)
- [ ] Search modal opens
- [ ] Type search query
- [ ] See results
- [ ] Tap result to navigate

### Test 4: Node Details
- [ ] Tap any node from list
- [ ] Node detail screen opens
- [ ] See back arrow in header
- [ ] Check footer tabs appear correctly
- [ ] Tap tabs to switch views
- [ ] Tap back arrow to return

### Test 5: Nested Navigation
- [ ] From node detail, tap child node
- [ ] Goes deeper into hierarchy
- [ ] Tap back arrow
- [ ] Returns to previous node
- [ ] Continue backing out to Home

## 🐛 Troubleshooting

### If Metro won't start:
```bash
npm start -- --reset-cache
```

### If iOS build fails:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### If you see TypeScript errors:
```bash
npx tsc --noEmit
```

### If Quick Note doesn't save:
- Check AsyncStorage permissions
- Check console for errors
- This should work even offline!

### If API calls fail:
- Verify backend URL in `src/utils/constants.ts`
- Check backend is running
- Check backend has CORS enabled
- Check device fingerprint is being generated

## 📝 Notes

- **Quick Note**: Works 100% offline, no backend needed
- **Search Button**: Only shows after login
- **Footer Tabs**: Only show tabs with content
- **Collapsible Nodes**: Tap arrow icon (not the node text)
- **Navigation**: Stack-based, can go as deep as you want

## 🎨 Customization Ideas

After everything works, you can customize:

1. **Colors**: Edit StyleSheet in each component
2. **Icons**: Change emoji icons in NodeItem.tsx
3. **Fonts**: Add custom fonts to project
4. **Spacing**: Adjust padding/margin in styles
5. **Animations**: Add react-native-reanimated animations

## 📚 Documentation Files

- `README_LISTGO.md` - Full documentation
- `QUICK_START.md` - Quick start guide  
- `PROJECT_SUMMARY.md` - What was built
- `SETUP_CHECKLIST.md` - This file!

## ✨ You're All Set!

Once you complete the setup steps above, you'll have a fully functional iOS app that:

- ✅ Stores quick notes offline
- ✅ Authenticates via OTP
- ✅ Browses hierarchical nodes
- ✅ Searches content
- ✅ Displays notes and files
- ✅ Matches your existing app's design

**Estimated setup time: 10-15 minutes**

Happy building! 🚀
