//
//  MainAppView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
import Combine

struct MainAppView: View {
    @StateObject private var authManager = AuthManager.shared
    @State private var selectedNodeId: String? = "home"
    @AppStorage("isSidebarCollapsed") private var isSidebarCollapsed = false
    @State private var showSidebar = true

    // Check if running on iPhone (not iPad, not macOS)
    private var isIPhone: Bool {
        #if os(iOS)
        return UIDevice.current.userInterfaceIdiom == .phone
        #else
        return false
        #endif
    }

    var body: some View {
        GeometryReader { geometry in
            #if os(iOS)
            if isIPhone {
                // iPhone-specific navigation with bottom tabs
                iPhoneNavigationView(selectedNodeId: $selectedNodeId)
            } else {
                // iPad: existing sidebar navigation
                iPadView(geometry: geometry)
            }
            #else
            // macOS: existing sidebar navigation
            iPadView(geometry: geometry)
            #endif
        }
        .background(LocusColors.backgroundPrimary)
    }

    @ViewBuilder
    private func iPadView(geometry: GeometryProxy) -> some View {
        HStack(spacing: 0) {
            // Sidebar
            if geometry.size.width > 768 || showSidebar {
                SidebarView(
                    selectedNodeId: $selectedNodeId,
                    isCollapsed: $isSidebarCollapsed,
                    onNodeSelect: { nodeId in
                        selectedNodeId = nodeId
                        if geometry.size.width <= 768 {
                            showSidebar = false
                        }
                    }
                )
                .frame(width: isSidebarCollapsed ? 48 : 256)
            }

            // Main Content
            if let nodeId = selectedNodeId {
                if nodeId == "__settings__" {
                    // Show Settings page
                    SettingsView()
                        .environmentObject(authManager)
                } else {
                    // Show normal node content
                    ListContainerView(
                        nodeId: nodeId,
                        onNodeSelect: { newNodeId in
                            selectedNodeId = newNodeId
                        }
                    )
                }
            } else {
                Text("Select a node")
                    .foregroundColor(LocusColors.textSecondary)
            }
        }
    }
}

#if os(iOS)
// iPhone-specific navigation view with bottom tabs
struct iPhoneNavigationView: View {
    @Binding var selectedNodeId: String?
    @State private var activeTab: iPhoneTab = .note
    @State private var showSearch = false
    @State private var showSettings = false
    @State private var currentNodeHasFile: Bool = false
    @State private var hasListContent: Bool = false
    @State private var hasNoteContent: Bool = false
    @State private var hasScribbleContent: Bool = false
    @EnvironmentObject var authManager: AuthManager

    enum iPhoneTab: String {
        case search = "Search"
        case settings = "Settings"
        case list = "List"
        case note = "Note"
        case scribble = "Scribble"
        case file = "File"
        case back = "Back"
    }

    private var isHomeNode: Bool {
        selectedNodeId == "home"
    }

