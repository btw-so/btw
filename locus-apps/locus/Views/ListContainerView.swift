//
//  ListContainerView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI

struct ListContainerView: View {
    @StateObject private var viewModel: ListViewModel
    @State private var activeTab: ContentTab = .note
    @State private var isListCollapsed = false
    let nodeId: String
    let onNodeSelect: (String) -> Void

    init(nodeId: String, onNodeSelect: @escaping (String) -> Void) {
        self.nodeId = nodeId
        _viewModel = StateObject(wrappedValue: ListViewModel(selectedNodeId: nodeId))
        self.onNodeSelect = onNodeSelect
    }

    enum ContentTab {
        case list
        case note
        case scribble
        case file
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with breadcrumbs, node title and actions
            if let currentNode = viewModel.currentNode {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    // Breadcrumbs
                    if !viewModel.breadcrumbs.isEmpty {
                        BreadcrumbView(
                            breadcrumbs: viewModel.breadcrumbs,
                            onNodeSelect: { nodeId in
                                onNodeSelect(nodeId)
                            }
                        )
                    }

                    HStack(spacing: Spacing.md) {
                        // Node title with pin
                        EditableNodeTitle(
                            nodeId: currentNode.id,
                            initialText: currentNode.text,
                            isPinned: currentNode.isPinned,
                            onTogglePin: {
                                viewModel.togglePin(currentNode.id)
                            },
                            onTextChange: { newText in
                                viewModel.updateNodeText(currentNode.id, text: newText)
                            },
                            viewModel: viewModel
                        )

                        // Share buttons
                        ShareButtonsRow(node: currentNode)
                    }
                }
                .padding(.horizontal, Spacing.xxl)
                .padding(.bottom, Spacing.sm)
                .background(LocusColors.backgroundPrimary)

                Rectangle()
                    .fill(LocusColors.borderStandard)
                    .frame(height: 2)
            }

            // Main content area - List and Content side by side
            HStack(spacing: 0) {
                if !isListCollapsed {
                    // List view (left side)
                    ListViewPanel(
                        viewModel: viewModel,
                        onNodeSelect: onNodeSelect,
                        onCollapseList: {
                            isListCollapsed = true
                            // Switch to list tab if available
                            if let currentNode = viewModel.currentNode {
                                let children = viewModel.getChildNodes(of: currentNode.id)
                                let hasNonEmptyChildren = !children.isEmpty

                                if hasNonEmptyChildren {
                                    activeTab = .list
                                } else if currentNode.fileId != nil {
                                    activeTab = .file
                                } else {
                                    activeTab = .note
                                }
                            }
                        }
                    )
                    .frame(width: 368)

                    Rectangle()
                        .fill(LocusColors.borderStandard)
                        .frame(width: 2)
                }

                // Content view (right side)
                ContentViewPanel(
                    viewModel: viewModel,
                    activeTab: $activeTab,
                    isListCollapsed: $isListCollapsed,
                    onNodeSelect: onNodeSelect,
                    onCollapseList: {
                        isListCollapsed = true
                        // Switch to list tab if available
                        if let currentNode = viewModel.currentNode {
                            let children = viewModel.getChildNodes(of: currentNode.id)
                            let hasNonEmptyChildren = !children.isEmpty

                            if hasNonEmptyChildren {
                                activeTab = .list
                            } else if currentNode.fileId != nil {
                                activeTab = .file
                            } else {
                                activeTab = .note
                            }
                        }
                    }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            await viewModel.loadList()
        }
        .onChange(of: nodeId) { newNodeId in
            viewModel.selectNode(newNodeId)
        }
    }
}

