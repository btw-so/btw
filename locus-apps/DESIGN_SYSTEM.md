# Locus Design System Documentation
## Multi-Platform iOS/iPadOS/macOS Design Guidelines

---

## 1. COLOR PALETTE

### Primary Colors

```swift
// Primary Brand Color
let appColor = Color(hex: "#00b4d5") // Cyan/Teal accent

// Background Colors
let backgroundColor = Color(hex: "#FBFBFB") // Off-white background
let surfaceColor = Color.white

// Text Colors
let primaryText = Color(hex: "#040402") // Very dark gray-black (headings)
let bodyText = Color(hex: "#333333") // Dark gray (body text)
let secondaryText = Color.gray // System gray for secondary text

// Border Colors
let borderLight = Color.gray.opacity(0.1) // Very light border
let borderMedium = Color.gray.opacity(0.3) // Medium border
let borderDark = Color.gray.opacity(0.5) // Darker border

// Interactive Colors
let buttonBackground = Color(hex: "#040402") // Dark button background
let buttonHover = Color(hex: "#1a1a1a") // Slightly lighter on hover

// Code & Highlighting
let codeHighlight = Color(hex: "#ec5c5c") // Coral red for code
let markHighlight = Color(hex: "#ffe066") // Yellow for text highlighting
```

### Grid Background Pattern (Login/Auth screens)
```swift
// Used in Login screen
let gridLineColor = Color(hex: "#EEEEEE")
let gridSize: CGFloat = 32 // 32x32 grid
```

---

## 2. TYPOGRAPHY

### Font Family Hierarchy

**Primary Font Stack:**
```swift
// System fonts (native to Apple platforms)
.font(.system(.body, design: .default))

// Priority order:
// 1. SF Pro Text (iOS/macOS system font - default)
// 2. SF Pro Display (for larger sizes)
// 3. Fallback to system

// DO NOT use custom fonts initially - leverage Apple's SF Pro family
// which provides excellent readability across all platforms
```

### Font Sizes & Weights

```swift
// Display & Headings
.font(.system(size: 48, weight: .bold))      // Large Title (Welcome screens) - web: text-5xl
.font(.largeTitle)                            // ~34pt (Main headings) - web: text-2xl
.font(.title)                                 // ~28pt (Section titles) - web: text-xl
.font(.title2)                                // ~22pt (Subsections) - web: text-lg
.font(.title3)                                // ~20pt (Card headers) - web: text-base

// Body Text
.font(.body)                                  // ~17pt (Primary body text) - web: text-md
.font(.callout)                               // ~16pt (Secondary content)
.font(.subheadline)                           // ~15pt (Supporting text)
.font(.footnote)                              // ~13pt (Captions)
.font(.caption)                               // ~12pt (Small labels) - web: text-xs

// Font Weights
.fontWeight(.bold)                            // 700 - headings
.fontWeight(.medium)                          // 500 - emphasis
.fontWeight(.regular)                         // 400 - body text
```

### Responsive Font Sizing

```swift
// Adapt based on device/window size
func adaptiveFont(geometry: GeometryProxy, largeSize: CGFloat, smallSize: CGFloat) -> Font {
    geometry.size.width > 600
        ? .system(size: largeSize, weight: .bold)
        : .system(size: smallSize, weight: .bold)
}

// Example usage:
// iPad/Mac: 48pt, iPhone: 34pt for main titles
```

---

## 3. SPACING & PADDING

### Standard Spacing Scale (Tailwind-based)

```swift
// SwiftUI Spacing Values (matching web app's Tailwind scale)
let spacing = [
    "xs": 2,      // 2pt
    "sm": 4,      // 4pt
    "md": 8,      // 8pt   (default small gap)
    "lg": 12,     // 12pt
    "xl": 16,     // 16pt  (standard padding)
    "2xl": 20,    // 20pt
    "3xl": 24,    // 24pt
    "4xl": 32,    // 32pt  (section spacing)
    "5xl": 48,    // 48pt  (large gaps)
]
```

### Common Padding Patterns

