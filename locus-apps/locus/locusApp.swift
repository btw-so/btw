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
    @StateObject private var dirtyStateManager = DirtyStateManager.shared
    @State private var showSplash = true
    @State private var showDirtySyncDialog = false

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
                            .sheet(isPresented: $showDirtySyncDialog) {
                                DirtyNodesSyncView()
                            }
                            .onAppear {
                                #if os(macOS)
                                // Trigger daily backup check on app open (macOS only)
                                BackupManager.shared.checkAndPerformDailyBackup()
                                #endif

                                // Check for dirty nodes/notes on app launch
                                checkDirtyState()
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

    // MARK: - Helper Methods

    private func checkDirtyState() {
        guard dirtyStateManager.hasDirtyItems() else { return }

        // Validate user ID matches
        guard let currentUserId = authManager.currentUser?.id else { return }

        if !dirtyStateManager.validateUserId(currentUserId) {
            // Dirty state belongs to a different user - clear it
            print("⚠️ Clearing dirty state from different user")
            dirtyStateManager.clearAll()
            return
        }

        // Show the dirty sync dialog
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            showDirtySyncDialog = true
        }
    }
}