struct ListViewPanel: View {
    @ObservedObject var viewModel: ListViewModel
    let onNodeSelect: (String) -> Void
    let onCollapseList: () -> Void
    @State private var isUploadingFile = false

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomTrailing) {
                // Node list
                ScrollView {
                    if let rootNode = viewModel.currentNode {
                        NodeListView(
                            nodes: viewModel.getChildNodes(of: rootNode.id),
                            nodeDBMap: viewModel.nodeDBMap,
                            nodeUIMap: viewModel.nodeUIMap,
                            level: 0,
                            onNodeUpdate: { update in
                                viewModel.upsertNode(update)
                            },
                            onNodeSelect: { nodeId in
                                onNodeSelect(nodeId)
                            },
                            viewModel: viewModel
                        )
                        .padding(.top, Spacing.lg * 2)
                        .padding(.trailing, Spacing.lg * 2)
                        .padding(.leading, Spacing.lg)
                        .padding(.bottom, Spacing.lg + 60) // Add bottom padding for the button
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height) // Lock to geometry size
                .background(LocusColors.backgroundPrimary)

                // Floating file upload button
                FloatingFileUploadButton(
                onFileSelected: { fileURL in
                    Task {
                        isUploadingFile = true
                        await viewModel.uploadFile(fileURL)
                        isUploadingFile = false
                    }
                },
                isUploading: $isUploadingFile
            )
            .padding(.trailing, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
    }
}
}

struct ContentViewPanel: View {
    @ObservedObject var viewModel: ListViewModel
    @Binding var activeTab: ListContainerView.ContentTab
    @Binding var isListCollapsed: Bool
    let onNodeSelect: (String) -> Void
    let onCollapseList: () -> Void

    private var hasNonEmptyChildren: Bool {
        guard let currentNode = viewModel.currentNode else { return false }
        let children = viewModel.getChildNodes(of: currentNode.id)
        return !children.isEmpty
    }

    private var availableTabs: [ListContainerView.ContentTab] {
        guard let currentNode = viewModel.currentNode else { return [] }
        var tabs: [ListContainerView.ContentTab] = []

        if isListCollapsed {
            // When list is collapsed, show List tab if there are children
//            if hasNonEmptyChildren {
                tabs.append(.list)
//            }

            // Show File tab if node has a file (always has content)
            if currentNode.fileId != nil {
                tabs.append(.file)
            }

            // Show Note tab if there's no file
            if currentNode.fileId == nil {
                tabs.append(.note)
            }

            // Show Scribble tab if there's no file
            if currentNode.fileId == nil {
                tabs.append(.scribble)
            }
        } else {
            // When list is expanded
            if currentNode.fileId != nil {
                // Show File tab if node has a file
                tabs.append(.file)
            } else {
                // Show Note/Scribble if no file
                tabs.append(.note)
                tabs.append(.scribble)
            }
        }

        return tabs
    }

