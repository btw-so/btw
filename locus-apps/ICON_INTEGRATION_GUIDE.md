# Icon Integration Guide
## Migrating Web App Icons to Xcode Project

---

## Overview

This guide explains how to integrate the icons from your web app located at `../btw/locus/assets/media/` into your Xcode project for use across iOS, iPadOS, and macOS.

---

## Icon Inventory

### 1. Brand Icons (Primary App Identity)

**Location**: `../btw/locus/assets/media/brand/`

- `icon.svg` - Main brand icon (vector)
- `icon.png` - Rasterized version

**Location**: `../btw/locus/assets/media/images/`

- `btw-app-icon.png` - App icon used in login header
- `btw-app-logo.png` - Full logo with text
- `btw-logo.png` - Alternative logo variant

### 2. UI Icons (SVG)

**Location**: `../btw/locus/assets/media/icons/`

- `bell-o.svg` - Outline bell (notifications)
- `bell.svg` - Filled bell
- `bolt.svg` - Lightning/action icon
- `check-circle-o.svg` - Outline check circle
- `check-circle.svg` - Filled check circle
- `check.svg` - Simple checkmark
- `dot-circle-o.svg` - Outline dot (radio button)
- `exclamation-circle.svg` - Warning/alert
- `question-circle-o.svg` - Outline help
- `question-circle.svg` - Filled help
- `sign-in.svg` - Sign in icon
- `sign-out.svg` - Sign out icon
- `times-circle-o.svg` - Outline close circle
- `times-circle.svg` - Filled close circle
- `times.svg` - Simple X/close

### 3. Meta Icons (PWA/Favicon)

**Location**: `../btw/locus/assets/media/meta-icons/`

- `apple-touch-icon.png` - 180x180
- `favicon-16x16.png`
- `favicon-32x32.png`
- `icon-16x16.png`
- `icon-32x32.png`
- `icon-96x96.png`
- `icon-144x144.png`
- `icon-192x192.png`
- `icon-512x512.png`
- `safari-pinned-tab.svg`

---

## Integration Strategy

### A. App Icon (Required for All Platforms)

The app icon is displayed on the Home Screen (iOS), Launchpad (macOS), and App Store.

**Required Sizes**:
- iOS: 1024x1024 (App Store), 180x180, 120x120, 87x87, 80x80, 76x76, 60x60, 58x58, 40x40, 29x29, 20x20
- iPad: 1024x1024, 167x167, 152x152, 76x76, 40x40, 29x20
- macOS: 1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16

**Process**:

1. Use the highest resolution icon available: `icon-512x512.png` or `icon.svg`
2. If using SVG, convert to PNG at 1024x1024 using:
   - Online tool: https://cloudconvert.com/svg-to-png
   - Command line: `rsvg-convert -w 1024 -h 1024 icon.svg -o icon-1024.png`
   - Design tool: Open in Figma/Sketch/Illustrator, export at 1024x1024

3. Use online AppIcon generator:
   - **App Icon Generator**: https://www.appicon.co/
   - **MakeAppIcon**: https://makeappicon.com/
   - Upload 1024x1024 PNG, download complete icon set

4. In Xcode:
   - Navigate to `Assets.xcassets`
   - Select `AppIcon`
   - Drag and drop each size into corresponding slot
   - Ensure all platforms (iOS, iPad, Mac) are filled

### B. Brand Icons (In-App Usage)

Use the brand icon/logo within the app (splash screen, login header, about page).

**Method 1: Asset Catalog (Recommended)**

```bash
# Copy brand assets to Xcode project
cp ../btw/locus/assets/media/images/btw-app-icon.png /Users/siddharthagunti/Documents/code/locus/locus/Assets.xcassets/
cp ../btw/locus/assets/media/images/btw-app-logo.png /Users/siddharthagunti/Documents/code/locus/locus/Assets.xcassets/
cp ../btw/locus/assets/media/brand/icon.png /Users/siddharthagunti/Documents/code/locus/locus/Assets.xcassets/
```

**Steps**:
1. In Xcode, open `Assets.xcassets`
2. Right-click → New Image Set
3. Name it (e.g., "BrandIcon", "LogoMain")
4. Drag PNG files into 1x, 2x, 3x slots:
   - 1x: base size (e.g., 100x100)
   - 2x: 200x200 (for Retina)
   - 3x: 300x300 (for iPhone Plus/Pro Max)
5. Set "Render As": Original Image (to preserve colors)

**Usage in SwiftUI**:
```swift
Image("BrandIcon")
    .resizable()
    .scaledToFit()
    .frame(width: 60, height: 60)
```

