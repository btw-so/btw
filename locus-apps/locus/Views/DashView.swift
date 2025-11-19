//
//  DashView.swift
//  locus
//
//  Created for Dash feature
//

import SwiftUI
import Combine
import UniformTypeIdentifiers

struct DashView: View {
    @StateObject private var viewModel = DashViewModel()
    @Binding var selectedNodeId: String?
    @State private var localPinnedNotes: [PinnedNoteWithContent] = []
    @State private var localDraggedItem: PinnedNoteWithContent?

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header with greeting
                HStack {
                    Text(viewModel.getGreeting())
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(LocusColors.textPrimary)
                    Spacer()
                }
                .padding(.horizontal, Spacing.xxl)
                .padding(.top, Spacing.xxl)
                .padding(.bottom, Spacing.xl)

                if localPinnedNotes.isEmpty {
                    // Empty state
                    VStack(spacing: Spacing.md) {
                        Spacer()
                        Text("No pinned notes with content yet.")
                            .font(Typography.body)
                            .foregroundColor(LocusColors.textSecondary)
                        Text("Pin a note with content to see it here.")
                            .font(Typography.small)
                            .foregroundColor(LocusColors.textSecondary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxxl)
                } else {
                    // Grid layout for widget-style cards
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 320, maximum: 400), spacing: Spacing.lg)
                    ], spacing: Spacing.lg) {
                        ForEach(localPinnedNotes) { node in
                            NoteCard(node: node, onTap: {
                                selectedNodeId = node.id
                            })
                            .onDrag {
                                print("🚀 onDrag triggered for: \(node.text)")
                                localDraggedItem = node
                                return NSItemProvider(object: node.id as NSString)
                            }
                            .onDrop(of: [.text], delegate: DropViewDelegate(
                                item: node,
                                items: $localPinnedNotes,
                                draggedItem: $localDraggedItem,
                                onReorder: { reorderedNotes in
                                    Task {
                                        await viewModel.updatePinnedPositions(reorderedNotes)
                                    }
                                }
                            ))
                        }
                    }
                    .padding(.horizontal, Spacing.xxl)
                    .padding(.bottom, Spacing.xxl)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .background(LocusColors.backgroundSecondary)
        .task {
            await viewModel.loadPinnedNotes(after: 0)
            viewModel.startPeriodicRefresh()
        }
        .onDisappear {
            viewModel.stopPeriodicRefresh()
        }
        .onChange(of: viewModel.pinnedNotesWithContent) { newValue in
            localPinnedNotes = newValue
        }
    }
}

struct NoteCard: View {
    let node: PinnedNoteWithContent
    let onTap: () -> Void
    @State private var isHovering: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with drag handle
            HStack(alignment: .top, spacing: Spacing.sm) {
                // Drag handle icon (non-clickable, for dragging only)
                Image(systemName: "arrow.up.arrow.down")
                    .font(.system(size: 12))
                    .foregroundColor(LocusColors.textSecondary)
                    .padding(.top, 2) // Push down slightly to align with text baseline
                    .padding(.leading, 1) // Push right slightly

                // Title - clickable to open node
                Button(action: onTap) {
                    Text(node.text.isEmpty ? "Untitled Note" : node.text)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LocusColors.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(LocusColors.backgroundPrimary)
            .overlay(
                Rectangle()
                    .fill(LocusColors.borderLight)
                    .frame(height: 1),
                alignment: .bottom
            )

            // Content - NoteEditorView using note_id (read-only preview)
            if let noteId = node.noteId {
                NoteEditorView(noteId: noteId, showMenuBar: false, hideCharacterCount: true)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .allowsHitTesting(false) // Disable interaction in preview
            }

            Spacer()
        }
        .background(LocusColors.backgroundPrimary)
        .cornerRadius(8)
        .shadow(color: Color.black.opacity(isHovering ? 0.12 : 0.06), radius: isHovering ? 12 : 4, x: 0, y: 2)
        .aspectRatio(0.75, contentMode: .fit)  // 3:4 aspect ratio (taller cards)
        .onTapGesture {
            onTap()
        }
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovering = hovering
            }
            #if os(macOS)
            if hovering {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
            #endif
        }
    }
}

