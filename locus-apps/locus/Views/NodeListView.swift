//
//  NodeListView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
import Combine

struct NodeListView: View {
    let nodes: [ListNode]
    let nodeDBMap: [String: ListNode]
    let nodeUIMap: [String: NodeUIInfo]
    let level: Int
    let onNodeUpdate: (NodeUpdateRequest) -> Void
    let onNodeSelect: (String) -> Void
    let viewModel: ListViewModel

    // Check if any node in the current list has children
    var anyNodeHasChildren: Bool {
        nodes.contains { node in
            (nodeUIMap[node.id]?.children.count ?? 0) > 0
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            ForEach(nodes) { node in
                NodeRowView(
                    node: node,
                    nodeDBMap: nodeDBMap,
                    nodeUIMap: nodeUIMap,
                    level: level,
                    anyNodeHasChildren: anyNodeHasChildren,
                    onNodeUpdate: onNodeUpdate,
                    onNodeSelect: onNodeSelect,
                    viewModel: viewModel
                )
            }

            // Only show placeholder button at the root level (level 0)
            if level == 0 {
                PlaceholderNodeButton(
                    parentId: viewModel.selectedNodeId,
                    level: level,
                    anyNodeHasChildren: anyNodeHasChildren,
                    viewModel: viewModel
                )
            }
        }
    }
}

struct PlaceholderNodeButton: View {
    let parentId: String
    let level: Int
    let anyNodeHasChildren: Bool
    let viewModel: ListViewModel
    @State private var isHovered = false

    var body: some View {
        Button(action: {
            createFirstNode()
        }) {
            HStack(alignment: .center, spacing: 0) {
                // Add spacing to match chevron area if any node has children
                if anyNodeHasChildren {
                    Spacer()
                        .frame(width: 12) // Match chevron width
                }

                Spacer()
                    .frame(width: Spacing.sm)

                // Icon
                Image(systemName: "plus.circle")
                    .font(.system(size: 11))
                    .foregroundColor(LocusColors.textSecondary.opacity(0.5))
                    .frame(width: 20, height: 20)

                Spacer()
                    .frame(width: Spacing.sm)

                // Placeholder text
                Text("New node")
                    .font(Typography.body)
                    .foregroundColor(LocusColors.textSecondary.opacity(0.5))

                Spacer()
            }
            .padding(.leading, CGFloat(level * 24))
            .padding(.vertical, Spacing.xs)
            .background(isHovered ? LocusColors.backgroundSecondary.opacity(0.3) : Color.clear)
            .cornerRadius(4)
        }
        .buttonStyle(PlainButtonStyle())
        .onHover { hovering in
            isHovered = hovering
            #if os(macOS)
            if hovering {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
            #endif
        }
    }

    private func createFirstNode() {
        let newNodeId = UUID().uuidString

        // Calculate position as last child (at the end)
        let existingChildren = viewModel.getChildNodes(of: parentId)
        let newPos = if let lastChild = existingChildren.last {
            (lastChild.pos ?? 0) + 1.0
        } else {
            1.0
        }

        let newNode = ListNode(
            id: newNodeId,
            parentId: parentId,
            pos: newPos,
            text: "",
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil,
            noteExists: nil,
            scribbleExists: nil,
            createdAt: nil,
            updatedAt: nil
        )

        // Add node using processNodes() just like backend does
        viewModel.processNodes([newNode])

        // Auto-focus the new node
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            viewModel.cursorPositionOnFocus = .start
            viewModel.focusedNodeId = newNodeId
            viewModel.focusTrigger = UUID()
        }

        // Send to server
        viewModel.upsertNode(NodeUpdateRequest(
            id: newNodeId,
            parentId: parentId,
            pos: newPos,
            text: "",
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil
        ))
    }
}

struct NodeRowView: View {
    let node: ListNode
    let nodeDBMap: [String: ListNode]
    let nodeUIMap: [String: NodeUIInfo]
    let level: Int
    let anyNodeHasChildren: Bool
    let onNodeUpdate: (NodeUpdateRequest) -> Void
    let onNodeSelect: (String) -> Void
    let viewModel: ListViewModel

    @State private var isExpanded: Bool
    @State private var text: String
    @State private var isHoveringIcon: Bool = false
    @State private var isHoveringCheckbox: Bool = false
    @State private var textUpdateTimer: Timer?

    init(
        node: ListNode,
        nodeDBMap: [String: ListNode],
        nodeUIMap: [String: NodeUIInfo],
        level: Int,
        anyNodeHasChildren: Bool,
        onNodeUpdate: @escaping (NodeUpdateRequest) -> Void,
        onNodeSelect: @escaping (String) -> Void,
        viewModel: ListViewModel
    ) {
        self.node = node
        self.nodeDBMap = nodeDBMap
        self.nodeUIMap = nodeUIMap
        self.level = level
        self.anyNodeHasChildren = anyNodeHasChildren
        self.onNodeUpdate = onNodeUpdate
        self.onNodeSelect = onNodeSelect
        self.viewModel = viewModel
        self._isExpanded = State(initialValue: !(node.collapsed ?? false))
        self._text = State(initialValue: node.text)
    }

