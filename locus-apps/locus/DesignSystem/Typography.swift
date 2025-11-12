//
//  Typography.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI

struct Typography {
    // Font sizes
    static let xs: CGFloat = 12      // Section headers
    static let sm: CGFloat = 14      // Small text
    static let base: CGFloat = 16    // Body text, buttons, inputs
    static let lg: CGFloat = 18      // Large text
    static let xl: CGFloat = 20      // Extra large
    static let xxl: CGFloat = 24     // Node titles
    static let xxxl: CGFloat = 32    // Page titles

    // Font helpers
    static func system(size: CGFloat, weight: SwiftUI.Font.Weight = .regular) -> SwiftUI.Font {
        return .system(size: size, weight: weight)
    }

    // Predefined styles
    static let sectionHeader = system(size: xs, weight: .bold)
    static let body = system(size: base)
    static let nodeText = system(size: base)
    static let nodeTitle = system(size: xxl, weight: .bold)
    static let input = system(size: base)
    static let small = system(size: sm)
    static let large = system(size: lg)
}
