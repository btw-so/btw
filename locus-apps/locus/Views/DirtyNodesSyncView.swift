//
//  DirtyNodesSyncView.swift
//  locus
//
//  Created by Claude Code
//

import SwiftUI

/// View shown when app launches with dirty nodes/notes that need syncing
struct DirtyNodesSyncView: View {
    @ObservedObject var dirtyStateManager = DirtyStateManager.shared
    @ObservedObject var localFirstManager = LocalFirstManager.shared

    @State private var isSyncing = false
    @State private var syncedCount = 0
    @State private var failedCount = 0
    @State private var showError = false
    @Environment(\.dismiss) var dismiss

    var totalItems: Int {
        dirtyStateManager.getDirtyCount()
    }

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Icon
            Image(systemName: isSyncing ? "arrow.triangle.2.circlepath" : "cloud.fill")
                .font(.system(size: 60))
                .foregroundColor(LocusColors.accent)
                .symbolEffect(.pulse, isActive: isSyncing)

            // Title
            Text(isSyncing ? "Syncing Changes" : "Pending Changes")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(LocusColors.textPrimary)

            // Description
            if isSyncing {
                VStack(spacing: Spacing.sm) {
                    Text("Syncing your local changes to the cloud...")
                        .font(.system(size: 16))
                        .foregroundColor(LocusColors.textSecondary)
                        .multilineTextAlignment(.center)

                    if syncedCount > 0 || failedCount > 0 {
                        HStack(spacing: 16) {
                            if syncedCount > 0 {
                                Label("\(syncedCount) synced", systemImage: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            }
                            if failedCount > 0 {
                                Label("\(failedCount) failed", systemImage: "xmark.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                        .font(.system(size: 14))
                    }
                }
            } else {
                VStack(spacing: Spacing.sm) {
                    Text("You have \(totalItems) unsaved changes from your last session")
                        .font(.system(size: 16))
                        .foregroundColor(LocusColors.textSecondary)
                        .multilineTextAlignment(.center)

                    HStack(spacing: 16) {
                        if !dirtyStateManager.dirtyNodes.isEmpty {
                            Label("\(dirtyStateManager.dirtyNodes.count) nodes", systemImage: "list.bullet")
                                .font(.system(size: 14))
                                .foregroundColor(LocusColors.textSecondary)
                        }
                        if !dirtyStateManager.dirtyNotes.isEmpty {
                            Label("\(dirtyStateManager.dirtyNotes.count) notes", systemImage: "doc.text")
                                .font(.system(size: 14))
                                .foregroundColor(LocusColors.textSecondary)
                        }
                    }
                }
            }

            // Progress bar (when syncing)
            if isSyncing {
                ProgressView(value: Double(syncedCount + failedCount), total: Double(totalItems))
                    .progressViewStyle(.linear)
                    .frame(maxWidth: 300)
            }

            // Action buttons
            if !isSyncing {
                VStack(spacing: Spacing.md) {
                    // Sync Now button
                    Button(action: {
                        syncNow()
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                            Text("Sync Now")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: 300)
                        .padding(.vertical, Spacing.md)
                        .background(LocusColors.accent)
                        .cornerRadius(CornerRadius.md)
                    }
                    .buttonStyle(PlainButtonStyle())

                    // Continue without syncing button
                    Button(action: {
                        dismiss()
                    }) {
                        Text("Continue Without Syncing")
                            .font(.system(size: 14))
                            .foregroundColor(LocusColors.textSecondary)
                    }
                    .buttonStyle(PlainButtonStyle())

                    // Discard changes button
                    Button(action: {
                        showError = true
                    }) {
                        Text("Discard All Changes")
                            .font(.system(size: 14))
                            .foregroundColor(.red)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            } else {
                // Cancel button (when syncing)
                Button(action: {
                    dismiss()
                }) {
                    Text("Continue to App")
                        .font(.system(size: 14))
                        .foregroundColor(LocusColors.textSecondary)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: 500)
        .background(LocusColors.backgroundPrimary)
        .alert("Discard Changes?", isPresented: $showError) {
            Button("Cancel", role: .cancel) { }
            Button("Discard", role: .destructive) {
                dirtyStateManager.clearAll()
                dismiss()
            }
        } message: {
            Text("Are you sure you want to discard all \(totalItems) unsaved changes? This action cannot be undone.")
        }
    }

    private func syncNow() {
        isSyncing = true
        syncedCount = 0
        failedCount = 0

        Task {
            let result = await localFirstManager.forceSyncAll()

            await MainActor.run {
                syncedCount = result.success
                failedCount = result.failed

                // Auto-dismiss after 2 seconds if all synced successfully
                if result.failed == 0 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    DirtyNodesSyncView()
}