    var showCheckbox: Bool {
        node.safeChecked || isHoveringIcon || isHoveringCheckbox
    }

    var hasChildren: Bool {
        (nodeUIMap[node.id]?.children.count ?? 0) > 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Node row
            HStack(alignment: .top, spacing: 0) {
                // Expand/collapse button (only show spacer if any node in list has children)
                if hasChildren {
                    Button(action: {
                        isExpanded.toggle()
                        onNodeUpdate(NodeUpdateRequest(
                            id: node.id,
                            parentId: nil,
                            pos: nil,
                            text: nil,
                            checked: nil,
                            checkedDate: nil,
                            collapsed: !isExpanded,
                            pinnedPos: nil,
                            noteId: nil,
                            fileId: nil
                        ))
                    }) {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(Typography.system(size: 10))
                            .foregroundColor(LocusColors.textSecondary)
                            .frame(width: 12, height: 16)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .onHover { isHovered in
                        #if os(macOS)
                        if isHovered {
                            NSCursor.pointingHand.push()
                        } else {
                            NSCursor.pop()
                        }
                        #endif
                    }
                } else if anyNodeHasChildren {
                    // Show spacer only if ANY node in the list has children
                    Spacer()
                        .frame(width: 12)
                }

                Spacer()
                    .frame(width: Spacing.sm)

                // Icon and checkbox container (unified hover area)
                HStack(spacing: 0) {
                    // Node icon
                    Button(action: {
                        onNodeSelect(node.id)
                    }) {
                        NodeIcon(node: node)
                            .frame(width: 20, height: 16) // Larger clickable area
                    }
                    .buttonStyle(PlainButtonStyle())

                    // Checkbox (show on hover of icon or checkbox, or when checked)
                    if showCheckbox {
                        Spacer()
                            .frame(width: Spacing.sm / 2)

                        CheckboxView(isChecked: node.safeChecked) {
                            let formatter = ISO8601DateFormatter()
                            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                            let dateString = formatter.string(from: Date())

                            onNodeUpdate(NodeUpdateRequest(
                                id: node.id,
                                parentId: nil,
                                pos: nil,
                                text: nil,
                                checked: !node.safeChecked,
                                checkedDate: node.safeChecked ? nil : dateString,
                                collapsed: nil,
                                pinnedPos: nil,
                                noteId: nil,
                                fileId: nil
                            ))
                        }
                        .transition(.scale.combined(with: .opacity))
                        .onHover { isHovered in
                            isHoveringCheckbox = isHovered
                        }

                        Spacer()
                            .frame(width: Spacing.sm)
                    } else {
                        Spacer()
                            .frame(width: Spacing.sm)
                    }
                }
                .onHover { isHovered in
                    withAnimation(.easeInOut(duration: 0.15)) {
                        isHoveringIcon = isHovered
                    }
                    #if os(macOS)
                    if isHovered {
                        NSCursor.pointingHand.push()
                    } else {
                        NSCursor.pop()
                    }
                    #endif
                }

                // Editable text
                ContentEditableText(
                    text: $text,
                    isChecked: node.safeChecked,
                    onChange: { newText in
                        // Debounce text updates - wait 1 second after user stops typing
                        textUpdateTimer?.invalidate()
                        textUpdateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
                            if newText != node.text {
                                onNodeUpdate(NodeUpdateRequest(
                                    id: node.id,
                                    parentId: nil,
                                    pos: nil,
                                    text: newText,
                                    checked: nil,
                                    checkedDate: nil,
                                    collapsed: nil,
                                    pinnedPos: nil,
                                    noteId: nil,
                                    fileId: nil
                                ))
                            }
                        }
                    },
                    nodeId: node.id,
                    viewModel: viewModel
                )
                .onChange(of: node.text) { newValue in
                    // Update local text when node data changes from server
                    if text != newValue {
                        text = newValue
                    }
                }
            }
            .padding(.leading, CGFloat(level * 24))

            // Child nodes
            if isExpanded && hasChildren {
                let childIds = nodeUIMap[node.id]?.children ?? []
                let childNodes = childIds.compactMap { nodeDBMap[$0] }
                    .sorted { ($0.pos ?? 0) < ($1.pos ?? 0) }

                NodeListView(
                    nodes: childNodes,
                    nodeDBMap: nodeDBMap,
                    nodeUIMap: nodeUIMap,
                    level: level + 1,
                    onNodeUpdate: onNodeUpdate,
                    onNodeSelect: onNodeSelect,
                    viewModel: viewModel
                )
                .padding(.top, Spacing.md)
            }
        }
    }
}

