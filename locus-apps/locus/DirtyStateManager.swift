//
//  DirtyStateManager.swift
//  locus
//
//  Created by Claude Code
//

import Foundation
import Combine

/// Tracks which nodes and notes have been modified locally but not yet synced to the cloud
/// This is essential for local-first mode and ensuring data consistency
class DirtyStateManager: ObservableObject {
    static let shared = DirtyStateManager()

    @Published var dirtyNodes: Set<String> = []
    @Published var dirtyNotes: Set<String> = []

    private let dirtyNodesKey = "dirty_nodes"
    private let dirtyNotesKey = "dirty_notes"
    private let userIdKey = "dirty_state_user_id"

    private init() {
        loadDirtyState()
    }

    // MARK: - Dirty State Management

    /// Mark a node as dirty (needs sync)
    func markNodeDirty(_ nodeId: String) {
        dirtyNodes.insert(nodeId)
        saveDirtyState()
        print("🔴 Node \(nodeId) marked as dirty")
    }

    /// Mark a note as dirty (needs sync)
    func markNoteDirty(_ noteId: String) {
        dirtyNotes.insert(noteId)
        saveDirtyState()
        print("🔴 Note \(noteId) marked as dirty")
    }

    /// Mark a node as synced (clean)
    func markNodeSynced(_ nodeId: String) {
        dirtyNodes.remove(nodeId)
        saveDirtyState()
        print("🟢 Node \(nodeId) marked as synced")
    }

    /// Mark a note as synced (clean)
    func markNoteSynced(_ noteId: String) {
        dirtyNotes.remove(noteId)
        saveDirtyState()
        print("🟢 Note \(noteId) marked as synced")
    }

    // MARK: - Query Methods

    /// Get all dirty nodes
    func getDirtyNodes() -> [String] {
        return Array(dirtyNodes)
    }

    /// Get all dirty notes
    func getDirtyNotes() -> [String] {
        return Array(dirtyNotes)
    }

    /// Check if there are any dirty items
    func hasDirtyItems() -> Bool {
        return !dirtyNodes.isEmpty || !dirtyNotes.isEmpty
    }

    /// Get total count of dirty items
    func getDirtyCount() -> Int {
        return dirtyNodes.count + dirtyNotes.count
    }

    // MARK: - User ID Validation

    /// Get the user ID associated with the current dirty state
    func getUserId() -> Int? {
        return UserDefaults.standard.object(forKey: userIdKey) as? Int
    }

    /// Set the user ID for the current dirty state
    func setUserId(_ userId: Int) {
        UserDefaults.standard.set(userId, forKey: userIdKey)
    }

    /// Validate that dirty state belongs to the current user
    /// Returns true if valid, false if dirty state belongs to a different user
    func validateUserId(_ currentUserId: Int) -> Bool {
        guard let savedUserId = getUserId() else {
            // No saved user ID, set it now
            setUserId(currentUserId)
            return true
        }

        if savedUserId != currentUserId {
            print("⚠️ Dirty state belongs to user \(savedUserId), but current user is \(currentUserId)")
            return false
        }

        return true
    }

    // MARK: - Persistence

    private func saveDirtyState() {
        UserDefaults.standard.set(Array(dirtyNodes), forKey: dirtyNodesKey)
        UserDefaults.standard.set(Array(dirtyNotes), forKey: dirtyNotesKey)
    }

    private func loadDirtyState() {
        if let savedNodes = UserDefaults.standard.array(forKey: dirtyNodesKey) as? [String] {
            dirtyNodes = Set(savedNodes)
        }
        if let savedNotes = UserDefaults.standard.array(forKey: dirtyNotesKey) as? [String] {
            dirtyNotes = Set(savedNotes)
        }

        if hasDirtyItems() {
            print("📋 Loaded dirty state: \(dirtyNodes.count) nodes, \(dirtyNotes.count) notes")
        }
    }

    // MARK: - Clear All

    /// Clear all dirty state (use with caution!)
    /// This should only be called after successful sync or when user explicitly discards changes
    func clearAll() {
        dirtyNodes.removeAll()
        dirtyNotes.removeAll()
        saveDirtyState()
        print("🧹 Cleared all dirty state")
    }

    /// Clear dirty state for a specific user (called when switching users)
    func clearForUser(_ userId: Int) {
        if let savedUserId = getUserId(), savedUserId == userId {
            clearAll()
            UserDefaults.standard.removeObject(forKey: userIdKey)
        }
    }
}
