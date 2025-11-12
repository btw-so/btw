//
//  LocalFirstManager.swift
//  locus
//
//  Created by Claude Code
//

import Foundation
import Combine

/// Manages local-first mode where edits are saved locally first,
/// then synced to the cloud in the background for optimal performance
class LocalFirstManager: ObservableObject {
    static let shared = LocalFirstManager()

    @Published var isLocalFirstEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isLocalFirstEnabled, forKey: "local_first_enabled")
            if isLocalFirstEnabled {
                startBackgroundSync()
            } else {
                stopBackgroundSync()
            }
        }
    }

    private var syncTimer: Timer?
    private let syncInterval: TimeInterval = 5.0 // Sync every 5 seconds when there are dirty items

    private init() {
        self.isLocalFirstEnabled = UserDefaults.standard.bool(forKey: "local_first_enabled")

        if isLocalFirstEnabled {
            startBackgroundSync()
        }
    }

    // MARK: - Background Sync

    private func startBackgroundSync() {
        stopBackgroundSync()

        print("🚀 Starting local-first background sync (every \(syncInterval)s)")

        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task {
                await self.performBackgroundSync()
            }
        }
    }

    private func stopBackgroundSync() {
        syncTimer?.invalidate()
        syncTimer = nil
        print("🛑 Stopped local-first background sync")
    }

    private func performBackgroundSync() async {
        guard isLocalFirstEnabled else { return }

        // Get dirty items from DirtyStateManager
        let dirtyNodes = DirtyStateManager.shared.getDirtyNodes()
        let dirtyNotes = DirtyStateManager.shared.getDirtyNotes()

        guard !dirtyNodes.isEmpty || !dirtyNotes.isEmpty else {
            return // Nothing to sync
        }

        print("🔄 Background sync: \(dirtyNodes.count) nodes, \(dirtyNotes.count) notes")

        // Sync dirty nodes
        for nodeId in dirtyNodes {
            do {
                try await syncNode(nodeId: nodeId)
                DirtyStateManager.shared.markNodeSynced(nodeId)
            } catch {
                print("❌ Failed to sync node \(nodeId): \(error.localizedDescription)")
                // Keep it marked as dirty to retry later
            }
        }

        // Sync dirty notes
        for noteId in dirtyNotes {
            do {
                try await syncNote(noteId: noteId)
                DirtyStateManager.shared.markNoteSynced(noteId)
            } catch {
                print("❌ Failed to sync note \(noteId): \(error.localizedDescription)")
                // Keep it marked as dirty to retry later
            }
        }
    }

    // MARK: - Sync Individual Items

    private func syncNode(nodeId: String) async throws {
        // Load node data from local cache
        guard let nodeData = LocalCache.shared.getNode(nodeId) else {
            print("⚠️ Node \(nodeId) not found in local cache")
            return
        }

        // Sync to API
        let success = try await APIService.shared.upsertNode(nodeData)
        if success {
            print("✅ Synced node \(nodeId) to cloud")
        } else {
            throw NSError(domain: "LocalFirstManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "API returned false"])
        }
    }

    private func syncNote(noteId: String) async throws {
        // Load note data from local cache
        guard let noteHtml = LocalCache.shared.getNote(noteId) else {
            print("⚠️ Note \(noteId) not found in local cache")
            return
        }

        // Sync to API
        let success = try await APIService.shared.updateNote(id: noteId, html: noteHtml)
        if success {
            print("✅ Synced note \(noteId) to cloud")
        } else {
            throw NSError(domain: "LocalFirstManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "API returned false"])
        }
    }

    // MARK: - Manual Sync

    /// Force sync all dirty items immediately
    func forceSyncAll() async -> (success: Int, failed: Int) {
        let dirtyNodes = DirtyStateManager.shared.getDirtyNodes()
        let dirtyNotes = DirtyStateManager.shared.getDirtyNotes()

        var successCount = 0
        var failedCount = 0

        // Sync nodes
        for nodeId in dirtyNodes {
            do {
                try await syncNode(nodeId: nodeId)
                DirtyStateManager.shared.markNodeSynced(nodeId)
                successCount += 1
            } catch {
                print("❌ Failed to sync node \(nodeId): \(error.localizedDescription)")
                failedCount += 1
            }
        }

        // Sync notes
        for noteId in dirtyNotes {
            do {
                try await syncNote(noteId: noteId)
                DirtyStateManager.shared.markNoteSynced(noteId)
                successCount += 1
            } catch {
                print("❌ Failed to sync note \(noteId): \(error.localizedDescription)")
                failedCount += 1
            }
        }

        return (successCount, failedCount)
    }

    deinit {
        stopBackgroundSync()
    }
}

// MARK: - Local Cache (Placeholder for actual cache implementation)

/// Simple in-memory cache for local-first data
/// In production, this should use a database like CoreData or SQLite
class LocalCache {
    static let shared = LocalCache()

    private var nodeCache: [String: NodeUpdateRequest] = [:]
    private var noteCache: [String: String] = [:]

    private init() {}

    // MARK: - Nodes

    func saveNode(_ node: NodeUpdateRequest) {
        nodeCache[node.id] = node
    }

    func getNode(_ nodeId: String) -> NodeUpdateRequest? {
        return nodeCache[nodeId]
    }

    // MARK: - Notes

    func saveNote(noteId: String, html: String) {
        noteCache[noteId] = html
    }

    func getNote(_ noteId: String) -> String? {
        return noteCache[noteId]
    }
}
