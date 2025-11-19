//
//  SidebarView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
import Combine

struct SidebarView: View {
    @StateObject private var viewModel = SidebarViewModel()
    @Binding var selectedNodeId: String?
    @Binding var isCollapsed: Bool
    let onNodeSelect: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            if !isCollapsed {
                // Search bar with collapse button
                HStack(spacing: Spacing.md) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(LocusColors.textSecondary)
                            .font(.system(size: 12))

                        TextField("Search", text: $viewModel.searchTerm)
                            .textFieldStyle(PlainTextFieldStyle())
                            .font(Typography.input)
                    }
                    .padding(.horizontal, Spacing.xs)
                    .padding(.vertical, Spacing.md)

                    // Collapse button (desktop only)
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            isCollapsed = true
                        }
                    }) {
                        Image(systemName: "sidebar.left")
                            .foregroundColor(LocusColors.textSecondary)
                            .font(.system(size: 14))
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.sm)
                .padding(.top, Spacing.lg)

                ScrollView {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        if viewModel.searchTerm.count < 3 {
                            // Dash Section - Show only if there are pinned nodes
                            if !viewModel.pinnedNodes.isEmpty {
                                SectionHeader(title: "Views")

                                Button(action: {
                                    onNodeSelect("__dash__")
                                }) {
                                    HStack(spacing: Spacing.md) {
                                        Image(systemName: "square.grid.2x2")
                                            .foregroundColor(LocusColors.textSecondary)
                                            .frame(width: 6, height: 6)
                                            .font(.system(size: 12))

                                        Text("Dash")
                                            .font(Typography.nodeText)
                                            .foregroundColor(LocusColors.textPrimary)
                                            .lineLimit(1)

                                        Spacer()
                                    }
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(selectedNodeId == "__dash__" ? LocusColors.borderDark.opacity(0.2) : LocusColors.clear)
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }

                            // Pinned Section
                            SectionHeader(title: "Pinned")

                            // Home node (always first)
                            NodeRow(
                                node: ListNode(
                                    id: "home",
                                    parentId: nil,
                                    pos: nil,
                                    text: "Home",
                                    checked: nil,
                                    checkedDate: nil,
                                    collapsed: nil,
                                    pinnedPos: 0,
                                    noteId: nil,
                                    fileId: nil,
                                    noteExists: nil,
                                    scribbleExists: nil,
                                    createdAt: nil,
                                    updatedAt: nil
                                ),
                                isSelected: selectedNodeId == "home",
                                onTap: {
                                    onNodeSelect("home")
                                }
                            )

                            ForEach(viewModel.pinnedNodes.sorted(by: { $0.pinnedPos ?? 0 < $1.pinnedPos ?? 0 })) { node in
                                NodeRow(
                                    node: node,
                                    isSelected: selectedNodeId == node.id,
                                    onTap: {
                                        onNodeSelect(node.id)
                                    }
                                )
                            }
                        } else {
                            // Search Results
                            ForEach(viewModel.searchResults) { node in
                                NodeRow(
                                    node: node,
                                    isSelected: selectedNodeId == node.id,
                                    onTap: {
                                        onNodeSelect(node.id)
                                    }
                                )
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                }

                Spacer()

                // Settings button at bottom
                Button(action: {
                    onNodeSelect("__settings__")
                }) {
                    HStack(spacing: Spacing.sm) {
                        Circle()
                            .fill(LocusColors.textSecondary)
                            .frame(width: 4, height: 4)
                        Text("Settings")
                            .font(Typography.body)
                            .foregroundColor(LocusColors.textPrimary)
                        Spacer()
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(selectedNodeId == "__settings__" ? LocusColors.borderDark.opacity(0.2) : LocusColors.backgroundSecondary)
                    .cornerRadius(6)
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.md)
            } else {
                // Collapsed sidebar view
                VStack(spacing: Spacing.xl) {
                    // Expand button
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            isCollapsed = false
                        }
                    }) {
                        Image(systemName: "sidebar.left")
                            .foregroundColor(LocusColors.textSecondary)
                            .font(.system(size: 14))
                    }
                    .buttonStyle(PlainButtonStyle())

                    // Home button
                    Button(action: {
                        onNodeSelect("home")
                    }) {
                        Image(systemName: "house")
                            .foregroundColor(LocusColors.textSecondary)
                            .font(.system(size: 14))
                    }
                    .buttonStyle(PlainButtonStyle())

                    // Dash button - show only if there are pinned notes
                    if !viewModel.pinnedNodes.isEmpty {
                        Button(action: {
                            onNodeSelect("__dash__")
                        }) {
                            Image(systemName: "square.grid.2x2")
                                .foregroundColor(LocusColors.textSecondary)
                                .font(.system(size: 14))
                        }
                        .buttonStyle(PlainButtonStyle())
                    }

                    Spacer()

                    // Settings button
                    Button(action: {
                        onNodeSelect("__settings__")
                    }) {
                        Image(systemName: "gearshape")
                            .foregroundColor(LocusColors.textSecondary)
                            .font(.system(size: 14))
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.vertical, Spacing.md)
            }
        }
        .frame(width: isCollapsed ? 48 : 256)
        .background(LocusColors.backgroundSecondary)
        .task {
            await viewModel.loadPinnedNodes()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshSidebar"))) { _ in
            Task {
                await viewModel.loadPinnedNodes()
            }
        }
    }
}

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(Typography.sectionHeader)
            .foregroundColor(LocusColors.textSecondary)
            .padding(.horizontal, Spacing.sm)
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.xxs)
    }
}