**Method 2: SVG Support (iOS 13+, macOS 11+)**

```bash
# Copy SVG directly
cp ../btw/locus/assets/media/brand/icon.svg /Users/siddharthagunti/Documents/code/locus/locus/Assets.xcassets/
```

**Steps**:
1. In Xcode, create New Image Set
2. In Attributes Inspector, change "Scales" to "Single Scale"
3. Set "Types" to "SVG"
4. Drag SVG file into "All" slot
5. Check "Preserve Vector Data"

**Usage**:
```swift
Image("BrandIconSVG")
    .resizable()
    .scaledToFit()
    .frame(width: 60, height: 60)
```

### C. UI Icons (SVG → SF Symbols or SwiftUI Shapes)

You have two options for integrating the 15 custom UI icons:

#### Option 1: Convert SVG to SF Symbols (Best for consistency)

**Tools**:
- **SF Symbols App** (free from Apple): https://developer.apple.com/sf-symbols/
- Custom symbol import (requires SF Symbols 4+, macOS Monterey+)

**Process**:
1. Download SF Symbols app
2. File → Import Symbol Template
3. Open SVG in vector editor (Sketch, Illustrator, Figma)
4. Adjust to SF Symbol template guidelines (align to grid, set margins)
5. Export as `.svg` following SF Symbol specs
6. Import into Xcode via Assets.xcassets → New Symbol Set

**Usage**:
```swift
Image(systemName: "custom.bell.outlined")
    .font(.system(size: 20))
    .foregroundColor(.gray)
```

#### Option 2: Use SVG in Asset Catalog (Simpler, less flexible)

**Steps**:
```bash
# Copy all UI icons to asset catalog
for icon in ../btw/locus/assets/media/icons/*.svg; do
    cp "$icon" /Users/siddharthagunti/Documents/code/locus/locus/Assets.xcassets/Icons/
done
```

1. Create folder in Assets: Right-click → New Folder → "Icons"
2. For each SVG:
   - New Image Set (name without extension, e.g., "bell-o")
   - Single Scale, Preserve Vector Data
   - Drag SVG file

**Usage**:
```swift
Image("bell-o")
    .resizable()
    .frame(width: 20, height: 20)
    .foregroundColor(.gray)
```

#### Option 3: Use SF Symbols System Icons (Fastest)

Instead of importing custom SVGs, map to built-in SF Symbols:

```swift
let iconMapping: [String: String] = [
    "bell-o": "bell",
    "bell": "bell.fill",
    "bolt": "bolt.fill",
    "check-circle-o": "checkmark.circle",
    "check-circle": "checkmark.circle.fill",
    "check": "checkmark",
    "dot-circle-o": "circle",
    "exclamation-circle": "exclamation.circle.fill",
    "question-circle-o": "questionmark.circle",
    "question-circle": "questionmark.circle.fill",
    "sign-in": "arrow.right.square",
    "sign-out": "arrow.left.square",
    "times-circle-o": "xmark.circle",
    "times-circle": "xmark.circle.fill",
    "times": "xmark"
]

// Usage
Image(systemName: iconMapping["bell-o"]!)
    .font(.system(size: 20))
```

**Pros**: No asset management, perfect consistency, automatic Dark Mode support
**Cons**: Icons won't be pixel-perfect match to web app

---

## Recommended Integration Plan

### Phase 1: Essential Assets (Do First)

1. **App Icon**
   - Convert `icon.svg` or use `icon-512x512.png`
   - Generate all required sizes via AppIcon.co
   - Add to `AppIcon` in Assets.xcassets

2. **Brand Logo (for Login/Splash)**
   - Add `btw-app-icon.png` to Assets as "BrandIcon"
   - Provide 1x, 2x, 3x versions if available

### Phase 2: UI Icons (Choose One Approach)

**Recommended**: Use SF Symbols system icons with mapping (Option 3)
- Fastest implementation
- Best platform integration
- Automatic support for size classes, Dark Mode, accessibility

**Alternative**: Import custom SVGs to Assets (Option 2)
- If exact visual match to web is critical
- More manual asset management

### Phase 3: Additional Assets (As Needed)

- Logo variants for about screen, settings
- Custom illustrations
- Onboarding graphics

---

## Asset Organization in Xcode

```
Assets.xcassets/
├── AppIcon (folder)
│   └── [all app icon sizes]
├── Brand (folder)
│   ├── BrandIcon (image set)
│   ├── LogoMain (image set)
│   └── LogoText (image set)
└── Icons (folder) [only if using custom SVGs]
    ├── bell-o (image set)
    ├── bell (image set)
    ├── check (image set)
    └── ... [other icons]
```