struct NodeIcon: View {
    let node: ListNode

    var body: some View {
        ZStack {
            let iconColor = node.safeChecked ? LocusColors.textSecondary : LocusColors.textPrimary

            if node.fileId != nil {
                Image(systemName: "paperclip")
                    .font(.system(size: 11))
                    .foregroundColor(iconColor)
            } else if node.safeScribbleExists && node.safeNoteExists {
                QuillScribbleIcon(color: iconColor, size: 12)
            } else if node.safeScribbleExists {
                ScribbleIcon(color: iconColor, size: 12)
            } else if node.safeNoteExists {
                QuillIcon(color: iconColor, size: 12)
            } else {
                Circle()
                    .fill(iconColor)
                    .frame(width: 6, height: 6)
            }
        }
        .frame(width: 16, height: 16)
    }
}

struct CheckboxView: View {
    let isChecked: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                .font(Typography.small)
                .foregroundColor(isChecked ? LocusColors.textSecondary : LocusColors.textPrimary)
        }
        .buttonStyle(PlainButtonStyle())
        .frame(width: 16, height: 16)
        .onHover { isHovered in
            #if os(macOS)
            if isHovered {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
            #endif
        }
    }
}

struct ContentEditableText: View {
    @Binding var text: String
    let isChecked: Bool
    let onChange: (String) -> Void
    let nodeId: String
    let viewModel: ListViewModel
    @State private var isFocused: Bool = false
    @State private var textHeight: CGFloat = 20

    private var shouldFocus: Bool {
        viewModel.focusedNodeId == nodeId
    }

    #if os(macOS)
    private var cursorPosition: KeyboardHandlingTextField.CursorPosition? {
        guard shouldFocus else { return nil }
        switch viewModel.cursorPositionOnFocus {
        case .start:
            return .start
        case .end:
            return .end
        case .unchanged:
            return nil
        }
    }
    #endif

    var body: some View {
        #if os(macOS)
        KeyboardHandlingTextField(
            text: $text,
            font: NSFont.systemFont(ofSize: 16),
            textColor: isChecked ? NSColor.secondaryLabelColor : NSColor.labelColor,
            placeholder: "",
            onKeyEvent: { event, cursorPos, textLen in
                return handleKeyEvent(event, cursorPosition: cursorPos, textLength: textLen)
            },
            onFocusChange: { focused in
                isFocused = focused
            },
            shouldFocus: shouldFocus,
            cursorPosition: cursorPosition,
            calculatedHeight: $textHeight
        )
        .frame(height: textHeight)
        .onChange(of: text) { newValue in
            onChange(newValue)
            // Pre-calculate height when text changes to avoid flash
            updateHeightEstimate(for: newValue)
        }
        .onAppear {
            // Calculate initial height immediately on appear
            updateHeightEstimate(for: text)
        }
        #else
        TextField("", text: $text, axis: .vertical)
            .textFieldStyle(PlainTextFieldStyle())
            .font(Typography.body)
            .foregroundColor(isChecked ? LocusColors.textSecondary : LocusColors.textPrimary)
            .lineLimit(nil)
            .onChange(of: text) { newValue in
                onChange(newValue)
            }
        #endif
    }