    private var availableTabs: [iPhoneTab] {
        if isHomeNode {
            // Home node: show content tabs with search and settings at the end
            if currentNodeHasFile {
                return [.list, .file, .search, .settings]
            } else {
                return [.list, .note, .scribble, .search, .settings]
            }
        } else {
            // Non-home node: show back and content tabs
            if currentNodeHasFile {
                return [.back, .list, .file]
            } else {
                return [.back, .list, .note, .scribble]
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main content area
            if showSearch {
                SearchViewiOS(
                    onNodeSelect: { nodeId in
                        selectedNodeId = nodeId
                        showSearch = false
                    },
                    onDismiss: {
                        showSearch = false
                    }
                )
            } else if showSettings {
                SettingsView()
                    .environmentObject(authManager)
            } else if let nodeId = selectedNodeId {
                // Show node content with tabs
                iPhoneNodeContentView(
                    nodeId: nodeId,
                    activeTab: $activeTab,
                    onNodeSelect: { newNodeId in
                        selectedNodeId = newNodeId
                        // Reset to note tab when navigating
                        activeTab = .note
                    },
                    onNodeLoaded: { hasFile in
                        currentNodeHasFile = hasFile
                    },
                    onContentStatusChanged: { hasList, hasNote, hasScribble in
                        hasListContent = hasList
                        hasNoteContent = hasNote
                        hasScribbleContent = hasScribble
                    }
                )
            }

            // Bottom tab bar with system material
            HStack(spacing: 0) {
                ForEach(availableTabs, id: \.self) { tab in
                    Button(action: {
                        handleTabAction(tab)
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: tabIcon(for: tab))
                                .font(.system(size: 20))
                            Text(tabLabel(for: tab))
                                .font(.system(size: 10))
                        }
                        .foregroundColor(activeTab == tab && !showSearch && !showSettings ? .blue : LocusColors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                }
            }
            .background(.ultraThinMaterial)
            .overlay(
                Rectangle()
                    .fill(LocusColors.borderStandard)
                    .frame(height: 0.5),
                alignment: .top
            )
        }
        .ignoresSafeArea(.all, edges: .bottom)
    }

    private func handleTabAction(_ tab: iPhoneTab) {
        switch tab {
        case .search:
            showSearch = true
            showSettings = false
        case .settings:
            showSettings = true
            showSearch = false
        case .back:
            selectedNodeId = "home"
            activeTab = .note
        case .list, .note, .scribble, .file:
            showSearch = false
            showSettings = false
            activeTab = tab
        }
    }

    private func tabIcon(for tab: iPhoneTab) -> String {
        switch tab {
        case .search: return "magnifyingglass"
        case .settings: return "gearshape"
        case .list: return "list.bullet"
        case .note: return "doc.text"
        case .scribble: return "pencil.and.scribble"
        case .file: return "doc"
        case .back: return "chevron.left"
        }
    }

    private func tabLabel(for tab: iPhoneTab) -> String {
        let baseName = tab.rawValue
        switch tab {
        case .list:
            return hasListContent ? "\(baseName) *" : baseName
        case .note:
            return hasNoteContent ? "\(baseName) *" : baseName
        case .scribble:
            return hasScribbleContent ? "\(baseName) *" : baseName
        default:
            return baseName
        }
    }
}

// iPhone node content view (shows List, Note, Scribble, or File based on active tab)
struct iPhoneNodeContentView: View {
    let nodeId: String
    @Binding var activeTab: iPhoneNavigationView.iPhoneTab
    let onNodeSelect: (String) -> Void
    let onNodeLoaded: (Bool) -> Void
    let onContentStatusChanged: (Bool, Bool, Bool) -> Void
    @StateObject private var viewModel: ListViewModel
    @State private var showToast = false
    @State private var toastMessage = ""

    init(nodeId: String, activeTab: Binding<iPhoneNavigationView.iPhoneTab>, onNodeSelect: @escaping (String) -> Void, onNodeLoaded: @escaping (Bool) -> Void, onContentStatusChanged: @escaping (Bool, Bool, Bool) -> Void) {
        self.nodeId = nodeId
        self._activeTab = activeTab
        self.onNodeSelect = onNodeSelect
        self.onNodeLoaded = onNodeLoaded
        self.onContentStatusChanged = onContentStatusChanged
        self._viewModel = StateObject(wrappedValue: ListViewModel(selectedNodeId: nodeId))
    }

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                // Header with breadcrumbs, node title and share buttons
                if let currentNode = viewModel.currentNode {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    // Breadcrumbs
                    if !viewModel.breadcrumbs.isEmpty {
                        HStack(spacing: Spacing.sm) {
                            ForEach(Array(viewModel.breadcrumbs.dropLast().enumerated()), id: \.element.id) { index, node in
                                Button(action: {
                                    onNodeSelect(node.id)
                                }) {
                                    Text(node.text)
                                        .font(Typography.small)
                                        .foregroundColor(LocusColors.textSecondary)
                                        .lineLimit(1)
                                }
                                .buttonStyle(PlainButtonStyle())

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10))
                                    .foregroundColor(LocusColors.textSecondary)
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                        .padding(.top, Spacing.xl)
                    }

                    HStack(spacing: Spacing.md) {
                        // Title on the left
                        Text(currentNode.text)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(LocusColors.textPrimary)
                            .lineLimit(2)

                        Spacer()

                        // Share buttons on the right
                        HStack(spacing: Spacing.sm) {
                            // Share List button
                            Button(action: {
                                shareList(node: currentNode)
                            }) {
                                Image(systemName: "list.bullet")
                                    .font(.system(size: 14))
                                    .foregroundColor(LocusColors.textSecondary)
                                    .frame(width: 32, height: 32)
                                    .background(LocusColors.backgroundSecondary)
                                    .cornerRadius(CornerRadius.sm)
                            }

                            // Share Note button
                            Button(action: {
                                shareNote(node: currentNode)
                            }) {
                                Image(systemName: "doc.text")
                                    .font(.system(size: 14))
                                    .foregroundColor(LocusColors.textSecondary)
                                    .frame(width: 32, height: 32)
                                    .background(LocusColors.backgroundSecondary)
                                    .cornerRadius(CornerRadius.sm)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.top, viewModel.breadcrumbs.isEmpty ? Spacing.xl : Spacing.xs)
                }
                .padding(.bottom, Spacing.md)
                .background(LocusColors.backgroundPrimary)

                Rectangle()
                    .fill(LocusColors.borderStandard)
                    .frame(height: 2)

                // Content based on active tab - ensure it fills available height
                Group {
                    switch activeTab {
                    case .list:
                        ScrollView {
                            NodeListView(
                                nodes: viewModel.getChildNodes(of: currentNode.id),
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
                            .padding(Spacing.lg)
                        }
                    case .note:
                        NoteEditorView(noteId: currentNode.noteId ?? currentNode.id)
                            .id(currentNode.noteId ?? currentNode.id)
                    case .scribble:
                        // Use read-only thumbnail view for iPhone
                        iPhoneScribbleThumbnailView(scribbleId: currentNode.noteId ?? currentNode.id)
                            .id(currentNode.noteId ?? currentNode.id)
                    case .file:
                        if let fileId = currentNode.fileId {
                            FilePreviewView(fileId: fileId, nodeTitle: currentNode.text)
                                .id(fileId)
                        } else {
                            Text("No file attached")
                                .foregroundColor(LocusColors.textSecondary)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                    default:
                        EmptyView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Show loading placeholder to maintain height
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        }
        .task {
            await viewModel.loadList()
            // Notify parent about whether this node has a file
            if let currentNode = viewModel.currentNode {
                onNodeLoaded(currentNode.fileId != nil)
                // Report content status for tabs
                updateContentStatus()
            }
        }
        .onChange(of: nodeId) { newNodeId in
            viewModel.selectNode(newNodeId)
            updateContentStatus()
        }
        .onChange(of: viewModel.currentNode?.fileId) { fileId in
            // Update when file status changes
            onNodeLoaded(fileId != nil)
            updateContentStatus()
        }
        .overlay(
            // Toast notification overlay
            Group {
                if showToast {
                    VStack {
                        Spacer()
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.white)
                            Text(toastMessage)
                                .foregroundColor(.white)
                                .font(.system(size: 14))
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Color.green)
                        .cornerRadius(25)
                        .shadow(radius: 10)
                        .padding(.bottom, 100) // Above bottom tab bar
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .animation(.easeInOut(duration: 0.3), value: showToast)
                }
            }
        )
    }

    private func shareList(node: ListNode) {
        guard let userId = AuthManager.shared.currentUser?.id,
              let noteId = node.noteId else {
            return
        }

        let hashInput = "\(node.id)-\(noteId)-\(userId)-list"
        let hash = shortHash(hashInput, key: APIService.shared.encryptionKey, length: 10)
        let listUrl = "https://web.locus.siddg.com/public/list/\(node.id)/\(hash)"

        copyToClipboard(listUrl)
        showShareSuccessToast()
    }

    private func shareNote(node: ListNode) {
        guard let noteId = node.noteId else {
            return
        }

        let hash = shortHash(noteId, key: APIService.shared.encryptionKey)
        let noteUrl = "https://web.locus.siddg.com/public/note/\(noteId)/\(hash)"

        copyToClipboard(noteUrl)
        showShareSuccessToast()
    }

    private func showShareSuccessToast() {
        toastMessage = "Link copied to clipboard"
        withAnimation {
            showToast = true
        }

        // Auto-dismiss after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation {
                showToast = false
            }
        }
    }

    private func updateContentStatus() {
        guard let currentNode = viewModel.currentNode else { return }

        // Check if list has children
        let hasList = viewModel.getChildNodes(of: currentNode.id).count > 0

        // For note and scribble, we assume they have content if noteId exists
        // A more accurate check would require loading the actual note/scribble data
        let hasNote = currentNode.noteId != nil
        let hasScribble = currentNode.noteId != nil

        onContentStatusChanged(hasList, hasNote, hasScribble)
    }
}

// iPhone-specific read-only scribble thumbnail view
struct iPhoneScribbleThumbnailView: View {
    let scribbleId: String
    @State private var pages: [ScribblePage] = []
    @State private var currentPageIndex: Int = 0
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Loading scribble...")
                        .font(.caption)
                        .foregroundColor(LocusColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(LocusColors.textSecondary)
                    Text("Error loading scribble")
                        .font(.headline)
                        .foregroundColor(LocusColors.textSecondary)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(LocusColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else if pages.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "pencil.and.scribble")
                        .font(.system(size: 48))
                        .foregroundColor(LocusColors.textSecondary)
                    Text("No scribble content")
                        .foregroundColor(LocusColors.textSecondary)
                    Text("Create scribbles on iPad with Apple Pencil")
                        .font(.caption)
                        .foregroundColor(LocusColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Main content area with scribble thumbnail
                VStack(spacing: 0) {
                    // Scribble image viewer - scaled to fit width
                    ScrollView(.vertical, showsIndicators: true) {
                        if let thumbnail = pages[currentPageIndex].thumbnail,
                           let imageData = Data(base64Encoded: thumbnail),
                           let uiImage = UIImage(data: imageData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxWidth: .infinity)
                                .padding(Spacing.md)
                        } else {
                            VStack(spacing: 16) {
                                Image(systemName: "photo")
                                    .font(.system(size: 48))
                                    .foregroundColor(LocusColors.textSecondary)
                                Text("No preview available")
                                    .foregroundColor(LocusColors.textSecondary)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .padding()
                        }
                    }
                    .background(LocusColors.backgroundPrimary)

                    Spacer()

                    // Bottom page navigation
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(LocusColors.borderStandard)
                            .frame(height: 2)

                        HStack(spacing: 20) {
                            Spacer()

                            // Read-only indicator
                            HStack(spacing: 6) {
                                Image(systemName: "eye")
                                    .font(.system(size: 12))
                                Text("Read-only")
                                    .font(.system(size: 12))
                            }
                            .foregroundColor(LocusColors.textSecondary)

                            Spacer()

                            // Page navigation
                            HStack(spacing: 12) {
                                Button(action: previousPage) {
                                    Image(systemName: "chevron.left")
                                        .foregroundColor(currentPageIndex > 0 ? LocusColors.textPrimary : LocusColors.textSecondary)
                                }
                                .disabled(currentPageIndex == 0)

                                Text("\(currentPageIndex + 1) / \(pages.count)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(LocusColors.textSecondary)
                                    .frame(minWidth: 50)

                                Button(action: nextPage) {
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(currentPageIndex < pages.count - 1 ? LocusColors.textPrimary : LocusColors.textSecondary)
                                }
                                .disabled(currentPageIndex >= pages.count - 1)
                            }

                            Spacer()
                        }
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.md)
                        .background(LocusColors.backgroundPrimary)
                    }
                }
            }
        }
        .task {
            await loadScribbleData()
        }
    }

    func previousPage() {
        guard currentPageIndex > 0 else { return }
        currentPageIndex -= 1
    }

    func nextPage() {
        guard currentPageIndex < pages.count - 1 else { return }
        currentPageIndex += 1
    }

    func loadScribbleData() async {
        isLoading = true
        defer { isLoading = false }

        do {
            guard let scribble = try await APIService.shared.getScribble(scribbleId: scribbleId) else {
                errorMessage = "Scribble not found"
                return
            }

            if let pagesArray = scribble.pages {
                pages = pagesArray.sorted(by: { $0.pageNumber < $1.pageNumber })
                currentPageIndex = 0
                print("✅ Loaded scribble with \(pages.count) pages for iPhone read-only viewing")
            } else {
                errorMessage = "No pages found in scribble"
            }
        } catch {
            errorMessage = "Failed to load scribble: \(error.localizedDescription)"
            print("❌ Error loading scribble for iPhone viewing: \(error)")
        }
    }
}

// Search view for iOS with real-time node search
struct SearchViewiOS: View {
    let onNodeSelect: (String) -> Void
    let onDismiss: () -> Void
    @State private var searchText = ""
    @StateObject private var viewModel = SearchViewModel()
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: Spacing.md) {
                TextField("Search nodes...", text: $searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .onChange(of: searchText) { newValue in
                        // Debounce search
                        searchTask?.cancel()
                        searchTask = Task {
                            try? await Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds
                            guard !Task.isCancelled else { return }
                            await viewModel.search(query: newValue)
                        }
                    }

                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                        searchTask?.cancel()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(LocusColors.textSecondary)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
            .background(LocusColors.backgroundPrimary)

            Rectangle()
                .fill(LocusColors.borderStandard)
                .frame(height: 2)

            // Results
            if viewModel.isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Loading nodes...")
                        .font(.caption)
                        .foregroundColor(LocusColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if searchText.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundColor(LocusColors.textSecondary)
                    Text("Search for nodes")
                        .font(.headline)
                        .foregroundColor(LocusColors.textSecondary)
                    Text("Type to search through all your nodes")
                        .font(.caption)
                        .foregroundColor(LocusColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else if viewModel.searchResults.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundColor(LocusColors.textSecondary)
                    Text("No results found")
                        .font(.headline)
                        .foregroundColor(LocusColors.textSecondary)
                    Text("Try a different search term")
                        .font(.caption)
                        .foregroundColor(LocusColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.searchResults, id: \.id) { node in
                            Button(action: {
                                onNodeSelect(node.id)
                            }) {
                                HStack(spacing: Spacing.md) {
                                    Image(systemName: "doc.text")
                                        .font(.system(size: 16))
                                        .foregroundColor(LocusColors.textSecondary)
                                        .frame(width: 24)

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(node.text)
                                            .font(.system(size: 16))
                                            .foregroundColor(LocusColors.textPrimary)
                                            .lineLimit(2)
                                            .multilineTextAlignment(.leading)

                                        if let parentPath = viewModel.getNodePath(nodeId: node.id) {
                                            Text(parentPath)
                                                .font(.system(size: 12))
                                                .foregroundColor(LocusColors.textSecondary)
                                                .lineLimit(1)
                                        }
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12))
                                        .foregroundColor(LocusColors.textSecondary)
                                }
                                .padding(.horizontal, Spacing.lg)
                                .padding(.vertical, Spacing.md)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(PlainButtonStyle())

                            Rectangle()
                                .fill(LocusColors.borderStandard)
                                .frame(height: 1)
                        }
                    }
                }
            }
        }
        .background(LocusColors.backgroundPrimary)
    }
}