```swift
// Login Screen Patterns
.padding()                              // 16pt default
.padding(.horizontal)                   // 16pt left/right only
.padding(.vertical, 20)                 // 20pt top/bottom
.padding(.top, 8)                       // 8pt top only

// Component Spacing (from web Login)
VStack(spacing: 16) { }                 // Between form elements
VStack(spacing: 20) { }                 // Between sections
VStack(spacing: 4) { }                  // Tight grouping

// Container Max Widths
.frame(maxWidth: 600)                   // Max width for forms (iPad/Mac)
.frame(maxWidth: 400)                   // Constrained inputs (iPad/Mac)
```

### Layout Patterns from Web App

```swift
// Login Header
.padding(.horizontal, 16)               // Container padding
.padding(.vertical, 24)                 // py-6 (6 * 4 = 24pt)

// Main Content Container
.padding(.horizontal, 32)               // px-8 (8 * 4 = 32pt)
.padding(.vertical, 24)                 // py-6

// Button Padding
.padding(.horizontal, 16)               // px-4
.padding(.vertical, 8)                  // py-2

// Form Elements
.padding(.bottom, 32)                   // mb-8 (large bottom margin)
.padding(.bottom, 16)                   // mb-4 (medium bottom margin)
.padding(.bottom, 8)                    // mb-2 (small bottom margin)
```

---

## 4. BORDER RADIUS & SHAPES

```swift
// Border Radius Values
let cornerRadius = [
    "sm": 4,      // Small elements
    "md": 8,      // Standard inputs, cards - matches web rounded-lg
    "lg": 12,     // Larger components
    "xl": 16,     // Hero cards
    "full": .infinity  // Pills/circles (like button variants)
]

// Common Usage
.cornerRadius(8)                        // Standard (inputs, buttons)
.cornerRadius(12)                       // Cards
.cornerRadius(4)                        // Small chips

// Button Variants (from theme.ts)
// Large button: borderRadius 28pt, padding [12, 28]
// XL button: borderRadius 32pt, padding [14, 32]
```

---

## 5. COMPONENT SPECIFICATIONS

### A. Login Screen Components

#### Welcome Header
```swift
VStack(spacing: 16) {
    Text("Welcome to\nLocus")
        .font(isLarge ? .system(size: 48, weight: .bold) : .largeTitle)
        .fontWeight(.bold)
        .multilineTextAlignment(.leading)  // text-left in web
        .padding(.bottom, 8)               // mb-4

    Text("You are one step away to write...")
        .font(isLarge ? .title2 : .body)
        .foregroundColor(Color.gray)       // text-gray-700
        .multilineTextAlignment(.center)
        .padding(.horizontal)
        .frame(maxWidth: 600)
}
```

#### Email Input Field
```swift
TextField("Email", text: $email)
    .padding(.horizontal, 12)              // px-3
    .padding(.vertical, 8)                 // py-2
    .background(Color.clear)               // bg-transparent
    .overlay(
        RoundedRectangle(cornerRadius: 8)
            .stroke(Color.gray.opacity(0.5), lineWidth: 1)  // border-gray-500
    )
    .font(.body)                          // text-md
    .foregroundColor(Color(hex: "#040402"))  // text-gray-900
```

#### OTP Input Fields
```swift
// Each OTP digit box
TextField("", text: $digit)
    .multilineTextAlignment(.center)
    .font(.system(size: 24))              // text-2xl
    .frame(width: 48, height: 48)         // w-12 h-12 (12 * 4 = 48pt)
    .background(Color.clear)              // bg-transparent
    .cornerRadius(8)                      // rounded-lg
    .overlay(
        RoundedRectangle(cornerRadius: 8)
            .stroke(Color.gray.opacity(0.3), lineWidth: 1)  // border-gray-300
    )

// Spacing between OTP fields
HStack(spacing: 8) { }                    // mr-2 on mobile
HStack(spacing: 16) { }                   // sm:mr-4 on larger screens
```