    #if os(macOS)
    private func updateHeightEstimate(for text: String) {
        // Quick estimation to prevent layout jumps
        let font = NSFont.systemFont(ofSize: 16)
        let attributes: [NSAttributedString.Key: Any] = [.font: font]

        // Estimate width (roughly the available space)
        let estimatedWidth: CGFloat = 300 // Approximate text field width

        let attributedString = NSAttributedString(string: text.isEmpty ? " " : text, attributes: attributes)
        let rect = attributedString.boundingRect(
            with: NSSize(width: estimatedWidth, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        )

        let newHeight = max(20, ceil(rect.height))
        if abs(textHeight - newHeight) > 0.5 {
            textHeight = newHeight
        }
    }
    #endif

    #if os(macOS)
    private func handleKeyEvent(_ event: NSEvent, cursorPosition: Int, textLength: Int) -> Bool {
        let keyCode = event.keyCode
        let modifiers = event.modifierFlags

        print("🔍 KeyEvent - keyCode: \(keyCode), cursorPosition: \(cursorPosition), textLength: \(textLength)")

        // Enter key (36)
        if keyCode == 36 {
            viewModel.createNewNode(relativeTo: nodeId)
            return true
        }

        // Tab key (48)
        if keyCode == 48 {
            if modifiers.contains(.shift) {
                // Shift+Tab - outdent
                viewModel.outdentNode(nodeId)
            } else {
                // Tab - indent
                viewModel.indentNode(nodeId)
            }
            return true
        }

        // Backspace key (51) - delete node if text is empty
        if keyCode == 51 && textLength == 0 {
            print("🗑️ Backspace on empty node - deleting")
            viewModel.deleteNodeIfEmpty(nodeId)
            return true
        }

        // Arrow keys
        // Left arrow (123)
        if keyCode == 123 {
            print("⬅️ Left arrow - cursor at: \(cursorPosition)")
            if cursorPosition == 0 {
                print("✅ Navigating to previous node")
                viewModel.navigateToPreviousNode(from: nodeId, moveToEnd: true)
                return true
            }
        }

        // Right arrow (124)
        if keyCode == 124 {
            print("➡️ Right arrow - cursor at: \(cursorPosition), textLength: \(textLength)")
            if cursorPosition == textLength {
                print("✅ Navigating to next node")
                viewModel.navigateToNextNode(from: nodeId, moveToStart: true)
                return true
            }
        }

        // Up arrow (126) - same as left at position 0
        if keyCode == 126 {
            print("⬆️ Up arrow")
            viewModel.navigateToPreviousNode(from: nodeId, moveToEnd: true)
            return true
        }

        // Down arrow (125) - same as right at end
        if keyCode == 125 {
            print("⬇️ Down arrow")
            viewModel.navigateToNextNode(from: nodeId, moveToStart: true)
            return true
        }

        return false
    }
    #endif
}

// ViewModel
@MainActor
class ListViewModel: ObservableObject {
    @Published var selectedNodeId: String
    @Published var nodeDBMap: [String: ListNode] = [:]
    @Published var nodeUIMap: [String: NodeUIInfo] = [:]
    @Published var breadcrumbs: [ListNode] = []
    @Published var isLoading = false
    @Published var focusedNodeId: String? = nil // For keyboard navigation
    @Published var focusTrigger: UUID = UUID() // Trigger focus updates

    // Cursor position for focused node
    enum CursorPosition {
        case start
        case end
        case unchanged
    }
    var cursorPositionOnFocus: CursorPosition = .unchanged

    private var updatedNodeIds: Set<String> = []
    private var lastSuccessfulCallTime: Int64 = 0
    private var updateTimer: Timer?
    private var refreshTimer: Timer?

    init(selectedNodeId: String) {
        self.selectedNodeId = selectedNodeId
        setupTimers()
    }

    var currentNode: ListNode? {
        nodeDBMap[selectedNodeId]
    }

    func setupTimers() {
        // Batch update timer - every 10 seconds
        updateTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.pushUpdates()
            }
        }