// ViewModel for search functionality
class SearchViewModel: ObservableObject {
    @Published var searchResults: [ListNode] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func search(query: String) async {
        guard !query.isEmpty else {
            await MainActor.run {
                self.searchResults = []
            }
            return
        }

        isLoading = true
        defer {
            Task { @MainActor in
                isLoading = false
            }
        }

        do {
            // Search nodes using the backend API
            let nodes = try await APIService.shared.searchNodes(query: query)
            await MainActor.run {
                self.searchResults = nodes
                print("✅ Found \(nodes.count) nodes matching '\(query)'")
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Search failed: \(error.localizedDescription)"
                print("❌ Error searching nodes: \(error)")
            }
        }
    }

    func getNodePath(nodeId: String) -> String? {
        // Build breadcrumb path for the node
        var path: [String] = []
        var currentId: String? = nodeId

        // Traverse up the parent chain
        while let id = currentId, let node = searchResults.first(where: { $0.id == id }) {
            if node.id != nodeId { // Don't include the node itself
                path.insert(node.text, at: 0)
            }
            currentId = node.parentId

            // Prevent infinite loops
            if path.count > 10 {
                break
            }
        }

        return path.isEmpty ? nil : path.joined(separator: " > ")
    }
}
#endif

#Preview {
    MainAppView()
}
