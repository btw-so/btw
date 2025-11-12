//
//  SettingsView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
#if os(macOS)
import AppKit
#endif

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var showingLogoutAlert = false
    @State private var deleteBackupsOnLogout = false
    @Environment(\.dismiss) var dismiss

    #if os(macOS)
    @ObservedObject private var backupManager = BackupManager.shared
    @State private var lastBackupStatus: String = "Never"
    #endif

    @ObservedObject private var localFirstManager = LocalFirstManager.shared
    @ObservedObject private var dirtyStateManager = DirtyStateManager.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Title
                Text("Settings")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(LocusColors.textPrimary)
                    .padding(.bottom, Spacing.xxl)

                // Appearance Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Appearance")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LocusColors.textPrimary)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Theme")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LocusColors.textSecondary)

                        VStack(spacing: Spacing.sm) {
                            ForEach(AppTheme.allCases, id: \.self) { theme in
                                Button(action: {
                                    themeManager.setTheme(theme)
                                }) {
                                    HStack {
                                        Text(theme.rawValue)
                                            .font(.system(size: 16))
                                            .foregroundColor(LocusColors.textPrimary)

                                        Spacer()

                                        if themeManager.selectedTheme == theme {
                                            Image(systemName: "checkmark")
                                                .foregroundColor(LocusColors.accent)
                                        }
                                    }
                                    .padding(.vertical, Spacing.md)
                                    .padding(.horizontal, Spacing.md)
                                    .background(
                                        themeManager.selectedTheme == theme ?
                                        LocusColors.accent.opacity(0.1) :
                                        LocusColors.backgroundSecondary
                                    )
                                    .cornerRadius(CornerRadius.md)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.md)
                                            .stroke(
                                                themeManager.selectedTheme == theme ?
                                                LocusColors.accent :
                                                LocusColors.clear,
                                                lineWidth: 2
                                            )
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                }
                .padding(.bottom, Spacing.xl)

                #if os(macOS)
                // Backup Section (macOS only)
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Local Backup")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LocusColors.textPrimary)

                    VStack(alignment: .leading, spacing: Spacing.md) {
                        // Enable/Disable Toggle
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Backup to your device")
                                    .font(.system(size: 16))
                                    .foregroundColor(LocusColors.textPrimary)
                                Text("Automatically backup your notes daily")
                                    .font(.system(size: 12))
                                    .foregroundColor(LocusColors.textSecondary)
                            }

                            Spacer()

                            Toggle("", isOn: $backupManager.isBackupEnabled)
                                .toggleStyle(.switch)
                                .labelsHidden()
                        }
                        .padding(.vertical, Spacing.sm)

                        if backupManager.isBackupEnabled {
                            // Location Picker
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("Backup Location")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LocusColors.textSecondary)

                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(backupManager.backupLocation.path)
                                            .font(.system(size: 14))
                                            .foregroundColor(LocusColors.textPrimary)
                                            .lineLimit(1)
                                            .truncationMode(.middle)

                                        Spacer()

                                        Button("Change...") {
                                            selectBackupLocation()
                                        }
                                        .buttonStyle(.bordered)
                                    }

                                    Text("To save backups to Documents or other folders, use \"Change...\" to grant permission")
                                        .font(.system(size: 11))
                                        .foregroundColor(LocusColors.textSecondary.opacity(0.7))
                                }
                                .padding(.vertical, Spacing.sm)
                                .padding(.horizontal, Spacing.md)
                                .background(LocusColors.backgroundSecondary)
                                .cornerRadius(CornerRadius.md)
                            }

                            // Retention Period
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("Backup Retention")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LocusColors.textSecondary)

                                VStack(spacing: Spacing.sm) {
                                    ForEach([7, 14, 30], id: \.self) { days in
                                        Button(action: {
                                            backupManager.backupRetentionDays = days
                                        }) {
                                            HStack {
                                                Text("\(days) days")
                                                    .font(.system(size: 16))
                                                    .foregroundColor(LocusColors.textPrimary)

                                                Spacer()

                                                if backupManager.backupRetentionDays == days {
                                                    Image(systemName: "checkmark")
                                                        .foregroundColor(LocusColors.accent)
                                                }
                                            }
                                            .padding(.vertical, Spacing.sm)
                                            .padding(.horizontal, Spacing.md)
                                            .background(
                                                backupManager.backupRetentionDays == days ?
                                                LocusColors.accent.opacity(0.1) :
                                                LocusColors.backgroundSecondary
                                            )
                                            .cornerRadius(CornerRadius.md)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                                    .stroke(
                                                        backupManager.backupRetentionDays == days ?
                                                        LocusColors.accent :
                                                        LocusColors.clear,
                                                        lineWidth: 2
                                                    )
                                            )
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }

                                Text("Backups older than \(backupManager.backupRetentionDays) days will be automatically deleted")
                                    .font(.system(size: 11))
                                    .foregroundColor(LocusColors.textSecondary.opacity(0.7))
                                    .padding(.top, 4)
                            }

                            // Backup Status and Progress
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                // Last backup status
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Last backup: \(lastBackupStatus)")
                                            .font(.system(size: 12))
                                            .foregroundColor(LocusColors.textSecondary)
                                    }

                                    Spacer()

                                    if backupManager.backupProgress.isActive {
                                        // Cancel button
                                        Button(action: {
                                            backupManager.cancelBackup()
                                        }) {
                                            HStack(spacing: 6) {
                                                Image(systemName: "xmark.circle")
                                                Text("Cancel")
                                                    .font(.system(size: 14, weight: .medium))
                                            }
                                        }
                                        .buttonStyle(.bordered)
                                    } else {
                                        // Backup Now button
                                        Button(action: {
                                            backupManager.startBackup()
                                        }) {
                                            HStack(spacing: 6) {
                                                Image(systemName: "arrow.down.doc")
                                                Text("Backup Now")
                                                    .font(.system(size: 14, weight: .medium))
                                            }
                                        }
                                        .buttonStyle(.bordered)
                                    }
                                }

                                // Progress indicator
                                if backupManager.backupProgress.isActive {
                                    VStack(alignment: .leading, spacing: Spacing.sm) {
                                        // Progress bar
                                        VStack(alignment: .leading, spacing: 4) {
                                            HStack {
                                                Text(backupManager.backupProgress.currentItem)
                                                    .font(.system(size: 12))
                                                    .foregroundColor(LocusColors.textSecondary)

                                                Spacer()

                                                Text("\(Int(backupManager.backupProgress.percentComplete))%")
                                                    .font(.system(size: 12, weight: .medium))
                                                    .foregroundColor(LocusColors.accent)
                                            }

                                            GeometryReader { geometry in
                                                ZStack(alignment: .leading) {
                                                    // Background
                                                    Rectangle()
                                                        .fill(LocusColors.backgroundSecondary)
                                                        .frame(height: 6)
                                                        .cornerRadius(3)

                                                    // Progress
                                                    Rectangle()
                                                        .fill(LocusColors.accent)
                                                        .frame(
                                                            width: geometry.size.width * CGFloat(backupManager.backupProgress.percentComplete / 100.0),
                                                            height: 6
                                                        )
                                                        .cornerRadius(3)
                                                }
                                            }
                                            .frame(height: 6)
                                        }

                                        // Detailed stats
                                        HStack(spacing: Spacing.md) {
                                            if backupManager.backupProgress.nodesCompleted > 0 {
                                                Text("Nodes: \(backupManager.backupProgress.nodesCompleted)")
                                                    .font(.system(size: 11))
                                                    .foregroundColor(LocusColors.textSecondary)
                                            }
                                            if backupManager.backupProgress.notesCompleted > 0 {
                                                Text("Notes: \(backupManager.backupProgress.notesCompleted)")
                                                    .font(.system(size: 11))
                                                    .foregroundColor(LocusColors.textSecondary)
                                            }
                                            if backupManager.backupProgress.filesCompleted > 0 {
                                                Text("Files: \(backupManager.backupProgress.filesCompleted)")
                                                    .font(.system(size: 11))
                                                    .foregroundColor(LocusColors.textSecondary)
                                            }
                                        }
                                    }
                                    .padding(Spacing.md)
                                    .background(LocusColors.accent.opacity(0.1))
                                    .cornerRadius(CornerRadius.md)
                                } else if backupManager.backupProgress.stage == .completed {
                                    // Success message
                                    HStack(spacing: 8) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                        Text("Backup completed successfully")
                                            .font(.system(size: 12))
                                            .foregroundColor(LocusColors.textSecondary)
                                    }
                                    .padding(Spacing.md)
                                    .background(SwiftUI.Color.green.opacity(0.1))
                                    .cornerRadius(CornerRadius.md)
                                } else if backupManager.backupProgress.stage == .cancelled {
                                    // Cancelled message
                                    HStack(spacing: 8) {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundColor(.orange)
                                        Text("Backup cancelled")
                                            .font(.system(size: 12))
                                            .foregroundColor(LocusColors.textSecondary)
                                    }
                                    .padding(Spacing.md)
                                    .background(SwiftUI.Color.orange.opacity(0.1))
                                    .cornerRadius(CornerRadius.md)
                                } else if backupManager.backupProgress.stage == .failed {
                                    // Error message
                                    HStack(spacing: 8) {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text(backupManager.backupProgress.currentItem)
                                            .font(.system(size: 12))
                                            .foregroundColor(LocusColors.textSecondary)
                                    }
                                    .padding(Spacing.md)
                                    .background(SwiftUI.Color.red.opacity(0.1))
                                    .cornerRadius(CornerRadius.md)
                                }
                            }
                            .padding(.vertical, Spacing.sm)
                        }
                    }
                }
                .padding(.bottom, Spacing.xl)
                .onAppear {
                    updateLastBackupStatus()
                }
                .onChange(of: backupManager.lastSuccessfulBackupDate) { _ in
                    updateLastBackupStatus()
                }
                #endif

                // Local-First Mode Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Performance")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LocusColors.textPrimary)

                    VStack(alignment: .leading, spacing: Spacing.md) {
                        // Local-First Toggle
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Optimize for local speed")
                                    .font(.system(size: 16))
                                    .foregroundColor(LocusColors.textPrimary)
                                Text("Edit locally and sync to cloud in the background")
                                    .font(.system(size: 12))
                                    .foregroundColor(LocusColors.textSecondary)
                            }

                            Spacer()

                            Toggle("", isOn: $localFirstManager.isLocalFirstEnabled)
                                .toggleStyle(.switch)
                                .labelsHidden()
                        }
                        .padding(.vertical, Spacing.sm)

                        // Dirty items indicator
                        if dirtyStateManager.hasDirtyItems() {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                HStack {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .foregroundColor(LocusColors.accent)
                                    Text("\(dirtyStateManager.getDirtyCount()) items pending sync")
                                        .font(.system(size: 14))
                                        .foregroundColor(LocusColors.textPrimary)
                                }

                                HStack(spacing: 12) {
                                    if !dirtyStateManager.dirtyNodes.isEmpty {
                                        Text("\(dirtyStateManager.dirtyNodes.count) nodes")
                                            .font(.system(size: 12))
                                            .foregroundColor(LocusColors.textSecondary)
                                    }
                                    if !dirtyStateManager.dirtyNotes.isEmpty {
                                        Text("\(dirtyStateManager.dirtyNotes.count) notes")
                                            .font(.system(size: 12))
                                            .foregroundColor(LocusColors.textSecondary)
                                    }
                                }
                            }
                            .padding(Spacing.md)
                            .background(LocusColors.accent.opacity(0.1))
                            .cornerRadius(CornerRadius.md)
                        }
                    }
                }
                .padding(.bottom, Spacing.xl)

                // User Info Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Account")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LocusColors.textPrimary)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Email")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(LocusColors.textSecondary)

                        Text(authManager.currentUser?.email ?? "Not logged in")
                            .font(.system(size: 16))
                            .foregroundColor(LocusColors.textPrimary)
                            .padding(.vertical, Spacing.md)
                            .padding(.horizontal, Spacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(LocusColors.backgroundSecondary)
                            .cornerRadius(CornerRadius.md)
                    }
                }
                .padding(.bottom, Spacing.xl)

                // Logout Button
                Button(action: {
                    showingLogoutAlert = true
                }) {
                    HStack {
                        Image(systemName: "arrow.right.square")
                        Text("Logout")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(SwiftUI.Color.red)
                    .cornerRadius(CornerRadius.md)
                }
                .buttonStyle(PlainButtonStyle())
                .confirmationDialog("Logout", isPresented: $showingLogoutAlert, titleVisibility: .visible) {
                    if dirtyStateManager.hasDirtyItems() {
                        Button("Sync & Logout") {
                            syncAndLogout()
                        }
                        Button("Discard & Logout", role: .destructive) {
                            handleLogout(clearDirty: true)
                        }
                    } else {
                        Button("Logout", role: .destructive) {
                            handleLogout(clearDirty: false)
                        }
                    }

                    #if os(macOS)
                    if backupManager.isBackupEnabled {
                        Button("Logout & Delete Backups", role: .destructive) {
                            handleLogout(clearDirty: true, deleteBackups: true)
                        }
                    }
                    #endif

                    Button("Cancel", role: .cancel) { }
                } message: {
                    VStack {
                        if dirtyStateManager.hasDirtyItems() {
                            Text("You have \(dirtyStateManager.getDirtyCount()) unsaved changes.")
                        }
                        #if os(macOS)
                        if backupManager.isBackupEnabled {
                            Text("Your local backups will be kept unless you choose to delete them.")
                        }
                        #endif
                    }
                }

                Spacer()
            }
            .frame(maxWidth: 600, alignment: .leading)
            .padding(Spacing.xxl)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(LocusColors.backgroundPrimary)
        #if os(iOS)
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
        #endif
    }

    // MARK: - Logout Functions

    func handleLogout(clearDirty: Bool, deleteBackups: Bool = false) {
        if clearDirty {
            dirtyStateManager.clearAll()
        }

        #if os(macOS)
        if deleteBackups {
            Task {
                await deleteAllBackups()
                await MainActor.run {
                    authManager.logout()
                }
            }
        } else {
            authManager.logout()
        }
        #else
        authManager.logout()
        #endif
    }

    func syncAndLogout() {
        Task {
            let _ = await localFirstManager.forceSyncAll()
            // Logout regardless of sync result
            await MainActor.run {
                authManager.logout()
            }
        }
    }

    #if os(macOS)
    func deleteAllBackups() async {
        let backupURL = backupManager.backupLocation

        do {
            guard backupURL.startAccessingSecurityScopedResource() else { return }
            defer { backupURL.stopAccessingSecurityScopedResource() }

            let contents = try FileManager.default.contentsOfDirectory(
                at: backupManager.backupLocation,
                includingPropertiesForKeys: nil,
                options: [.skipsHiddenFiles]
            )

            for folder in contents {
                guard folder.lastPathComponent.hasPrefix("backup_"),
                      folder.hasDirectoryPath else {
                    continue
                }

                try FileManager.default.removeItem(at: folder)
                print("🗑️  Deleted backup: \(folder.lastPathComponent)")
            }

            print("✅ All backups deleted")
        } catch {
            print("❌ Failed to delete backups: \(error.localizedDescription)")
        }
    }
    #endif

    #if os(macOS)
    // MARK: - Backup Functions

    func selectBackupLocation() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.message = "Select backup location"
        panel.directoryURL = backupManager.backupLocation

        if panel.runModal() == .OK, let url = panel.url {
            // The URL from NSOpenPanel is already security-scoped
            // Setting backupLocation will trigger the bookmark save
            backupManager.backupLocation = url
        }
    }

    func updateLastBackupStatus() {
        if let lastBackup = backupManager.lastSuccessfulBackupDate {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .full
            lastBackupStatus = formatter.localizedString(for: lastBackup, relativeTo: Date())
        } else {
            lastBackupStatus = "Never"
        }
    }
    #endif
}

#Preview {
    NavigationView {
        SettingsView()
    }
}