#### Primary Button
```swift
Button(action: sendOTP) {
    HStack {
        if isLoading {
            ProgressView()
                .frame(width: 20, height: 20)  // h-5 w-5
                .padding(.trailing, 12)        // mr-3
        }
        Text(isLoading ? "Sending OTP..." : "Send OTP")
            .fontWeight(.bold)
    }
    .frame(maxWidth: 400)
    .padding(.horizontal, 16)              // px-4
    .padding(.vertical, 8)                 // py-2
    .background(Color(hex: "#040402"))     // bg-gray-900
    .foregroundColor(.white)
    .cornerRadius(8)                       // rounded
}
.disabled(isLoading || email.isEmpty)
// Hover state: bg-gray-800 (use .onHover on macOS)
```

### B. Background Pattern (Grid)

```swift
// Grid background for auth screens
ZStack {
    Color(hex: "#FBFBFB")

    // Vertical lines
    Path { path in
        let spacing: CGFloat = 32
        for x in stride(from: 0, to: width, by: spacing) {
            path.move(to: CGPoint(x: x, y: 0))
            path.addLine(to: CGPoint(x: x, y: height))
        }
    }
    .stroke(Color(hex: "#EEEEEE"), lineWidth: 1)

    // Horizontal lines
    Path { path in
        let spacing: CGFloat = 32
        for y in stride(from: 0, to: height, by: spacing) {
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: width, y: y))
        }
    }
    .stroke(Color(hex: "#EEEEEE"), lineWidth: 1)
}
.edgesIgnoringSafeArea(.all)
```

### C. Sidebar (for main app)

```swift
// Sidebar dimensions
let sidebarWidth: CGFloat = 256          // w-64 (64 * 4 = 256pt)
let sidebarCollapsedWidth: CGFloat = 48  // w-12 (12 * 4 = 48pt)

// Sidebar styling
.frame(width: isSidebarCollapsed ? 48 : 256)
.padding(isSidebarCollapsed ? 0 : 16)    // p-4 when expanded
.background(Color(hex: "#FBFBFB"))
.overlay(
    Rectangle()
        .stroke(Color.gray.opacity(0.1), lineWidth: 2)
        .frame(maxWidth: .infinity, alignment: .trailing)
)

// Sidebar icons
Image(systemName: "house")
    .foregroundColor(.gray.opacity(0.4))  // text-gray-400
    .font(.system(size: 20))

// Hover effect for icons
.foregroundColor(isHovered ? .gray.opacity(0.7) : .gray.opacity(0.4))
```

---

## 6. ANIMATIONS & TRANSITIONS

```swift
// Standard easing from theme.ts
let customEasing = Animation.timingCurve(0.35, 0.01, 0.77, 0.34)

// Splash screen fade
.opacity(isActive ? 0 : 1)
.animation(.easeOut(duration: 0.5), value: isActive)

// Sidebar collapse/expand
.animation(.spring(response: 0.3, dampingFraction: 0.8), value: isSidebarCollapsed)

// Standard transition duration
let transitionDuration: TimeInterval = 0.3  // duration-300
```

---

## 7. ICON SYSTEM

### Icon Sources

1. **SF Symbols** (Primary for native feel)
   - Use for common UI elements (house, settings, search, etc.)
   - Size: 16-24pt typically
   - Weight: regular or medium

2. **Custom SVG Icons** (Brand consistency)
   - Located in: `/assets/media/icons/`
   - Convert SVG to SF Symbol or use SwiftUI Path
   - Brand icon: `/assets/media/brand/icon.svg`

### Common Icons Mapping (Web → Native)

```swift
// Remix Icon → SF Symbols mapping
"ri-home-7-line"      → "house"
"ri-settings-3-line"  → "gearshape"
"ri-search-line"      → "magnifyingglass"
"ri-side-bar-fill"    → "sidebar.left"
"bell-o"              → "bell"
"check-circle"        → "checkmark.circle"
"times"               → "xmark"
```

### Icon Sizes

```swift
let iconSize = [
    "sm": 16,
    "md": 20,     // Default web icon size
    "lg": 24,
    "xl": 32,
]

// Usage
Image(systemName: "house")
    .font(.system(size: 20))  // or .font(.body) for 17pt
```

---

## 8. RESPONSIVE BREAKPOINTS

