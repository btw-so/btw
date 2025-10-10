# Icon Options for Locus

## Current Setup
You already have `react-native-vector-icons` installed and configured!

## Icon Examples for Arrow

### Option 1: Ionicons (Recommended - Clean iOS look)
```tsx
import Icon from 'react-native-vector-icons/Ionicons';

// In your component:
<Icon
  name={isExpanded ? "chevron-down" : "chevron-forward"}
  size={20}
  color="#9CA3AF"
/>
```

### Option 2: MaterialIcons (Google Material Design)
```tsx
import Icon from 'react-native-vector-icons/MaterialIcons';

<Icon
  name={isExpanded ? "keyboard-arrow-down" : "keyboard-arrow-right"}
  size={20}
  color="#9CA3AF"
/>
```

### Option 3: FontAwesome
```tsx
import Icon from 'react-native-vector-icons/FontAwesome';

<Icon
  name={isExpanded ? "angle-down" : "angle-right"}
  size={20}
  color="#9CA3AF"
/>
```

### Option 4: FontAwesome5 (Modern)
```tsx
import Icon from 'react-native-vector-icons/FontAwesome5';

<Icon
  name={isExpanded ? "chevron-down" : "chevron-right"}
  size={16}
  color="#9CA3AF"
/>
```

## How to Use

1. Import the icon library at the top of `NodeItem.tsx`:
```tsx
import Icon from 'react-native-vector-icons/Ionicons';
```

2. Replace the Text arrow with Icon component:
```tsx
// OLD:
<Text style={[styles.arrow, !hasChildren && styles.arrowHidden]}>
  {isExpanded ? '⌄' : '›'}
</Text>

// NEW:
<Icon
  name={isExpanded ? "chevron-down" : "chevron-forward"}
  size={18}
  color={hasChildren ? "#9CA3AF" : "transparent"}
/>
```

## Icon Browser

To see all available icons, visit:
- **Ionicons**: https://ionic.io/ionicons
- **MaterialIcons**: https://fonts.google.com/icons
- **FontAwesome**: https://fontawesome.com/icons

## My Recommendation

Use **Ionicons** with `chevron-forward` / `chevron-down`:
- Clean, iOS-native look
- Perfectly aligned
- Scales well at different sizes
