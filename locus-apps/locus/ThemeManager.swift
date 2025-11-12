//
//  ThemeManager.swift
//  locus
//
//  Theme management for the app
//

import SwiftUI
import Combine

enum AppTheme: String, CaseIterable {
    case light = "Light"
    case dark = "Dark"
    case system = "Match System"

    var colorScheme: ColorScheme? {
        switch self {
        case .light:
            return .light
        case .dark:
            return .dark
        case .system:
            return nil
        }
    }
}

class ThemeManager: ObservableObject {
    static let shared = ThemeManager()

    @Published var selectedTheme: AppTheme {
        didSet {
            UserDefaults.standard.set(selectedTheme.rawValue, forKey: "appTheme")
        }
    }

    private init() {
        // Load saved theme or default to light
        if let savedTheme = UserDefaults.standard.string(forKey: "appTheme"),
           let theme = AppTheme(rawValue: savedTheme) {
            self.selectedTheme = theme
        } else {
            self.selectedTheme = .light
        }
    }

    func setTheme(_ theme: AppTheme) {
        selectedTheme = theme
    }
}
