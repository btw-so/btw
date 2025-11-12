//
//  Colors.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//  Design System - Color Palette
//

import SwiftUI

/// Locus app color palette with dark mode support
struct LocusColors {
    // MARK: - Brand Colors

    /// Primary brand color - Cyan/Teal accent
    static let appColor = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#00b4d5"),
        dark: SwiftUI.Color(hex: "#00d4ff")
    )

    // MARK: - Background Colors

    /// Primary background color
    static let backgroundPrimary = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#FBFBFB"),
        dark: SwiftUI.Color(hex: "#0a0a0a")
    )

    /// Surface color
    static let surfaceColor = SwiftUI.Color(
        light: .white,
        dark: SwiftUI.Color(hex: "#1a1a1a")
    )

    /// Secondary background color
    static let backgroundSecondary = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#F0F0F0"),
        dark: SwiftUI.Color(hex: "#252525")
    )

    // MARK: - Text Colors

    /// Primary text color for headings
    static let textPrimary = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#040402"),
        dark: SwiftUI.Color(hex: "#FAFAFA")
    )

    /// Body text color
    static let textBody = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#333333"),
        dark: SwiftUI.Color(hex: "#D0D0D0")
    )

    /// Secondary text color
    static let textSecondary = SwiftUI.Color(
        light: .gray,
        dark: SwiftUI.Color(hex: "#8A8A8A")
    )

    // MARK: - Border Colors

    /// Standard border color
    static let borderStandard = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#f3f4f6"),
        dark: SwiftUI.Color(hex: "#2a2a2a")
    )

    /// Very light border
    static let borderLight = SwiftUI.Color(
        light: SwiftUI.Color.gray.opacity(0.1),
        dark: SwiftUI.Color.gray.opacity(0.15)
    )

    /// Medium border
    static let borderMedium = SwiftUI.Color(
        light: SwiftUI.Color.gray.opacity(0.3),
        dark: SwiftUI.Color.gray.opacity(0.4)
    )

    /// Darker border
    static let borderDark = SwiftUI.Color(
        light: SwiftUI.Color.gray.opacity(0.5),
        dark: SwiftUI.Color.gray.opacity(0.6)
    )

    // MARK: - Interactive Colors

    /// Button background color
    static let buttonBackground = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#040402"),
        dark: SwiftUI.Color(hex: "#FAFAFA")
    )

    /// Button hover color
    static let buttonHover = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#1a1a1a"),
        dark: SwiftUI.Color(hex: "#E0E0E0")
    )

    /// Accent color
    static let accent = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#00b4d5"),
        dark: SwiftUI.Color(hex: "#00d4ff")
    )

    // MARK: - Highlight Colors

    /// Coral red for code highlighting
    static let codeHighlight = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#ec5c5c"),
        dark: SwiftUI.Color(hex: "#ff6b6b")
    )

    /// Yellow for text highlighting
    static let markHighlight = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#ffe066"),
        dark: SwiftUI.Color(hex: "#ffd93d")
    )

    // MARK: - Grid Pattern (Auth screens)

    /// Grid line color
    static let gridLine = SwiftUI.Color(
        light: SwiftUI.Color(hex: "#EEEEEE"),
        dark: SwiftUI.Color(hex: "#2a2a2a")
    )

    /// Clear color
    static let clear = SwiftUI.Color.clear
}

// MARK: - Color Extensions
extension SwiftUI.Color {
    /// Initialize Color from hex string
    /// - Parameter hex: Hex color string (e.g., "#FF0000" or "FF0000")
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

    /// Initialize Color with different values for light and dark mode
    /// - Parameters:
    ///   - light: Color for light mode
    ///   - dark: Color for dark mode
    init(light: SwiftUI.Color, dark: SwiftUI.Color) {
        #if os(macOS)
        self.init(nsColor: NSColor(light: NSColor(light), dark: NSColor(dark)))
        #else
        self.init(uiColor: UIColor(light: UIColor(light), dark: UIColor(dark)))
        #endif
    }
}

#if os(iOS)
// MARK: - UIColor Extension for Light/Dark Mode (iOS)
extension UIColor {
    /// Initialize UIColor with different values for light and dark mode
    /// - Parameters:
    ///   - light: Color for light mode
    ///   - dark: Color for dark mode
    convenience init(light: UIColor, dark: UIColor) {
        self.init { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return dark
            default:
                return light
            }
        }
    }
}
#endif

#if os(macOS)
// MARK: - NSColor Extension for Light/Dark Mode (macOS)
extension NSColor {
    /// Initialize NSColor with different values for light and dark mode
    /// - Parameters:
    ///   - light: Color for light mode
    ///   - dark: Color for dark mode
    convenience init(light: NSColor, dark: NSColor) {
        self.init(name: nil) { appearance in
            let appearanceName = appearance.bestMatch(from: [.darkAqua, .aqua]) ?? .aqua
            return appearanceName == .darkAqua ? dark : light
        }
    }
}
#endif
