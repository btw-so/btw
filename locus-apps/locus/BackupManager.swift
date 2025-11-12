//
//  BackupManager.swift
//  locus
//
//  Created by Claude Code
//

import Foundation
import Combine

#if os(macOS)

// MARK: - Backup Progress Model

struct BackupProgress {
    enum Stage {
        case idle
        case preparingBackup
        case backingUpNodes
        case backingUpNotes
        case backingUpFiles
        case finalizing
        case completed
        case failed
        case cancelled
    }

    var stage: Stage = .idle
    var currentItem: String = ""
    var itemsCompleted: Int = 0
    var totalItems: Int = 0
    var nodesCompleted: Int = 0
    var notesCompleted: Int = 0
    var filesCompleted: Int = 0

    var percentComplete: Double {
        guard totalItems > 0 else { return 0 }
        return Double(itemsCompleted) / Double(totalItems) * 100.0
    }

    var isActive: Bool {
        switch stage {
        case .idle, .completed, .failed, .cancelled:
            return false
        default:
            return true
        }
    }
}

class BackupManager: ObservableObject {
    static let shared = BackupManager()

    @Published var isBackupEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isBackupEnabled, forKey: "backup_enabled")
        }
    }

    @Published var backupLocation: URL {
        didSet {
            UserDefaults.standard.set(backupLocation.path, forKey: "backup_location")
            // Save security-scoped bookmark for persistent access
            saveBookmark(for: backupLocation)
        }
    }

    private var bookmarkedURL: URL?

    @Published var backupProgress: BackupProgress = BackupProgress()

    private var isCancelled = false
    private var currentBackupTask: Task<Void, Never>?

    private var lastBackupDate: Date? {
        get {
            UserDefaults.standard.object(forKey: "last_backup_date") as? Date
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "last_backup_date")
        }
    }

    var lastSuccessfulBackupDate: Date? {
        return lastBackupDate
    }

    private init() {
        // Load saved preferences
        self.isBackupEnabled = UserDefaults.standard.bool(forKey: "backup_enabled")

        if let savedPath = UserDefaults.standard.string(forKey: "backup_location") {
            self.backupLocation = URL(fileURLWithPath: savedPath)
            // Try to restore bookmark
            restoreBookmark()
        } else {
            // Default location: Application Support (app has permission to write here)
            let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            let appFolder = appSupport.appendingPathComponent("com.siddg.locus")
            self.backupLocation = appFolder.appendingPathComponent("backups")
        }
    }

    // MARK: - Security-Scoped Bookmarks

    private func saveBookmark(for url: URL) {
        do {
            // Start accessing the security-scoped resource
            guard url.startAccessingSecurityScopedResource() else {
                print("⚠️ Could not access security-scoped resource")
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            // Create bookmark data
            let bookmarkData = try url.bookmarkData(
                options: .withSecurityScope,
                includingResourceValuesForKeys: nil,
                relativeTo: nil
            )

            // Save bookmark to UserDefaults
            UserDefaults.standard.set(bookmarkData, forKey: "backup_location_bookmark")
            print("✅ Saved security-scoped bookmark for: \(url.path)")
        } catch {
            print("❌ Failed to save bookmark: \(error.localizedDescription)")
        }
    }

    private func restoreBookmark() {
        guard let bookmarkData = UserDefaults.standard.data(forKey: "backup_location_bookmark") else {
            print("⚠️ No bookmark data found")
            return
        }

        do {
            var isStale = false
            let url = try URL(
                resolvingBookmarkData: bookmarkData,
                options: .withSecurityScope,
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            )

            if isStale {
                print("⚠️ Bookmark is stale, will need to re-select folder")
                // Could recreate the bookmark here if needed
            }

            bookmarkedURL = url
            print("✅ Restored security-scoped bookmark for: \(url.path)")
        } catch {
            print("❌ Failed to restore bookmark: \(error.localizedDescription)")
        }
    }

    private func accessBackupLocation<T>(_ operation: () throws -> T) throws -> T {
        // If we have a bookmarked URL, use it with security scope
        if let bookmarkedURL = bookmarkedURL {
            guard bookmarkedURL.startAccessingSecurityScopedResource() else {
                throw NSError(
                    domain: "BackupManager",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Could not access backup location. Please select it again in Settings."]
                )
            }
            defer { bookmarkedURL.stopAccessingSecurityScopedResource() }
            return try operation()
        } else {
            // No bookmark, just try the operation (works for Application Support)
            return try operation()
        }
    }

    /// Check if a backup should run today
    func shouldBackupToday() -> Bool {
        guard isBackupEnabled else { return false }

        guard let lastBackup = lastBackupDate else {
            return true // Never backed up before
        }

        // Check if last backup was on a different day
        let calendar = Calendar.current
        return !calendar.isDateInToday(lastBackup)
    }

    /// Cancel the current backup operation
    func cancelBackup() {
        guard backupProgress.isActive else { return }

        print("⚠️ Cancelling backup...")
        isCancelled = true
        currentBackupTask?.cancel()

        DispatchQueue.main.async {
            self.backupProgress.stage = .cancelled
            self.backupProgress.currentItem = "Backup cancelled"
        }
    }

    /// Start a new backup (call from UI)
    func startBackup() {
        guard !backupProgress.isActive else {
            print("⚠️ Backup already in progress")
            return
        }

        currentBackupTask = Task {
            do {
                try await performBackup()
            } catch {
                print("❌ Backup failed: \(error.localizedDescription)")
                await MainActor.run {
                    self.backupProgress.stage = .failed
                    self.backupProgress.currentItem = "Backup failed: \(error.localizedDescription)"
                }
            }
        }
    }

    /// Perform a full backup of user data with atomic operations
    private func performBackup() async throws {
        guard isBackupEnabled else {
            print("Backup is disabled")
            return
        }

        // Reset cancellation flag
        isCancelled = false

        await MainActor.run {
            backupProgress = BackupProgress()
            backupProgress.stage = .preparingBackup
            backupProgress.currentItem = "Preparing backup..."
        }

        print("🔄 Starting backup to \(backupLocation.path)")

        // Start accessing security-scoped resource for the entire backup
        let shouldStopAccessing: Bool
        if let bookmarkedURL = bookmarkedURL {
            guard bookmarkedURL.startAccessingSecurityScopedResource() else {
                throw NSError(
                    domain: "BackupManager",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Could not access backup location. Please select it again in Settings."]
                )
            }
            shouldStopAccessing = true
        } else {
            shouldStopAccessing = false
        }

        defer {
            if shouldStopAccessing, let bookmarkedURL = bookmarkedURL {
                bookmarkedURL.stopAccessingSecurityScopedResource()
            }
        }

        // Create backup directory if it doesn't exist
        try FileManager.default.createDirectory(at: backupLocation, withIntermediateDirectories: true)

        // Generate timestamp for this backup
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd_HH-mm-ss"
        let timestamp = dateFormatter.string(from: Date())

        // Use a temporary folder for the backup
        let tempFolder = backupLocation.appendingPathComponent("backup_\(timestamp)_temp")
        let finalFolder = backupLocation.appendingPathComponent("backup_\(timestamp)")

        // Clean up any existing temp folder
        try? FileManager.default.removeItem(at: tempFolder)
        try FileManager.default.createDirectory(at: tempFolder, withIntermediateDirectories: true)

        do {
            // Fetch all nodes from API
            try await backupNodes(to: tempFolder)

            if isCancelled {
                try? FileManager.default.removeItem(at: tempFolder)
                return
            }

            // Fetch all notes from API
            try await backupNotes(to: tempFolder)

            if isCancelled {
                try? FileManager.default.removeItem(at: tempFolder)
                return
            }

            // Fetch all files from API
            try await backupFiles(to: tempFolder)

            if isCancelled {
                try? FileManager.default.removeItem(at: tempFolder)
                return
            }

            // Finalize: Move temp folder to final location
            await MainActor.run {
                backupProgress.stage = .finalizing
                backupProgress.currentItem = "Finalizing backup..."
            }

            // If final folder already exists, remove it
            try? FileManager.default.removeItem(at: finalFolder)

            // Move temp to final
            try FileManager.default.moveItem(at: tempFolder, to: finalFolder)

            // Update last backup date only on success
            lastBackupDate = Date()

            await MainActor.run {
                backupProgress.stage = .completed
                backupProgress.currentItem = "Backup completed successfully"
            }

            print("✅ Backup completed successfully to \(finalFolder.path)")
        } catch {
            // Clean up temp folder on failure
            try? FileManager.default.removeItem(at: tempFolder)
            throw error
        }
    }

    private func backupNodes(to folder: URL) async throws {
        await MainActor.run {
            backupProgress.stage = .backingUpNodes
            backupProgress.currentItem = "Fetching nodes..."
        }

        print("  Backing up nodes...")

        // Create nodes subfolder
        let nodesFolder = folder.appendingPathComponent("nodes")
        try FileManager.default.createDirectory(at: nodesFolder, withIntermediateDirectories: true)

        var totalNodes = 0
        var currentPage = 1
        let limit = 200 // Match backend max limit

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        // Fetch total count first (from first page response)
        let firstResponse = try await APIService.shared.getBackupNodes(page: 1, limit: limit)
        let estimatedTotal = firstResponse.total ?? firstResponse.nodes.count

        await MainActor.run {
            backupProgress.totalItems = estimatedTotal + (backupProgress.totalItems - backupProgress.nodesCompleted)
        }

        // Save first page nodes
        for node in firstResponse.nodes {
            if isCancelled { throw CancellationError() }

            let fileName = "\(node.id).json"
            let nodeFile = nodesFolder.appendingPathComponent(fileName)
            let nodeData = try encoder.encode(node)
            try nodeData.write(to: nodeFile)

            totalNodes += 1

            await MainActor.run {
                backupProgress.nodesCompleted = totalNodes
                backupProgress.itemsCompleted = backupProgress.nodesCompleted + backupProgress.notesCompleted + backupProgress.filesCompleted
                backupProgress.currentItem = "Backing up nodes: \(totalNodes)/\(estimatedTotal)"
            }
        }

        print("    Page 1: \(firstResponse.nodes.count) nodes")

        // Continue with remaining pages
        if firstResponse.nodes.count >= limit {
            currentPage = 2
            while true {
                if isCancelled { throw CancellationError() }

                let response = try await APIService.shared.getBackupNodes(page: currentPage, limit: limit)
                guard !response.nodes.isEmpty else { break }

                // Save each node as individual JSON file
                for node in response.nodes {
                    if isCancelled { throw CancellationError() }

                    let fileName = "\(node.id).json"
                    let nodeFile = nodesFolder.appendingPathComponent(fileName)
                    let nodeData = try encoder.encode(node)
                    try nodeData.write(to: nodeFile)

                    totalNodes += 1

                    await MainActor.run {
                        backupProgress.nodesCompleted = totalNodes
                        backupProgress.itemsCompleted = backupProgress.nodesCompleted + backupProgress.notesCompleted + backupProgress.filesCompleted
                        backupProgress.currentItem = "Backing up nodes: \(totalNodes)/\(estimatedTotal)"
                    }
                }

                print("    Page \(currentPage): \(response.nodes.count) nodes")

                if response.nodes.count < limit {
                    break // Last page
                }

                currentPage += 1
            }
        }

        print("  ✓ Backed up \(totalNodes) nodes as individual files")
    }

    private func backupNotes(to folder: URL) async throws {
        await MainActor.run {
            backupProgress.stage = .backingUpNotes
            backupProgress.currentItem = "Fetching notes..."
        }

        print("  Backing up notes...")

        // Create notes subfolder
        let notesFolder = folder.appendingPathComponent("notes")
        try FileManager.default.createDirectory(at: notesFolder, withIntermediateDirectories: true)

        var totalNotes = 0
        var currentPage = 1
        let limit = 50 // Match backend max limit for notes

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        // Fetch total count first (from first page response)
        let firstResponse = try await APIService.shared.getBackupNotes(page: 1, limit: limit)

        let firstNotes = firstResponse.notes ?? []
        let estimatedTotal = firstResponse.total ?? firstNotes.count

        await MainActor.run {
            backupProgress.totalItems = backupProgress.totalItems + estimatedTotal
        }

        guard !firstNotes.isEmpty else {
            print("  ✓ No notes to back up")
            return
        }

        // Save first page notes
        for note in firstNotes {
            if isCancelled { throw CancellationError() }

            let fileName = "\(note.id).json"
            let noteFile = notesFolder.appendingPathComponent(fileName)
            let noteData = try encoder.encode(note)
            try noteData.write(to: noteFile)

            totalNotes += 1

            await MainActor.run {
                backupProgress.notesCompleted = totalNotes
                backupProgress.itemsCompleted = backupProgress.nodesCompleted + backupProgress.notesCompleted + backupProgress.filesCompleted
                backupProgress.currentItem = "Backing up notes: \(totalNotes)/\(estimatedTotal)"
            }
        }

        print("    Page 1: \(firstNotes.count) notes")

        // Continue with remaining pages
        if firstNotes.count >= limit {
            currentPage = 2
            while true {
                if isCancelled { throw CancellationError() }

                let response = try await APIService.shared.getBackupNotes(page: currentPage, limit: limit)

                let notes = response.notes ?? []
                guard !notes.isEmpty else { break }

                // Save each note as individual JSON file
                for note in notes {
                    if isCancelled { throw CancellationError() }

                    let fileName = "\(note.id).json"
                    let noteFile = notesFolder.appendingPathComponent(fileName)
                    let noteData = try encoder.encode(note)
                    try noteData.write(to: noteFile)

                    totalNotes += 1

                    await MainActor.run {
                        backupProgress.notesCompleted = totalNotes
                        backupProgress.itemsCompleted = backupProgress.nodesCompleted + backupProgress.notesCompleted + backupProgress.filesCompleted
                        backupProgress.currentItem = "Backing up notes: \(totalNotes)/\(estimatedTotal)"
                    }
                }

                print("    Page \(currentPage): \(notes.count) notes")

                if notes.count < limit {
                    break // Last page
                }

                currentPage += 1
            }
        }

        print("  ✓ Backed up \(totalNotes) notes as individual files")
    }

    private func backupFiles(to folder: URL) async throws {
        await MainActor.run {
            backupProgress.stage = .backingUpFiles
            backupProgress.currentItem = "Fetching files..."
        }

        print("  Backing up files...")

        // Create files subfolder
        let filesFolder = folder.appendingPathComponent("files")
        try FileManager.default.createDirectory(at: filesFolder, withIntermediateDirectories: true)

        var totalFiles = 0
        var currentPage = 1
        let limit = 100 // Match backend max limit for files

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        // Fetch total count first (from first page response)
        let firstResponse = try await APIService.shared.getBackupFiles(page: 1, limit: limit)

        let firstFiles = firstResponse.files ?? []
        let estimatedTotal = firstResponse.total ?? firstFiles.count

        await MainActor.run {
            backupProgress.totalItems = backupProgress.totalItems + estimatedTotal
        }

        guard !firstFiles.isEmpty else {
            print("  ✓ No files to back up")
            return
        }

        // Save first page files
        for file in firstFiles {
            if isCancelled { throw CancellationError() }

            let fileName = "\(file.id).json"
            let fileFile = filesFolder.appendingPathComponent(fileName)
            let fileData = try encoder.encode(file)
            try fileData.write(to: fileFile)

            totalFiles += 1

            await MainActor.run {
                backupProgress.filesCompleted = totalFiles
                backupProgress.itemsCompleted = backupProgress.nodesCompleted + backupProgress.notesCompleted + backupProgress.filesCompleted
                backupProgress.currentItem = "Backing up files: \(totalFiles)/\(estimatedTotal)"
            }
        }

        print("    Page 1: \(firstFiles.count) files")

        // Continue with remaining pages
        if firstFiles.count >= limit {
            currentPage = 2
            while true {
                if isCancelled { throw CancellationError() }

                let response = try await APIService.shared.getBackupFiles(page: currentPage, limit: limit)

                let files = response.files ?? []
                guard !files.isEmpty else { break }

                // Save each file as individual JSON file
                for file in files {
                    if isCancelled { throw CancellationError() }

                    let fileName = "\(file.id).json"
                    let fileFile = filesFolder.appendingPathComponent(fileName)
                    let fileData = try encoder.encode(file)
                    try fileData.write(to: fileFile)

                    totalFiles += 1

                    await MainActor.run {
                        backupProgress.filesCompleted = totalFiles
                        backupProgress.itemsCompleted = backupProgress.nodesCompleted + backupProgress.notesCompleted + backupProgress.filesCompleted
                        backupProgress.currentItem = "Backing up files: \(totalFiles)/\(estimatedTotal)"
                    }
                }

                print("    Page \(currentPage): \(files.count) files")

                if files.count < limit {
                    break // Last page
                }

                currentPage += 1
            }
        }

        print("  ✓ Backed up \(totalFiles) files as individual files")
    }

    /// Trigger backup on app open if needed
    func checkAndPerformDailyBackup() {
        guard shouldBackupToday() else {
            print("Backup already performed today")
            return
        }

        startBackup()
    }
}

// Define CancellationError
struct CancellationError: Error {
    var localizedDescription: String {
        return "Operation was cancelled"
    }
}

#endif