---

## Quick Setup Commands

### Copy Essential Brand Assets

```bash
#!/bin/bash
# Run from Xcode project root

WEB_APP="../btw/locus/assets/media"
ASSETS="locus/Assets.xcassets"

# Create brand folder if it doesn't exist
mkdir -p "$ASSETS/Brand"

# Copy brand icon (you'll need to add this to Xcode manually)
cp "$WEB_APP/images/btw-app-icon.png" "$ASSETS/"

echo "✓ Brand assets copied"
echo "→ Now open Xcode and add btw-app-icon.png to Assets.xcassets"
echo "→ Create New Image Set called 'BrandIcon'"
echo "→ Drag btw-app-icon.png into the 1x slot"
```

### Generate App Icon Set

```bash
#!/bin/bash
# Convert SVG to 1024x1024 PNG for app icon generation

# If you have ImageMagick installed:
# convert -background none -density 300 ../btw/locus/assets/media/brand/icon.svg -resize 1024x1024 app-icon-1024.png

# If you have rsvg-convert (librsvg):
# rsvg-convert -w 1024 -h 1024 ../btw/locus/assets/media/brand/icon.svg -o app-icon-1024.png

echo "Upload app-icon-1024.png to https://www.appicon.co/"
echo "Download the generated icon set"
echo "Drag AppIcon.appiconset folder into Xcode Assets.xcassets"
```

---

## SwiftUI Helper for Icons

Create a reusable icon view component:

```swift
// File: locus/Views/Components/AppIcon.swift

import SwiftUI

struct AppIcon: View {
    let name: String
    var size: CGFloat = 20
    var color: Color = .gray

    // Map web icon names to SF Symbols
    private let iconMap: [String: String] = [
        "bell-o": "bell",
        "bell": "bell.fill",
        "bolt": "bolt.fill",
        "check-circle-o": "checkmark.circle",
        "check-circle": "checkmark.circle.fill",
        "check": "checkmark",
        "times": "xmark",
        "sign-in": "arrow.right.square",
        "sign-out": "arrow.left.square"
    ]

    var body: some View {
        if let sfSymbol = iconMap[name] {
            Image(systemName: sfSymbol)
                .font(.system(size: size))
                .foregroundColor(color)
        } else {
            // Fallback to custom asset if exists
            Image(name)
                .resizable()
                .frame(width: size, height: size)
                .foregroundColor(color)
        }
    }
}

// Usage
AppIcon(name: "bell-o", size: 24, color: .blue)
AppIcon(name: "check-circle", size: 20)
```

---

## Asset Guidelines

### DO:
- ✓ Use vector (SVG) when possible for scalability
- ✓ Provide @1x, @2x, @3x for raster images
- ✓ Use "Preserve Vector Data" for SVG assets
- ✓ Set "Render As: Original Image" for brand logos
- ✓ Organize assets in folders by category
- ✓ Use SF Symbols for system consistency

### DON'T:
- ✗ Use JPEG for icons (lossy compression)
- ✗ Mix different visual styles
- ✗ Forget to check Dark Mode appearance
- ✗ Hardcode icon sizes everywhere
- ✗ Use very large PNGs when SVG works

---

## Testing Icons

After integration, verify:

1. **All Platforms**: Build and run on iOS Simulator, iPad Simulator, macOS
2. **All Scales**: Test on different screen densities (@2x, @3x)
3. **Dark Mode**: Switch appearance in System Preferences/Settings
4. **Sizes**: Icons should be crisp at all sizes used in app
5. **App Icon**: Check Home Screen, Spotlight, Settings, App Switcher

---

## Next Steps

1. [ ] Generate 1024x1024 app icon from `icon.svg`
2. [ ] Use AppIcon.co to create full icon set
3. [ ] Add AppIcon set to Xcode Assets.xcassets
4. [ ] Add `btw-app-icon.png` as "BrandIcon" image set
5. [ ] Decide: SF Symbols (recommended) vs. custom SVG imports
6. [ ] Update SplashView to use BrandIcon
7. [ ] Update LoginView header to use BrandIcon
8. [ ] Test on all target platforms

---

**Estimated Time**: 30-45 minutes for full icon integration

**Tools Needed**:
- Xcode (already have)
- SVG to PNG converter (online or command line)
- AppIcon generator (https://www.appicon.co/)

**Web App Icon Location**: `../btw/locus/assets/media/`
**Xcode Assets Location**: `/Users/siddharthagunti/Documents/code/locus/locus/Assets.xcassets/`