struct NodeRow: View {
    let node: ListNode
    let isSelected: Bool
    let onTap: () -> Void
    @State private var isHovering: Bool = false

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.md) {
                Circle()
                    .fill(LocusColors.textSecondary)
                    .opacity(0.8)
                    .frame(width: 6, height: 6)

                Text(node.text)
                    .font(Typography.nodeText)
                    .foregroundColor(LocusColors.textPrimary)
                    .lineLimit(1)

                Spacer()
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isSelected || isHovering ? LocusColors.borderDark.opacity(0.2) : LocusColors.clear)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .onHover { isHovered in
            withAnimation(.easeInOut(duration: 0.15)) {
                isHovering = isHovered
            }
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

struct ArtifactRow: View {
    let title: String
    let isSelected: Bool

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(LocusColors.textSecondary)
                .frame(width: 4, height: 4)

            Text(title)
                .font(Typography.body)
                .foregroundColor(LocusColors.textPrimary)

            Spacer()
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xxs)
        .background(isSelected ? LocusColors.backgroundSecondary.opacity(0.6) : LocusColors.clear)
        .cornerRadius(Spacing.xxs)
    }
}

// ViewModel for Sidebar
@MainActor
class SidebarViewModel: ObservableObject {
    @Published var searchTerm: String = ""
    @Published var pinnedNodes: [ListNode] = []
    @Published var searchResults: [ListNode] = []
    @Published var isLoading = false

    private var searchTask: Task<Void, Never>?
    private var refreshTimer: Timer?

    init() {
        // Setup search debouncing
        Task {
            for await searchText in $searchTerm.values {
                searchTask?.cancel()

                if searchText.count >= 3 {
                    searchTask = Task {
                        try? await Task.sleep(nanoseconds: 400_000_000) // 400ms debounce
                        if !Task.isCancelled {
                            await performSearch(query: searchText)
                        }
                    }
                } else {
                    searchResults = []
                }
            }
        }

        // Setup refresh timer - every 10 seconds
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.loadPinnedNodes()
            }
        }
    }

    func loadPinnedNodes() async {
        do {
            pinnedNodes = try await APIService.shared.getPinnedNodes()
        } catch {
            print("Error loading pinned nodes: \(error)")
        }
    }

    func performSearch(query: String) async {
        do {
            searchResults = try await APIService.shared.searchNodes(query: query)
        } catch {
            print("Error searching nodes: \(error)")
        }
    }

    deinit {
        refreshTimer?.invalidate()
    }
}

#Preview {
    SidebarView(
        selectedNodeId: .constant("home"),
        isCollapsed: .constant(false),
        onNodeSelect: { _ in }
    )
}