    var body: some View {
        VStack(spacing: 0) {
            if let currentNode = viewModel.currentNode {
                // Tab bar
                HStack(spacing: Spacing.md) {
                    // Tabs
                    ForEach(availableTabs, id: \.self) { tab in
                        TabButton(
                            title: tabTitle(for: tab, node: currentNode),
                            isActive: activeTab == tab,
                            hasContent: hasContent(for: tab, node: currentNode),
                            action: { activeTab = tab }
                        )
                    }

                    Spacer()

                    // Collapse/Expand button (always at far right of tabs)
                    if isListCollapsed {
                        // Expand button
                        Button(action: {
                            isListCollapsed = false
                            // Switch to appropriate tab after expanding
                            if currentNode.fileId != nil {
                                activeTab = .note
                            } else if activeTab == .list || activeTab == .file {
                                activeTab = .note
                            }
                        }) {
                            Image(systemName: "sidebar.left")
                                .font(.system(size: 14))
                                .foregroundColor(LocusColors.textSecondary)
                                .frame(width: 32, height: 32)
                        }
                        .buttonStyle(PlainButtonStyle())
                    } else {
                        // Collapse button
                        Button(action: onCollapseList) {
                            Image(systemName: "sidebar.right")
                                .font(.system(size: 14))
                                .foregroundColor(LocusColors.textSecondary)
                                .frame(width: 32, height: 32)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.trailing, Spacing.lg * 1.5 + 2)
                .padding(.leading, Spacing.lg * 1.8 + 2)
                .padding(.vertical, Spacing.sm)

                // Tab content
                if activeTab == .list && isListCollapsed {
                    // Show list in main area
                    ScrollView {
                        if let rootNode = viewModel.currentNode {
                            NodeListView(
                                nodes: viewModel.getChildNodes(of: rootNode.id),
                                nodeDBMap: viewModel.nodeDBMap,
                                nodeUIMap: viewModel.nodeUIMap,
                                level: 0,
                                onNodeUpdate: { update in
                                    viewModel.upsertNode(update)
                                },
                                onNodeSelect: { nodeId in
                                    onNodeSelect(nodeId)
                                },
                                viewModel: viewModel
                            )
                            .padding(.top, Spacing.lg * 2)
                            .padding(.trailing, Spacing.lg * 2)
                            .padding(.leading, Spacing.lg)
                            .padding(.bottom, Spacing.lg)
                        }
                    }
                } else if activeTab == .file, let fileId = currentNode.fileId {
                    FilePreviewView(fileId: fileId, nodeTitle: currentNode.text)
                        .id(fileId) // Force re-render when fileId changes
                } else if activeTab == .note {
                    // Use node's own ID as note ID if noteId is not set
                    NoteEditorView(noteId: currentNode.noteId ?? currentNode.id)
                        .id(currentNode.noteId ?? currentNode.id) // Force re-render when note changes
                } else if activeTab == .scribble {
                    ScribbleView(scribbleId: currentNode.noteId ?? currentNode.id)
                        .id(currentNode.noteId ?? currentNode.id)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .background(LocusColors.backgroundPrimary)
        .onChange(of: viewModel.currentNode?.id) { _ in
            // Update tab when node changes - use DispatchQueue to avoid modifying state during view update
            DispatchQueue.main.async {
                if let currentNode = viewModel.currentNode {
                    if currentNode.fileId != nil {
                        activeTab = .file
                    } else if activeTab == .file {
                        // Switch away from file tab if new node doesn't have a file
                        activeTab = .note
                    }
                }
            }
        }
    }

    private func tabTitle(for tab: ListContainerView.ContentTab, node: ListNode) -> String {
        switch tab {
        case .list:
            return "List"
        case .file:
            return "File"
        case .note:
            return "Note"
        case .scribble:
            return "Scribble"
        }
    }

    private func hasContent(for tab: ListContainerView.ContentTab, node: ListNode) -> Bool {
        switch tab {
        case .list:
            return hasNonEmptyChildren
        case .file:
            return true // Files always have content
        case .note:
            return node.safeNoteExists
        case .scribble:
            return node.safeScribbleExists
        }
    }
}

struct EditableNodeTitle: View {
    let nodeId: String
    let initialText: String
    let isPinned: Bool
    let onTogglePin: () -> Void
    let onTextChange: (String) -> Void
    let viewModel: ListViewModel

    @State private var text: String
    @State private var textUpdateTimer: Timer?
    @State private var isFocused: Bool = false
    @State private var titleHeight: CGFloat = 32

    init(nodeId: String, initialText: String, isPinned: Bool, onTogglePin: @escaping () -> Void, onTextChange: @escaping (String) -> Void, viewModel: ListViewModel) {
        self.nodeId = nodeId
        self.initialText = initialText
        self.isPinned = isPinned
        self.onTogglePin = onTogglePin
        self.onTextChange = onTextChange
        self.viewModel = viewModel
        self._text = State(initialValue: initialText)
    }

    private var shouldFocus: Bool {
        viewModel.focusedNodeId == "h1-title"
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
        HStack(spacing: Spacing.sm) {
            #if os(macOS)
            KeyboardHandlingTextField(
                text: $text,
                font: NSFont.systemFont(ofSize: 23, weight: .bold),
                textColor: NSColor.labelColor,
                placeholder: "",
                onKeyEvent: { event, cursorPos, textLen in
                    return handleKeyEvent(event, cursorPosition: cursorPos, textLength: textLen)
                },
                onFocusChange: { focused in
                    isFocused = focused
                },
                shouldFocus: shouldFocus,
                cursorPosition: cursorPosition,
                calculatedHeight: $titleHeight
            )
            .frame(height: titleHeight)
            .onChange(of: text) { newValue in
                // Pre-calculate height when text changes
                updateTitleHeightEstimate(for: newValue)

                // Debounce text updates - wait 1 second after user stops typing
                textUpdateTimer?.invalidate()
                textUpdateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
                    if newValue != initialText {
                        onTextChange(newValue)
                    }
                }
            }
            .onChange(of: initialText) { newValue in
                // Update local text when node data changes from server
                if text != newValue {
                    text = newValue
                    updateTitleHeightEstimate(for: newValue)
                }
            }
            .onAppear {
                // Calculate initial height immediately on appear
                updateTitleHeightEstimate(for: text)
            }
            #else
            TextField("", text: $text)
                .font(Typography.system(size: 23, weight: .bold))
                .textFieldStyle(PlainTextFieldStyle())
                .onChange(of: text) { newValue in
                    textUpdateTimer?.invalidate()
                    textUpdateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
                        if newValue != initialText {
                            onTextChange(newValue)
                        }
                    }
                }
                .onChange(of: initialText) { newValue in
                    if text != newValue {
                        text = newValue
                    }
                }
                .onSubmit {
                    viewModel.createNewNode(relativeTo: viewModel.selectedNodeId)
                }
            #endif

            Button(action: onTogglePin) {
                Image(systemName: isPinned ? "pin.fill" : "pin")
                    .font(Typography.system(size: 8))
                    .foregroundColor(isPinned ? LocusColors.textPrimary : LocusColors.textSecondary)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    #if os(macOS)
    private func updateTitleHeightEstimate(for text: String) {
        // Quick estimation to prevent layout jumps
        let font = NSFont.systemFont(ofSize: 23, weight: .bold)
        let attributes: [NSAttributedString.Key: Any] = [.font: font]

        // Estimate width (roughly the available space)
        let estimatedWidth: CGFloat = 600 // Approximate H1 width

        let attributedString = NSAttributedString(string: text.isEmpty ? " " : text, attributes: attributes)
        let rect = attributedString.boundingRect(
            with: NSSize(width: estimatedWidth, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        )

        let newHeight = max(32, ceil(rect.height))
        if abs(titleHeight - newHeight) > 0.5 {
            titleHeight = newHeight
        }
    }
    #endif

    #if os(macOS)
    private func handleKeyEvent(_ event: NSEvent, cursorPosition: Int, textLength: Int) -> Bool {
        let keyCode = event.keyCode

        // Enter key (36) - create first child
        // Use viewModel.selectedNodeId directly instead of nodeId prop
        if keyCode == 36 {
            viewModel.createNewNode(relativeTo: viewModel.selectedNodeId)
            return true
        }

        // Right arrow (124) at end - navigate to first child
        if keyCode == 124 && cursorPosition == textLength {
            let allNodes = viewModel.getAllNodesInOrder()
            if let firstNode = allNodes.first {
                viewModel.cursorPositionOnFocus = .start
                viewModel.focusedNodeId = firstNode.id
                viewModel.focusTrigger = UUID()
            }
            return true
        }

        // Down arrow (125) - navigate to first child
        if keyCode == 125 {
            let allNodes = viewModel.getAllNodesInOrder()
            if let firstNode = allNodes.first {
                viewModel.cursorPositionOnFocus = .start
                viewModel.focusedNodeId = firstNode.id
                viewModel.focusTrigger = UUID()
            }
            return true
        }

        return false
    }
    #endif
}

struct ShareButtonsRow: View {
    let node: ListNode
    @State private var showAlert = false
    @State private var alertMessage = ""

    var body: some View {
        HStack(spacing: Spacing.xs) {
            ShareButton(title: "SHARE LIST", icon: "link") {
                shareList()
            }
            if node.fileId != nil {
                ShareButton(title: "SHARE FILE", icon: "doc") {
                    shareFile()
                }
            } else {
                ShareButton(title: "SHARE NOTE", icon: "doc.text") {
                    shareNote()
                }
            }
            ShareButton(title: "LIST API", icon: "chevron.left.forwardslash.chevron.right") {
                shareListAPI()
            }
        }
        .alert(isPresented: $showAlert) {
            Alert(title: Text("Success"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
        }
    }

    private func shareList() {
        guard let userId = AuthManager.shared.currentUser?.id,
              let noteId = node.noteId else {
            showAlertMessage("Unable to generate share link")
            return
        }

        let hashInput = "\(node.id)-\(noteId)-\(userId)-list"
        let hash = shortHash(hashInput, key: APIService.shared.encryptionKey, length: 10)
        let listUrl = "https://web.locus.siddg.com/public/list/\(node.id)/\(hash)"

        copyToClipboard(listUrl)
        showAlertMessage("List link copied to clipboard")
    }

    private func shareNote() {
        guard let noteId = node.noteId else {
            showAlertMessage("Unable to generate share link")
            return
        }

        let hash = shortHash(noteId, key: APIService.shared.encryptionKey)
        let noteUrl = "https://web.locus.siddg.com/public/note/\(noteId)/\(hash)"

        copyToClipboard(noteUrl)
        showAlertMessage("Note link copied to clipboard")
    }

    private func shareFile() {
        guard node.fileId != nil else {
            showAlertMessage("Unable to generate share link")
            return
        }

        // TODO: Implement file sharing once we know the API endpoint
        showAlertMessage("File sharing not yet implemented")
    }

    private func shareListAPI() {
        guard let noteId = node.noteId else {
            showAlertMessage("Unable to generate API link")
            return
        }

        let hash = shortHash(noteId, key: APIService.shared.encryptionKey)
        let apiUrl = "https://api.siddg.com/list/api/child/add/\(node.id)/\(hash)"

        copyToClipboard(apiUrl)
        showAlertMessage("API link copied to clipboard")
    }

    private func showAlertMessage(_ message: String) {
        alertMessage = message
        showAlert = true
    }
}

struct ShareButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 9))
                Text(title)
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundColor(LocusColors.textSecondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(LocusColors.backgroundSecondary)
            .cornerRadius(4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct TabButton: View {
    let title: String
    let isActive: Bool
    let hasContent: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(Typography.small)
                    .foregroundColor(isActive ? LocusColors.textPrimary : LocusColors.textSecondary)

                if hasContent {
                    Image(systemName: "star.fill")
                        .font(.system(size: 8))
                        .foregroundColor(isActive ? LocusColors.textPrimary : LocusColors.textSecondary)
                }
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct BreadcrumbView: View {
    let breadcrumbs: [ListNode]
    let onNodeSelect: (String) -> Void

    var body: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(Array(breadcrumbs.dropLast().enumerated()), id: \.element.id) { index, node in
                Button(action: {
                    onNodeSelect(node.id)
                }) {
                    Text(node.text)
                        .font(Typography.small)
                        .foregroundColor(LocusColors.textSecondary)
                        .lineLimit(1)
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

                Image(systemName: "chevron.right")
                    .font(.system(size: 10))
                    .foregroundColor(LocusColors.textSecondary)
            }
        }
    }
}

#Preview {
    NavigationView {
        ListContainerView(nodeId: "home", onNodeSelect: { _ in })
    }
}