// Type alias for clarity - we use the full ListNode to preserve all fields for updates
typealias PinnedNoteWithContent = ListNode

// ViewModel for Dash
@MainActor
class DashViewModel: ObservableObject {
    @Published var pinnedNotesWithContent: [PinnedNoteWithContent] = []
    @Published var isLoading = false
    @Published var draggedItem: PinnedNoteWithContent?

    private var refreshTimer: Timer?
    private var lastUpdatedTimestamp: TimeInterval = 0

    func getGreeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 {
            return "Good Morning"
        } else if hour < 18 {
            return "Good Afternoon"
        } else {
            return "Good Night"
        }
    }

    func loadPinnedNotes(after: TimeInterval = 0) async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Use simple getPinnedNodes() that returns note_id and note_exists
            let pinnedNodes = try await APIService.shared.getPinnedNodes()

            print("📊 Received \(pinnedNodes.count) pinned nodes from API")

            // Filter only notes with actual content (noteExists must be true)
            // Use the full ListNode to preserve all fields for updates
            let filteredNodes = pinnedNodes
                .filter { node in
                    // Debug each node
                    print("  Node: \(node.text), noteId: \(node.noteId ?? "nil"), noteExists: \(node.noteExists ?? false), pinnedPos: \(node.pinnedPos ?? 0)")

                    // Check both noteExists (has actual content) AND noteId
                    // API correctly returns noteExists based on whether note has content
                    return node.noteExists == true && node.noteId != nil && !(node.noteId?.isEmpty ?? true)
                }
                .sorted { ($0.pinnedPos ?? 0) < ($1.pinnedPos ?? 0) } // Sort by pinned_pos

            print("📌 Filtered to \(filteredNodes.count) notes with content")

            // Print the sorted order
            print("📋 Sorted order:")
            for (index, node) in filteredNodes.enumerated() {
                print("  [\(index)] \(node.text): pinnedPos=\(node.pinnedPos ?? 0)")
            }

            // Check if we need to normalize positions (if any duplicates exist)
            let needsNormalization = await checkAndNormalizePinnedPositions(filteredNodes)

            if needsNormalization {
                // Reload after normalization
                print("🔄 Reloading after normalization...")
                let refreshedNodes = try await APIService.shared.getPinnedNodes()
                pinnedNotesWithContent = refreshedNodes
                    .filter { node in
                        node.noteExists == true && node.noteId != nil && !(node.noteId?.isEmpty ?? true)
                    }
                    .sorted { ($0.pinnedPos ?? 0) < ($1.pinnedPos ?? 0) }
            } else {
                pinnedNotesWithContent = filteredNodes
            }

            // Update localStorage equivalent (UserDefaults)
            let hasPinned = !pinnedNotesWithContent.isEmpty
            UserDefaults.standard.set(hasPinned, forKey: "hasPinnedNodes")

            // Update last timestamp
            lastUpdatedTimestamp = Date().timeIntervalSince1970 * 1000
        } catch {
            print("❌ Error loading pinned notes: \(error)")
        }
    }

    func checkAndNormalizePinnedPositions(_ nodes: [PinnedNoteWithContent]) async -> Bool {
        // Check if any nodes have duplicate pinnedPos values
        var seenPositions = Set<Int64>()
        var hasDuplicates = false

        for node in nodes {
            if let pos = node.pinnedPos {
                if seenPositions.contains(pos) {
                    hasDuplicates = true
                    print("⚠️ Found duplicate pinnedPos: \(pos)")
                    break
                }
                seenPositions.insert(pos)
            }
        }

        guard hasDuplicates else {
            print("✅ All pinnedPos values are unique")
            return false
        }

        print("🔧 Normalizing pinnedPos values to be sequential...")

        // Normalize positions: assign sequential values with large gaps (100000 apart)
        let basePosition: Int64 = 100000
        let increment: Int64 = 100000

        for (index, node) in nodes.enumerated() {
            let newPosition = basePosition + (Int64(index) * increment)

            print("  Updating \(node.text): \(node.pinnedPos ?? 0) → \(newPosition)")

            do {
                let updateRequest = NodeUpdateRequest(
                    id: node.id,
                    parentId: node.parentId,
                    pos: node.pos,
                    text: node.text,
                    checked: node.checked,
                    checkedDate: node.checkedDate,
                    collapsed: node.collapsed,
                    pinnedPos: newPosition,
                    noteId: node.noteId,
                    fileId: node.fileId
                )

                _ = try await APIService.shared.upsertNode(updateRequest)
                print("  ✅ Updated \(node.text) to pinnedPos=\(newPosition)")
            } catch {
                print("  ❌ Failed to update \(node.text): \(error)")
            }
        }

        print("✅ Normalization complete")
        return true
    }

    func startPeriodicRefresh() {
        // Refresh every 10 seconds using the last updated timestamp
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.loadPinnedNotes(after: self?.lastUpdatedTimestamp ?? 0)
            }
        }
    }

    func stopPeriodicRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    func updatePinnedPositions(_ reorderedNotes: [PinnedNoteWithContent]) async {
        // Find the dragged node by comparing arrays
        print("🔍 Comparing reordered vs current order:")
        var draggedNode: PinnedNoteWithContent?
        var newIndex: Int = 0
        var oldIndex: Int = 0

        // Find the node whose position changed the MOST (that's the dragged one)
        var maxPositionChange = 0

        for (index, note) in reorderedNotes.enumerated() {
            let currentOldIndex = pinnedNotesWithContent.firstIndex(where: { $0.id == note.id }) ?? index
            let positionChange = abs(currentOldIndex - index)

            print("  [\(index)] \(note.text): oldIndex=\(currentOldIndex), pinnedPos=\(note.pinnedPos ?? 0), change=\(positionChange)")

            if positionChange > maxPositionChange {
                draggedNode = note
                newIndex = index
                oldIndex = currentOldIndex
                maxPositionChange = positionChange
                print("  ⚠️ Position change detected for: \(note.text) (moved by \(positionChange) positions)")
            }
        }

        guard let draggedNode = draggedNode, maxPositionChange > 0 else {
            print("⚠️ No position change detected")
            return
        }

        print("🔄 Dragging '\(draggedNode.text)' from index \(oldIndex) to \(newIndex)")

        // Calculate new position using fractional positioning
        let newPinnedPos: Int64

        if newIndex == 0 {
            // Dropped at the beginning
            let nextNode = reorderedNotes[1]
            let nextPos = nextNode.pinnedPos ?? Int64(1000)
            // Position before the first item
            newPinnedPos = max(nextPos / 2, nextPos - 1000)
            print("📍 Dropped at beginning: nextPos=\(nextPos), newPos=\(newPinnedPos)")
        } else if newIndex == reorderedNotes.count - 1 {
            // Dropped at the end
            let prevNode = reorderedNotes[newIndex - 1]
            let prevPos = prevNode.pinnedPos ?? Int64(newIndex * 1000)
            newPinnedPos = prevPos + 1000
            print("📍 Dropped at end: prevPos=\(prevPos), newPos=\(newPinnedPos)")
        } else {
            // Dropped in middle - calculate between previous and next
            let prevNode = reorderedNotes[newIndex - 1]
            let nextNode = reorderedNotes[newIndex + 1]

            let prevPos = prevNode.pinnedPos ?? Int64((newIndex - 1) * 1000)
            let nextPos = nextNode.pinnedPos ?? Int64((newIndex + 1) * 1000)

            // If positions are the same or too close, use a larger increment
            if nextPos - prevPos <= 1 {
                newPinnedPos = prevPos + 1000
                print("📍 Dropped in middle (positions too close): prevPos=\(prevPos), nextPos=\(nextPos), newPos=\(newPinnedPos)")
            } else {
                newPinnedPos = (prevPos + nextPos) / 2
                print("📍 Dropped in middle: prevPos=\(prevPos), nextPos=\(nextPos), newPos=\(newPinnedPos)")
            }
        }

        // Update the dragged node
        do {
            let updateRequest = NodeUpdateRequest(
                id: draggedNode.id,
                parentId: draggedNode.parentId,
                pos: draggedNode.pos,
                text: draggedNode.text,
                checked: draggedNode.checked,
                checkedDate: draggedNode.checkedDate,
                collapsed: draggedNode.collapsed,
                pinnedPos: newPinnedPos,
                noteId: draggedNode.noteId,
                fileId: draggedNode.fileId
            )

            print("📤 Sending update request for \(draggedNode.text) with pinnedPos=\(newPinnedPos)")
            print("   Full request: id=\(updateRequest.id), pinnedPos=\(updateRequest.pinnedPos ?? 0)")

            _ = try await APIService.shared.upsertNode(updateRequest)
            print("✅ API Updated pinned_pos for \(draggedNode.text) to \(newPinnedPos)")

            // Update local state immediately without refreshing from server
            if let index = pinnedNotesWithContent.firstIndex(where: { $0.id == draggedNode.id }) {
                var updatedNode = pinnedNotesWithContent[index]
                updatedNode.pinnedPos = newPinnedPos
                pinnedNotesWithContent[index] = updatedNode

                // Re-sort by pinned_pos
                pinnedNotesWithContent.sort { ($0.pinnedPos ?? 0) < ($1.pinnedPos ?? 0) }
                print("✅ Local state updated and sorted")
            }
        } catch {
            print("❌ Error updating pinned_pos for \(draggedNode.text): \(error)")
        }
    }

    deinit {
        // Invalidate timer synchronously to avoid retain cycle
        refreshTimer?.invalidate()
    }
}

