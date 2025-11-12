//
//  locusApp.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI

@main
struct locusApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var themeManager = ThemeManager.shared
    @State private var showSplash = true

    var body: some Scene {
        WindowGroup {
            Group {
                if showSplash {
                    SplashView(showSplash: $showSplash)
                        .environmentObject(authManager)
                        .environmentObject(themeManager)
                } else {
                    if authManager.isLoggedIn {
                        MainAppView()
                            .environmentObject(authManager)
                            .environmentObject(themeManager)
                            .onAppear {
                                #if os(macOS)
                                // Trigger daily backup check on app open (macOS only)
                                BackupManager.shared.checkAndPerformDailyBackup()
                                #endif
                            }
                    } else {
                        LoginView()
                            .environmentObject(authManager)
                            .environmentObject(themeManager)
                    }
                }
            }
            .preferredColorScheme(themeManager.selectedTheme.colorScheme)
        }
        #if os(macOS)
        .windowStyle(.hiddenTitleBar)
        #endif
    }
}
