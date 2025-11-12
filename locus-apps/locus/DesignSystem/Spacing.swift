//
//  Spacing.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//  Design System - Spacing & Layout
//

import SwiftUI

// MARK: - Spacing Constants

/// Standard spacing scale (4pt/8pt grid system)
enum Spacing {
    /// 1pt - Extra extra small spacing
    static let xxs: CGFloat = 1

    /// 2pt - Extra small spacing
    static let xs: CGFloat = 2

    /// 4pt - Small spacing
    static let sm: CGFloat = 4

    /// 8pt - Medium spacing (default small gap)
    static let md: CGFloat = 8

    /// 12pt - Large spacing
    static let lg: CGFloat = 12

    /// 16pt - Extra large spacing (standard padding)
    static let xl: CGFloat = 16

    /// 20pt - 2XL spacing
    static let xxl: CGFloat = 20

    /// 24pt - 3XL spacing
    static let xxxl: CGFloat = 24

    /// 32pt - 4XL spacing (section spacing)
    static let xxxxl: CGFloat = 32

    /// 48pt - 5XL spacing (large gaps)
    static let xxxxxl: CGFloat = 48
}

// MARK: - Corner Radius Constants

/// Border radius values
enum CornerRadius {
    /// 4pt - Small elements
    static let sm: CGFloat = 4

    /// 8pt - Standard inputs, cards
    static let md: CGFloat = 8

    /// 12pt - Larger components
    static let lg: CGFloat = 12

    /// 16pt - Hero cards
    static let xl: CGFloat = 16

    /// Full rounded (pills/circles)
    static let full: CGFloat = .infinity
}

// MARK: - Layout Constants

/// Layout dimension constants
enum Layout {
    /// Sidebar width when expanded (256pt)
    static let sidebarWidth: CGFloat = 256

    /// Sidebar width when collapsed (48pt)
    static let sidebarCollapsedWidth: CGFloat = 48

    /// Grid background size (32x32)
    static let gridSize: CGFloat = 32

    /// Responsive breakpoint (600pt)
    static let breakpointTablet: CGFloat = 600

    /// Desktop breakpoint (1024pt)
    static let breakpointDesktop: CGFloat = 1024

    /// Max width for forms (600pt)
    static let maxFormWidth: CGFloat = 600

    /// Max width for constrained inputs (400pt)
    static let maxInputWidth: CGFloat = 400
}

// MARK: - Icon Sizes

/// Icon size constants
enum IconSize {
    /// 16pt - Small icons
    static let sm: CGFloat = 16

    /// 20pt - Default icon size (web default)
    static let md: CGFloat = 20

    /// 24pt - Large icons
    static let lg: CGFloat = 24

    /// 32pt - Extra large icons
    static let xl: CGFloat = 32
}

// MARK: - View Extensions

extension View {
    /// Apply conditional modifier
    @ViewBuilder
    func `if`<Transform: View>(
        _ condition: Bool,
        transform: (Self) -> Transform
    ) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    /// Check if device width is large (tablet/desktop)
    func isLargeDevice(_ geometry: GeometryProxy) -> Bool {
        geometry.size.width > Layout.breakpointTablet
    }

    /// Responsive font size
    func adaptiveFont(
        geometry: GeometryProxy,
        largeSize: CGFloat,
        smallSize: CGFloat,
        weight: SwiftUI.Font.Weight = .regular
    ) -> SwiftUI.Font {
        geometry.size.width > Layout.breakpointTablet
            ? SwiftUI.Font.system(size: largeSize, weight: weight)
            : SwiftUI.Font.system(size: smallSize, weight: weight)
    }
}