        // Refresh timer - every 10 seconds
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.refreshList()
            }
        }
    }

    func loadList() async {
        isLoading = true
        do {
            // Fetch all pages using page/limit/total pattern
            var page = 1
            let limit = 200
            var totalNodesFetched = 0

            while true {
                let response = try await APIService.shared.getList(
                    id: selectedNodeId,
                    after: 0,
                    page: page,
                    limit: limit
                )

                print("📄 Loaded page \(page): \(response.nodes.count) nodes (total expected: \(response.total ?? -1))")

                // Process and display nodes immediately as they arrive
                processNodes(response.nodes)
                totalNodesFetched += response.nodes.count

                // Check if we've fetched all nodes
                if let total = response.total {
                    // Paginated response - check if we've fetched all
                    if totalNodesFetched >= total {
                        print("✅ All pages loaded (\(page) pages, \(totalNodesFetched)/\(total) total nodes)")
                        break
                    }
                } else {
                    // Non-paginated response (incremental update) - stop after first page
                    print("✅ Incremental update complete - received \(response.nodes.count) nodes")
                    break
                }

                page += 1
            }

            updateBreadcrumbs()
            lastSuccessfulCallTime = Int64(Date().timeIntervalSince1970 * 1000)
        } catch {
            print("Error loading list: \(error)")
        }
        isLoading = false
    }

    func refreshList() async {
        do {
            let response = try await APIService.shared.getList(
                id: selectedNodeId,
                after: lastSuccessfulCallTime
            )
            if !response.nodes.isEmpty {
                processNodes(response.nodes)
                lastSuccessfulCallTime = Int64(Date().timeIntervalSince1970 * 1000)
            }
        } catch {
            print("Error refreshing list: \(error)")
        }
    }

    func processNodes(_ nodes: [ListNode]) {
        for node in nodes {
            nodeDBMap[node.id] = node
        }
        buildUIMap()
    }

    func buildUIMap() {
        nodeUIMap.removeAll()
        for node in nodeDBMap.values {
            let parentKey = node.parentId ?? "root"
            if nodeUIMap[parentKey] == nil {
                nodeUIMap[parentKey] = NodeUIInfo(children: [], depth: 0)
            }
            nodeUIMap[parentKey]?.children.append(node.id)
        }
    }

    func getChildNodes(of parentId: String) -> [ListNode] {
        let childIds = nodeUIMap[parentId]?.children ?? []
        return childIds.compactMap { nodeDBMap[$0] }
            .sorted { ($0.pos ?? 0) < ($1.pos ?? 0) }
    }

    func updateBreadcrumbs() {
        breadcrumbs = []
        var current = currentNode
        var maxDepth = 3
        while let node = current, maxDepth > 0 {
            breadcrumbs.insert(node, at: 0)
            if let parentId = node.parentId {
                current = nodeDBMap[parentId]
            } else {
                current = nil
            }
            maxDepth -= 1
        }
    }

    func selectNode(_ nodeId: String) {
        selectedNodeId = nodeId
        updateBreadcrumbs()
        Task {
            await loadList()
        }
    }

    func upsertNode(_ update: NodeUpdateRequest) {
        updatedNodeIds.insert(update.id)

        // Update local state
        if var node = nodeDBMap[update.id] {
            if let text = update.text { node.text = text }
            if let checked = update.checked {
                node.checked = checked
            }
            if let checkedDate = update.checkedDate {
                node.checkedDate = checkedDate
            } else if update.checked == false {
                // Clear checkedDate when unchecking
                node.checkedDate = nil
            }
            if let collapsed = update.collapsed { node.collapsed = collapsed }
            if let pinnedPos = update.pinnedPos {
                node.pinnedPos = pinnedPos
            }
            nodeDBMap[update.id] = node
        }
    }

    func pushUpdates() async {
        guard !updatedNodeIds.isEmpty else { return }

        let nodesToUpdate = Array(updatedNodeIds)
        updatedNodeIds.removeAll()

        for nodeId in nodesToUpdate {
            if let node = nodeDBMap[nodeId] {
                let update = NodeUpdateRequest(
                    id: node.id,
                    parentId: node.parentId,
                    pos: node.pos,
                    text: node.text,
                    checked: node.checked,
                    checkedDate: node.checkedDate,
                    collapsed: node.collapsed,
                    pinnedPos: node.pinnedPos,
                    noteId: node.noteId,
                    fileId: node.fileId
                )

                do {
                    _ = try await APIService.shared.upsertNode(update)
                } catch {
                    print("Error updating node: \(error)")
                    // Re-add to update queue
                    updatedNodeIds.insert(nodeId)
                }
            }
        }
    }

    func updateNodeText(_ nodeId: String, text: String) {
        upsertNode(NodeUpdateRequest(
            id: nodeId,
            parentId: nil,
            pos: nil,
            text: text,
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil
        ))
    }

    func togglePin(_ nodeId: String) {
        if var node = nodeDBMap[nodeId] {
            let newPinnedPos: Int64? = node.pinnedPos == nil ? Int64(Date().timeIntervalSince1970 * 1000) : nil
            node.pinnedPos = newPinnedPos
            nodeDBMap[nodeId] = node

            upsertNode(NodeUpdateRequest(
                id: nodeId,
                parentId: nil,
                pos: nil,
                text: nil,
                checked: nil,
                checkedDate: nil,
                collapsed: nil,
                pinnedPos: newPinnedPos,
                noteId: nil,
                fileId: nil
            ))
        }
    }

    // MARK: - Keyboard Navigation

    /// Create a new node as a sibling or child of the given node
    func createNewNode(relativeTo nodeId: String) {
        print("🔴 createNewNode called with nodeId: \(nodeId), selectedNodeId: \(selectedNodeId)")

        guard let node = nodeDBMap[nodeId] else {
            print("❌ Node not found in nodeDBMap for nodeId: \(nodeId)")
            return
        }

        print("✅ Found node: '\(node.text)', parentId: \(node.parentId ?? "nil")")

        let newNodeId = UUID().uuidString
        let hasChildren = (nodeUIMap[nodeId]?.children.count ?? 0) > 0
        let isExpanded = !(node.collapsed ?? false)

        // Special case: if this is the selected node (H1 title), always create as child
        let isH1Title = nodeId == selectedNodeId

        print("📊 hasChildren: \(hasChildren), isExpanded: \(isExpanded), isH1Title: \(isH1Title)")

        // If node has children and is expanded, OR if it's the H1 title, create as first child
        // Otherwise, create as next sibling
        let (parentId, newPos): (String, Double)
        if (hasChildren && isExpanded) || isH1Title {
            print("✅ Creating as CHILD of node: \(nodeId)")
            // Create as first child - explicitly use the node's ID as parent
            let childIds = nodeUIMap[nodeId]?.children ?? []
            let children = childIds.compactMap { nodeDBMap[$0] }.sorted { ($0.pos ?? 0) < ($1.pos ?? 0) }
            let firstChildPos = children.first?.pos ?? 0
            parentId = nodeId  // Use nodeId directly as parent
            newPos = hasChildren ? firstChildPos / 2.0 : 1.0  // If no children, start at 1.0
            print("   parentId set to: \(parentId), newPos: \(newPos)")
        } else {
            print("✅ Creating as SIBLING of node: \(nodeId)")
            // Create as next sibling
            let newParentId = node.parentId ?? selectedNodeId
            print("   newParentId: \(newParentId)")
            let siblings = getChildNodes(of: newParentId)
            if let currentIndex = siblings.firstIndex(where: { $0.id == nodeId }) {
                let currentPos = node.pos ?? 0
                let nextPos = currentIndex + 1 < siblings.count ? siblings[currentIndex + 1].pos ?? 0 : currentPos + 1
                parentId = newParentId
                newPos = (currentPos + nextPos) / 2.0
            } else {
                parentId = newParentId
                newPos = (node.pos ?? 0) + 0.5
            }
            print("   parentId set to: \(parentId), newPos: \(newPos)")
        }

        let newNode = ListNode(
            id: newNodeId,
            parentId: parentId,
            pos: newPos,
            text: "",
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil,
            noteExists: nil,
            scribbleExists: nil,
            createdAt: nil,
            updatedAt: nil
        )

        // Add node using processNodes() just like backend does
        processNodes([newNode])

        // Auto-focus the new node
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.cursorPositionOnFocus = .start
            self?.focusedNodeId = newNodeId
            self?.focusTrigger = UUID()
        }

        // Send to server
        upsertNode(NodeUpdateRequest(
            id: newNodeId,
            parentId: parentId,
            pos: newPos,
            text: "",
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil
        ))
    }

    /// Navigate to the previous node using the web implementation logic
    func navigateToPreviousNode(from nodeId: String, moveToEnd: Bool) {
        print("📍 navigateToPreviousNode called for nodeId: \(nodeId)")

        guard let node = nodeDBMap[nodeId] else {
            print("❌ Node not found in nodeDBMap")
            return
        }

        print("🔍 Node details - text: '\(node.text)', parentId: \(node.parentId ?? "nil")")

        guard let parentId = node.parentId else {
            print("❌ Node has no parentId")
            return
        }

        print("✅ Node found, parentId: \(parentId)")

        // Debug: print parent node info
        if let parentNode = nodeDBMap[parentId] {
            print("📝 Parent node text: '\(parentNode.text)'")
        } else {
            print("⚠️ Parent node not in nodeDBMap (might be special node like 'home')")
        }

        let parentsChildren = getChildNodes(of: parentId)
        print("👶 Parent has \(parentsChildren.count) children")

        // Debug: print all sibling nodes
        for (idx, child) in parentsChildren.enumerated() {
            print("  👶 [\(idx)] \(child.text) (id: \(child.id))")
        }

        guard let currentIndex = parentsChildren.firstIndex(where: { $0.id == nodeId }) else {
            print("❌ Current node not found in parent's children")
            return
        }

        print("📊 Current index: \(currentIndex)")

        let isFirstChild = currentIndex == 0

        if isFirstChild {
            // Focus on parent - but if parent is the selected node (H1), focus on the H1 title
            print("⬆️ Is first child, parent: \(parentId), selectedNode: \(selectedNodeId)")

            if parentId == selectedNodeId {
                // Parent is the H1 title - focus it
                print("🎯 Parent is H1, setting focusedNodeId to 'h1-title'")
                cursorPositionOnFocus = moveToEnd ? .end : .unchanged
                focusedNodeId = "h1-title"  // Special ID for H1 title
                focusTrigger = UUID()
            } else {
                // Parent is another node in the list
                print("🎯 Parent is another list node")
                cursorPositionOnFocus = moveToEnd ? .end : .unchanged
                focusedNodeId = parentId
                focusTrigger = UUID()
            }
            print("🎯 Set focusedNodeId to: \(focusedNodeId ?? "nil"), trigger: \(focusTrigger)")
        } else {
            // Get elder (previous) sibling
            let elderSibling = parentsChildren[currentIndex - 1]
            print("👈 Elder sibling: \(elderSibling.id)")

            // Find the last visible descendant of elder sibling
            func getLastNode(_ nodeId: String) -> String {
                guard let childIds = nodeUIMap[nodeId]?.children,
                      !childIds.isEmpty,
                      let node = nodeDBMap[nodeId],
                      !(node.collapsed ?? false) else {
                    return nodeId
                }

                let children = childIds.compactMap { nodeDBMap[$0] }.sorted { ($0.pos ?? 0) < ($1.pos ?? 0) }
                if let lastChild = children.last {
                    return getLastNode(lastChild.id)
                }
                return nodeId
            }

            let targetNode = elderSibling.collapsed ?? false ? elderSibling.id : getLastNode(elderSibling.id)
            print("🎯 Target node: \(targetNode)")
            cursorPositionOnFocus = moveToEnd ? .end : .unchanged
            focusedNodeId = targetNode
            focusTrigger = UUID()
            print("🎯 Set focusedNodeId to: \(focusedNodeId ?? "nil"), trigger: \(focusTrigger)")
        }
    }

    /// Navigate to the next node using the web implementation logic
    func navigateToNextNode(from nodeId: String, moveToStart: Bool) {
        guard let node = nodeDBMap[nodeId] else { return }

        // Check if current node has children and is not collapsed
        if let childIds = nodeUIMap[nodeId]?.children,
           !childIds.isEmpty,
           !(node.collapsed ?? false) {
            let children = childIds.compactMap { nodeDBMap[$0] }.sorted { ($0.pos ?? 0) < ($1.pos ?? 0) }
            if let firstChild = children.first {
                cursorPositionOnFocus = moveToStart ? .start : .unchanged
                focusedNodeId = firstChild.id
                focusTrigger = UUID()
                return
            }
        }

        // Find next sibling recursively
        func getNext(_ currentId: String) -> String? {
            guard let currentNode = nodeDBMap[currentId],
                  let parentId = currentNode.parentId,
                  let parent = nodeDBMap[parentId] else {
                return nil
            }

            let siblings = getChildNodes(of: parentId)
            if let currentIndex = siblings.firstIndex(where: { $0.id == currentId }),
               currentIndex < siblings.count - 1 {
                return siblings[currentIndex + 1].id
            }

            // No next sibling, move up to parent and try again
            return getNext(parentId)
        }

        if let nextId = getNext(nodeId) {
            cursorPositionOnFocus = moveToStart ? .start : .unchanged
            focusedNodeId = nextId
            focusTrigger = UUID()
        }
    }

    /// Get all visible nodes in depth-first order
    func getAllNodesInOrder() -> [ListNode] {
        var result: [ListNode] = []

        func traverse(parentId: String) {
            let children = getChildNodes(of: parentId)
            for child in children {
                result.append(child)
                // Only traverse children if node is expanded
                if !(child.collapsed ?? false) {
                    traverse(parentId: child.id)
                }
            }
        }

        traverse(parentId: selectedNodeId)
        return result
    }

    /// Indent a node (make it a child of the previous sibling)
    func indentNode(_ nodeId: String) {
        guard let node = nodeDBMap[nodeId],
              let parentId = node.parentId else {
            print("❌ indentNode: node or parentId not found")
            return
        }

        let siblings = getChildNodes(of: parentId)
        guard let currentIndex = siblings.firstIndex(where: { $0.id == nodeId }),
              currentIndex > 0 else {
            print("❌ indentNode: not in siblings or is first sibling")
            return
        }

        // Get the previous sibling
        let previousSibling = siblings[currentIndex - 1]
        print("✅ indentNode: making \(nodeId) a child of \(previousSibling.id)")

        // Calculate new position as last child of previous sibling
        let newParentChildren = getChildNodes(of: previousSibling.id)
        let newPos = if let lastChild = newParentChildren.last {
            (lastChild.pos ?? 0) + 1
        } else {
            1.0
        }

        // Update local state immediately
        if var updatedNode = nodeDBMap[nodeId] {
            updatedNode.parentId = previousSibling.id
            updatedNode.pos = newPos
            nodeDBMap[nodeId] = updatedNode
            buildUIMap()
        }

        // Push to server
        upsertNode(NodeUpdateRequest(
            id: nodeId,
            parentId: previousSibling.id,
            pos: newPos,
            text: nil,
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil
        ))
    }

    /// Outdent a node (make it a sibling of its parent)
    func outdentNode(_ nodeId: String) {
        guard let node = nodeDBMap[nodeId],
              let parentId = node.parentId,
              let parent = nodeDBMap[parentId],
              let grandparentId = parent.parentId else {
            print("❌ outdentNode: node/parent/grandparent not found")
            return
        }

        // Cannot outdent beyond root
        guard grandparentId != "root" || parentId != selectedNodeId else {
            print("❌ outdentNode: cannot outdent beyond root")
            return
        }

        print("✅ outdentNode: making \(nodeId) a sibling of \(parentId)")

        // Calculate new position right after the parent
        let uncles = getChildNodes(of: grandparentId)
        guard let parentIndex = uncles.firstIndex(where: { $0.id == parentId }) else {
            print("❌ outdentNode: parent not found in uncles")
            return
        }

        let parentPos = parent.pos ?? 0
        let nextPos = parentIndex + 1 < uncles.count ? uncles[parentIndex + 1].pos ?? 0 : parentPos + 1
        let newPos = (parentPos + nextPos) / 2.0

        // Update local state immediately
        if var updatedNode = nodeDBMap[nodeId] {
            updatedNode.parentId = grandparentId
            updatedNode.pos = newPos
            nodeDBMap[nodeId] = updatedNode
            buildUIMap()
        }

        // Push to server
        upsertNode(NodeUpdateRequest(
            id: nodeId,
            parentId: grandparentId,
            pos: newPos,
            text: nil,
            checked: nil,
            checkedDate: nil,
            collapsed: nil,
            pinnedPos: nil,
            noteId: nil,
            fileId: nil
        ))
    }

    /// Delete a node if it's empty
    func deleteNodeIfEmpty(_ nodeId: String) {
        guard let node = nodeDBMap[nodeId],
              node.text.isEmpty else { return }

        // Find the previous node to focus on
        let allNodes = getAllNodesInOrder()
        if let currentIndex = allNodes.firstIndex(where: { $0.id == nodeId }),
           currentIndex > 0 {
            focusedNodeId = allNodes[currentIndex - 1].id
        } else {
            focusedNodeId = nil
        }

        // Remove from local state
        nodeDBMap.removeValue(forKey: nodeId)
        buildUIMap()

        // Send delete request to server
        // To delete a node, send it with parent_id set to "limbo"
        Task {
            do {
                _ = try await APIService.shared.upsertNode(NodeUpdateRequest(
                    id: nodeId,
                    parentId: "limbo",  // Setting parent_id to "limbo" marks the node for deletion
                    pos: node.pos,
                    text: node.text,
                    checked: node.checked,
                    checkedDate: node.checkedDate,
                    collapsed: node.collapsed,
                    pinnedPos: node.pinnedPos,
                    noteId: node.noteId,
                    fileId: node.fileId
                ))
            } catch {
                print("Error deleting node: \(error)")
            }
        }
    }

    /// Upload a file and create a file node
    func uploadFile(_ fileURL: URL) async {
        print("📤 Starting file upload for: \(fileURL.lastPathComponent)")

        guard let userId = AuthManager.shared.currentUser?.id else {
            print("❌ No user ID found")
            return
        }

        do {
            // Start accessing the file (required for sandboxed apps)
            guard fileURL.startAccessingSecurityScopedResource() else {
                print("❌ Cannot access file at URL: \(fileURL)")
                return
            }
            defer { fileURL.stopAccessingSecurityScopedResource() }

            // Read file data
            let fileData = try Data(contentsOf: fileURL)
            let fileName = fileURL.lastPathComponent

            print("📦 File size: \(fileData.count) bytes, name: \(fileName)")

            // Upload file to S3
            let folder = "list/\(userId)/files"
            let fileURLString = try await APIService.shared.uploadFile(
                fileData: fileData,
                fileName: fileName,
                folder: folder
            )

            print("✅ File uploaded to: \(fileURLString)")

            // Generate IDs for the new node
            let newNodeId = UUID().uuidString
            let fileId = UUID().uuidString

            // Register file in backend
            _ = try await APIService.shared.addFile(
                fileId: fileId,
                url: fileURLString,
                name: fileName
            )

            print("✅ File registered with ID: \(fileId)")

            // Calculate position for new node (add as last child of current node)
            let children = getChildNodes(of: selectedNodeId)
            let newPos = if let lastChild = children.last {
                (lastChild.pos ?? 0) + 1
            } else {
                1.0
            }

            // Create new file node
            let newNode = ListNode(
                id: newNodeId,
                parentId: selectedNodeId,
                pos: newPos,
                text: fileName,
                checked: nil,
                checkedDate: nil,
                collapsed: nil,
                pinnedPos: nil,
                noteId: UUID().uuidString,  // Generate note ID for future use
                fileId: fileId,
                noteExists: nil,
                scribbleExists: nil,
                createdAt: nil,
                updatedAt: nil
            )

            // Update local state
            await MainActor.run {
                nodeDBMap[newNodeId] = newNode
                buildUIMap()
            }

            // Send to server
            upsertNode(NodeUpdateRequest(
                id: newNodeId,
                parentId: selectedNodeId,
                pos: newPos,
                text: fileName,
                checked: nil,
                checkedDate: nil,
                collapsed: nil,
                pinnedPos: nil,
                noteId: newNode.noteId,
                fileId: fileId
            ))

            print("✅ File node created: \(newNodeId)")

        } catch {
            print("❌ Error uploading file: \(error)")
        }
    }

    deinit {
        updateTimer?.invalidate()
        refreshTimer?.invalidate()
    }
}

extension Optional where Wrapped == String {
    var isNilOrEmpty: Bool {
        return self?.isEmpty ?? true
    }
}

#Preview {
    NodeListView(
        nodes: [],
        nodeDBMap: [:],
        nodeUIMap: [:],
        level: 0,
        onNodeUpdate: { _ in },
        onNodeSelect: { _ in },
        viewModel: ListViewModel(selectedNodeId: "home")
    )
}