// Drop delegate for reordering
struct DropViewDelegate: DropDelegate {
    let item: PinnedNoteWithContent
    @Binding var items: [PinnedNoteWithContent]
    @Binding var draggedItem: PinnedNoteWithContent?
    let onReorder: ([PinnedNoteWithContent]) -> Void

    func performDrop(info: DropInfo) -> Bool {
        print("🎯 performDrop called for item: \(item.text)")
        print("   draggedItem: \(draggedItem?.text ?? "nil")")
        print("   items count: \(items.count)")

        // Check if items were actually reordered
        let hasChanges = items.enumerated().contains { index, note in
            let expectedIndex = items.firstIndex(where: { $0.id == note.id })
            return expectedIndex != index
        }
        print("   hasChanges: \(hasChanges)")

        // Always call onReorder - dropEntered has already moved items
        print("📞 Calling onReorder with \(items.count) items")
        onReorder(items)

        // Clear dragged item after calling onReorder
        DispatchQueue.main.async {
            self.draggedItem = nil
        }

        return true
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        print("🔄 dropUpdated called for item: \(item.text)")
        return DropProposal(operation: .move)
    }

    func validateDrop(info: DropInfo) -> Bool {
        print("✓ validateDrop called for item: \(item.text)")
        return true
    }

    func dropEntered(info: DropInfo) {
        print("👉 dropEntered called for item: \(item.text)")
        guard let draggedItem = draggedItem else {
            print("   ⚠️ No draggedItem in dropEntered")
            return
        }
        print("   draggedItem: \(draggedItem.text)")

        if draggedItem.id != item.id {
            let from = items.firstIndex(of: draggedItem)!
            let to = items.firstIndex(of: item)!
            print("   Moving from index \(from) to \(to)")

            if items[from].id != items[to].id {
                withAnimation {
                    items.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
                }
                print("   ✅ Visual reorder complete")

                // CRITICAL: Persist changes immediately since performDrop may not be called
                print("📞 Calling onReorder from dropEntered with \(items.count) items")
                onReorder(items)
            }
        }
    }
}

#Preview {
    DashView(selectedNodeId: .constant(nil))
}