```swift
// Device-based responsive design
enum DeviceSize {
    case phone      // width < 600pt
    case tablet     // 600pt ≤ width < 1024pt
    case desktop    // width ≥ 1024pt
}

// Conditional sizing example
let spacing = geometry.size.width > 600 ? 16 : 8
let fontSize = geometry.size.width > 600 ? 48 : 34

// Platform-specific adjustments
#if os(iOS)
    // iPhone/iPad specific
#elseif os(macOS)
    // macOS specific - larger clickable areas
#endif
```

---

## 9. ACCESSIBILITY

### Text Contrast
- All text must meet WCAG AA standards
- Primary text (#040402) on white: 19.8:1 ratio ✓
- Body text (#333333) on white: 12.6:1 ratio ✓
- Gray text for secondary only, not primary content

### Dynamic Type Support
```swift
// Use system fonts that scale with user preferences
.font(.body)  // Scales automatically
.font(.title) // Scales automatically

// For custom sizes, use:
@ScaledMetric var fontSize: CGFloat = 17
```

### Touch Targets
```swift
// Minimum touch target: 44x44pt (Apple HIG)
.frame(minWidth: 44, minHeight: 44)

// OTP inputs: 48x48pt (good)
// Sidebar icons when collapsed: ensure 44pt minimum
```

---

## 10. PLATFORM-SPECIFIC CONSIDERATIONS

### iOS
- Use safe area insets (respect notch/home indicator)
- Bottom sheet modals for secondary actions
- Swipe gestures for navigation
- Tab bar at bottom for main navigation

### iPadOS
- Sidebar on left (collapsible)
- Larger tap targets and spacing
- Split view support consideration
- Keyboard shortcuts support

### macOS
- Traffic lights (window controls) clear space
- Hover states for all interactive elements
- Menu bar integration
- Keyboard-first navigation support
- Larger window sizes (min 800x600)

---

## 11. COMPONENT LIBRARY CHECKLIST

When building each component, ensure:

- [ ] Colors match hex values from web app
- [ ] Spacing follows 4pt/8pt grid system
- [ ] Font sizes map to web equivalent
- [ ] Corner radius matches design system
- [ ] Hover states implemented (macOS)
- [ ] Loading states designed
- [ ] Error states designed
- [ ] Empty states designed
- [ ] Dark mode support (future consideration)
- [ ] Accessibility labels added
- [ ] Keyboard navigation works (macOS/iPadOS)
- [ ] Responsive across all target devices

---

## 12. HELPER EXTENSIONS

```swift
// Color from hex string
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// Conditional view modifier
extension View {
    @ViewBuilder func `if`<Transform: View>(
        _ condition: Bool,
        transform: (Self) -> Transform
    ) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

// Hover state (macOS)
extension View {
    func onHoverChange(_ action: @escaping (Bool) -> Void) -> some View {
        #if os(macOS)
        return self.onHover(perform: action)
        #else
        return self
        #endif
    }
}
```

---

## 13. DESIGN PRINCIPLES

1. **Simplicity First**: Clean, minimal UI with focus on content
2. **Consistency**: Use system components when possible for native feel
3. **Responsive**: Adapt gracefully from iPhone to Mac
4. **Fast**: Optimize animations, use lazy loading
5. **Accessible**: Support Dynamic Type, VoiceOver, keyboard navigation
6. **Delightful**: Subtle animations, polished micro-interactions

---

## IMPLEMENTATION PRIORITY

### Phase 1: Foundation
- [x] Design system documentation
- [ ] Color + Typography helpers
- [ ] Spacing constants
- [ ] Icon asset preparation

### Phase 2: Authentication
- [ ] Splash screen with brand icon
- [ ] Login screen (email + OTP)
- [ ] Background grid pattern
- [ ] Loading states

### Phase 3: Main App
- [ ] Sidebar navigation
- [ ] List/notes view
- [ ] Editor integration
- [ ] Settings screen

---

**Last Updated**: October 26, 2025
**Version**: 1.0
**Platforms**: iOS 16+, iPadOS 16+, macOS 13+
