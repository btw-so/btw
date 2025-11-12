//
//  ScribbleView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
#if os(iOS)
import PencilKit

struct Page: Codable {
    var pageNumber: Int
    var drawing: PKDrawing
    var thumbnail: UIImage?
    var hasUnsavedChanges: Bool = false
    var lastSavedDate: Date?

    enum CodingKeys: String, CodingKey {
        case pageNumber, drawingData, lastSavedDate
    }

    init(pageNumber: Int, drawing: PKDrawing, thumbnail: UIImage? = nil, hasUnsavedChanges: Bool = false) {
        self.pageNumber = pageNumber
        self.drawing = drawing
        self.thumbnail = thumbnail
        self.hasUnsavedChanges = hasUnsavedChanges
        self.lastSavedDate = nil
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.pageNumber = try container.decode(Int.self, forKey: .pageNumber)
        let drawingData = try container.decode(Data.self, forKey: .drawingData)
        self.drawing = try PKDrawing(data: drawingData)
        self.lastSavedDate = try container.decodeIfPresent(Date.self, forKey: .lastSavedDate)
        self.thumbnail = nil
        self.hasUnsavedChanges = false
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(pageNumber, forKey: .pageNumber)
        try container.encode(drawing.dataRepresentation(), forKey: .drawingData)
        try container.encode(lastSavedDate, forKey: .lastSavedDate)
    }
}
#endif

/// Multi-page drawing/scribble view with PencilKit
/// Uses Y.js for real-time collaboration
struct ScribbleView: View {
    let scribbleId: String

    #if os(iOS)
    @State private var pages: [Page] = []
    @State private var currentPageIndex: Int = 0
    @State private var selectedTool: DrawingTool = .pen
    @State private var selectedColor: SwiftUI.Color = .black
    @State private var toolSize: ToolSize = .medium
    @State private var showColorPicker = false
    @State private var showSizePicker = false
    @State private var showBackgroundOptions = false
    @State private var isSaving = false
    @State private var hasUnsavedChanges = false
    @State private var saveTask: Task<Void, Never>?
    @State private var isLoading = true
    @State private var backgroundType: BackgroundOptionsView.BackgroundType = .dotGrid
    @State private var gridSize: GridSize = .large
    @State private var undoManager: UndoManager?
    @State private var canUndo = false
    @State private var canRedo = false
    @State private var availableWidth: CGFloat = 0
    @State private var saveError: String?
    @State private var saveErrorDetails: String?
    @State private var showSaveError = false
    @State private var showErrorDetails = false
    @State private var isNavigatingPages = false

    // Constants
    private let saveDebounceSeconds: UInt64 = 2_000_000_000 // 2 seconds
    private let maxRequestSizeBytes = 5_000_000 // 5MB limit
    private let thumbnailCompressionQuality: CGFloat = 0.3 // 70% quality reduction for smaller size
    private let thumbnailMaxDimension: CGFloat = 800 // Max width/height for thumbnail

    enum DrawingTool {
        case pen
        case pencil
        case marker
        case eraser
        case lasso
    }

    enum ToolSize: String, CaseIterable {
        case small = "Small"
        case medium = "Medium"
        case large = "Large"
        case extraLarge = "Extra Large"

        var width: CGFloat {
            switch self {
            case .small: return 1.5
            case .medium: return 3.0
            case .large: return 6.0
            case .extraLarge: return 10.0
            }
        }

        var markerWidth: CGFloat {
            switch self {
            case .small: return 10
            case .medium: return 20
            case .large: return 35
            case .extraLarge: return 50
            }
        }
    }

    enum GridSize: String, CaseIterable {
        case small = "Small"
        case medium = "Medium"
        case large = "Large"

        var dotSize: CGFloat {
            switch self {
            case .small: return 1.5
            case .medium: return 2.0
            case .large: return 3.0
            }
        }

        var spacing: CGFloat {
            switch self {
            case .small: return 15
            case .medium: return 20
            case .large: return 30
            }
        }

        var lineWidth: CGFloat {
            switch self {
            case .small: return 0.3
            case .medium: return 0.5
            case .large: return 0.8
            }
        }
    }
    #endif

    var body: some View {
        VStack(spacing: 0) {
            #if os(iOS)
            // Main canvas area
            ZStack(alignment: .bottom) {
                if isLoading {
                    VStack {
                        ProgressView()
                        Text("Loading scribble...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if pages.isEmpty {
                    // No pages loaded - show error or create initial page
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("Failed to load scribble")
                            .font(.headline)
                        if let error = saveError {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                        Button("Create New Page") {
                            createInitialPage()
                        }
                        .buttonStyle(.bordered)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if currentPageIndex >= 0 && currentPageIndex < pages.count {
                    CanvasView(
                        drawing: Binding(
                            get: { pages[currentPageIndex].drawing },
                            set: { newDrawing in
                                if currentPageIndex < pages.count {
                                    pages[currentPageIndex].drawing = newDrawing
                                }
                            }
                        ),
                        selectedTool: $selectedTool,
                        selectedColor: selectedColor,
                        toolSize: toolSize,
                        backgroundType: backgroundType,
                        gridSize: gridSize,
                        undoManager: $undoManager,
                        onDrawingChanged: {
                            markPageAsUnsaved()
                            debouncedSave()
                            updateUndoRedoState()
                        }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .id(currentPageIndex) // Force view recreation when page changes
                    .disabled(isNavigatingPages) // Disable interaction during page navigation
                }

                // Bottom toolbar - responsive
                VStack(spacing: 0) {
                    Rectangle()
                        .fill(LocusColors.borderStandard)
                        .frame(height: 2)

                    GeometryReader { geometry in
                        HStack(spacing: 12) {
                            // Always show: Drawing tools (primary)
                            HStack(spacing: 12) {
                                ToolButton(
                                    icon: "lasso",
                                    isSelected: selectedTool == .lasso,
                                    action: { selectedTool = .lasso }
                                )

                                ToolButton(
                                    icon: "pencil.tip",
                                    isSelected: selectedTool == .pen,
                                    action: { selectedTool = .pen }
                                )

                                ToolButton(
                                    icon: "pencil",
                                    isSelected: selectedTool == .pencil,
                                    action: { selectedTool = .pencil }
                                )

                                ToolButton(
                                    icon: "highlighter",
                                    isSelected: selectedTool == .marker,
                                    action: { selectedTool = .marker }
                                )

                                ToolButton(
                                    icon: "eraser",
                                    isSelected: selectedTool == .eraser,
                                    action: { selectedTool = .eraser }
                                )
                            }

                            // Show at width > 800
                            if geometry.size.width > 800 {
                                Rectangle()
                                    .fill(LocusColors.borderStandard)
                                    .frame(width: 2, height: 30)

                                // Color picker button
                                Button(action: { showColorPicker.toggle() }) {
                                    Circle()
                                        .fill(selectedColor)
                                        .frame(width: 20, height: 20)
                                        .overlay(
                                            Circle()
                                                .stroke(SwiftUI.Color.gray.opacity(0.3), lineWidth: 1)
                                        )
                                }

                                // Size picker button
                                Button(action: { showSizePicker.toggle() }) {
                                    Image(systemName: "line.3.horizontal.decrease.circle")
                                        .font(.system(size: 20))
                                        .foregroundColor(.primary)
                                }
                            }

                            // Show at width > 700
                            if geometry.size.width > 700 {
                                Rectangle()
                                    .fill(LocusColors.borderStandard)
                                    .frame(width: 2, height: 30)

                                // Undo/Redo
                                HStack(spacing: 12) {
                                    Button(action: { performUndo() }) {
                                        Image(systemName: "arrow.uturn.backward")
                                            .foregroundColor(canUndo ? .primary : .gray)
                                    }
                                    .disabled(!canUndo)

                                    Button(action: { performRedo() }) {
                                        Image(systemName: "arrow.uturn.forward")
                                            .foregroundColor(canRedo ? .primary : .gray)
                                    }
                                    .disabled(!canRedo)
                                }
                            }

                            // Show at width > 900
                            if geometry.size.width > 900 {
                                Rectangle()
                                    .fill(LocusColors.borderStandard)
                                    .frame(width: 2, height: 30)

                                // Selection and editing tools
                                HStack(spacing: 12) {
                                    Button(action: { copySelection() }) {
                                        Image(systemName: "doc.on.doc")
                                            .foregroundColor(.primary)
                                    }

                                    Button(action: { pasteSelection() }) {
                                        Image(systemName: "doc.on.clipboard")
                                            .foregroundColor(.primary)
                                    }

                                    Button(action: { deleteSelection() }) {
                                        Image(systemName: "trash")
                                            .foregroundColor(.red)
                                    }
                                }
                            }

                            Spacer()

                            // Show at width > 650
                            if geometry.size.width > 650 {
                                // Save status indicator
                                HStack(spacing: 6) {
                                    if isSaving {
                                        ProgressView()
                                            .scaleEffect(0.7)
                                        Text("Saving...")
                                            .font(.system(size: 12))
                                            .foregroundColor(.orange)
                                    } else if hasUnsavedChanges {
                                        Image(systemName: "exclamationmark.circle.fill")
                                            .font(.system(size: 12))
                                            .foregroundColor(.orange)
                                        Text("Unsaved")
                                            .font(.system(size: 12))
                                            .foregroundColor(.orange)
                                    } else if !pages.isEmpty && pages[currentPageIndex].lastSavedDate != nil {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 12))
                                            .foregroundColor(.green)
                                        Text("Saved")
                                            .font(.system(size: 12))
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .frame(minWidth: 80)

                                // Background options
                                Button(action: { showBackgroundOptions.toggle() }) {
                                    Image(systemName: "square.grid.2x2")
                                        .foregroundColor(.primary)
                                }

                                Rectangle()
                                    .fill(LocusColors.borderStandard)
                                    .frame(width: 2, height: 30)
                            }

                            // Always show: Page navigation
                            HStack(spacing: 8) {
                                Button(action: previousPage) {
                                    Image(systemName: "chevron.left")
                                        .foregroundColor(currentPageIndex > 0 ? .primary : .gray)
                                }
                                .disabled(currentPageIndex == 0)

                                Text("\(currentPageIndex + 1) / \(pages.count)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.secondary)
                                    .frame(minWidth: 50)

                                Button(action: nextPage) {
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.primary)
                                }

                                Button(action: addPageAction) {
                                    Image(systemName: "plus.circle")
                                        .foregroundColor(.primary)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 8)
                        .background(Color(UIColor.systemBackground))
                        .onAppear {
                            availableWidth = geometry.size.width
                        }
                        .onChange(of: geometry.size.width) { newWidth in
                            availableWidth = newWidth
                        }
                    }
                    .frame(height: 64)
                }
                .background(Color(UIColor.systemBackground))
                .ignoresSafeArea(.all, edges: .bottom)
            }

            #if os(iOS)
            // Error banner
            if showSaveError, let error = saveError {
                VStack(spacing: 0) {
                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text(error)
                            .font(.system(size: 14))
                            .foregroundColor(.primary)

                        // Info button to show error details
                        if saveErrorDetails != nil {
                            Button(action: {
                                showErrorDetails = true
                            }) {
                                Image(systemName: "info.circle")
                                    .font(.system(size: 16))
                                    .foregroundColor(.blue)
                            }
                        }

                        Spacer()
                        Button(action: {
                            showSaveError = false
                            saveError = nil
                            saveErrorDetails = nil
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.orange.opacity(0.1))
                }
                .transition(.move(edge: .top))
            }
            #endif
            #else
            // macOS read-only view
            MacOSScribbleViewer(scribbleId: scribbleId)
            #endif
        }
        #if os(iOS)
        .sheet(isPresented: $showColorPicker) {
            ColorPickerView(selectedColor: $selectedColor)
        }
        .sheet(isPresented: $showSizePicker) {
            SizePickerView(selectedSize: $toolSize)
        }
        .sheet(isPresented: $showBackgroundOptions) {
            BackgroundOptionsView(
                backgroundType: $backgroundType,
                gridSize: $gridSize
            )
        }
        .alert("Save Error Details", isPresented: $showErrorDetails) {
            Button("OK", role: .cancel) { }
        } message: {
            if let details = saveErrorDetails {
                Text(details)
            }
        }
        #endif
        .task {
            #if os(iOS)
            await loadScribbleData()
            await loadUserSettings()
            #endif
        }
        #if os(iOS)
        .onDisappear {
            // Cancel pending debounced save
            saveTask?.cancel()
            // Perform final save immediately when view disappears - blocking
            Task {
                await savePageToBackendWithRetry(retryCount: 3)
            }
            // Save user settings
            saveUserSettings()
        }
        #endif
    }

    #if os(iOS)
    // MARK: - Helper Functions

    func previousPage() {
        guard currentPageIndex > 0 else { return }
        guard !isNavigatingPages else { return } // Prevent rapid page changes

        // Save and navigate - blocking operation
        Task { @MainActor in
            isNavigatingPages = true
            saveTask?.cancel()

            // Only save if there are unsaved changes
            if currentPageIndex < pages.count && pages[currentPageIndex].hasUnsavedChanges {
                print("💾 Page has unsaved changes, saving before navigation...")
                await savePageToBackendWithRetry(retryCount: 2)
                await savePageLocally()
            } else {
                print("✓ No unsaved changes, skipping save")
            }

            // Change page
            currentPageIndex -= 1

            isNavigatingPages = false
        }
    }

    func nextPage() {
        guard !isNavigatingPages else { return } // Prevent rapid page changes

        Task { @MainActor in
            isNavigatingPages = true
            saveTask?.cancel()

            // Only save if there are unsaved changes
            if currentPageIndex < pages.count && pages[currentPageIndex].hasUnsavedChanges {
                print("💾 Page has unsaved changes, saving before navigation...")
                await savePageToBackendWithRetry(retryCount: 2)
                await savePageLocally()
            } else {
                print("✓ No unsaved changes, skipping save")
            }

            // Change page or add new page
            if currentPageIndex < pages.count - 1 {
                currentPageIndex += 1
            } else {
                await addPage()
            }

            isNavigatingPages = false
        }
    }

    func addPageAction() {
        guard !isNavigatingPages else { return }

        Task { @MainActor in
            await addPage()
        }
    }

    func addPage() async {
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else {
            // If pages is empty or invalid index, just create a new page
            let newPage = Page(
                pageNumber: 0,
                drawing: PKDrawing(),
                thumbnail: nil,
                hasUnsavedChanges: false
            )
            pages.append(newPage)
            currentPageIndex = pages.count - 1
            return
        }

        // Save current page first - only if there are unsaved changes
        isNavigatingPages = true
        if pages[currentPageIndex].hasUnsavedChanges {
            print("💾 Page has unsaved changes, saving before adding new page...")
            await savePageToBackendWithRetry(retryCount: 2)
            await savePageLocally()
        } else {
            print("✓ No unsaved changes, skipping save before adding new page")
        }

        let newPage = Page(
            pageNumber: pages.count, // 0-indexed now
            drawing: PKDrawing(),
            thumbnail: nil,
            hasUnsavedChanges: false
        )
        pages.append(newPage)
        currentPageIndex = pages.count - 1
        isNavigatingPages = false
    }

    func createInitialPage() {
        let initialPage = Page(
            pageNumber: 0,
            drawing: PKDrawing(),
            thumbnail: nil,
            hasUnsavedChanges: false
        )
        pages = [initialPage]
        currentPageIndex = 0
        saveError = nil
    }

    func markPageAsUnsaved() {
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else { return }
        pages[currentPageIndex].hasUnsavedChanges = true
        hasUnsavedChanges = true
    }

    func savePageLocally() async {
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else { return }

        // Save to local cache directory
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let scribbleDir = cacheDir.appendingPathComponent("scribbles").appendingPathComponent(scribbleId)

        do {
            try FileManager.default.createDirectory(at: scribbleDir, withIntermediateDirectories: true)

            let encoder = JSONEncoder()
            let data = try encoder.encode(pages[currentPageIndex])
            let fileURL = scribbleDir.appendingPathComponent("page_\(currentPageIndex).json")
            try data.write(to: fileURL)

            print("✅ Saved page \(currentPageIndex) locally")
        } catch {
            print("❌ Error saving page locally: \(error)")
        }
    }

    func generateThumbnail(from drawing: PKDrawing) async -> UIImage? {
        // Move to background thread to avoid blocking UI
        return await Task.detached(priority: .userInitiated) { [thumbnailMaxDimension] in
            // Get the actual bounds of the drawing content
            let bounds = drawing.bounds

            // If drawing is empty, use a default size for blank page
            let imageBounds: CGRect
            if bounds.isEmpty || bounds.width < 1 || bounds.height < 1 {
                imageBounds = CGRect(x: 0, y: 0, width: 300, height: 400)
            } else {
                imageBounds = bounds
            }

            // Calculate scaled size to fit within max dimension while maintaining aspect ratio
            let scale: CGFloat
            if imageBounds.width > imageBounds.height {
                scale = min(thumbnailMaxDimension / imageBounds.width, 1.0)
            } else {
                scale = min(thumbnailMaxDimension / imageBounds.height, 1.0)
            }
            let scaledSize = CGSize(width: imageBounds.width * scale, height: imageBounds.height * scale)

            // Create a white background and composite the drawing on top
            // This fixes the black thumbnail issue when saving as JPEG
            UIGraphicsBeginImageContextWithOptions(scaledSize, true, 1.0)
            defer { UIGraphicsEndImageContext() }

            // Fill with white background
            UIColor.white.setFill()
            UIRectFill(CGRect(origin: .zero, size: scaledSize))

            // Only draw if there's actual content
            if !bounds.isEmpty && bounds.width >= 1 && bounds.height >= 1 {
                // Generate image at original scale from actual content bounds
                let drawingImage = drawing.image(from: bounds, scale: 1.0)
                // Draw scaled down to fit thumbnail size
                drawingImage.draw(in: CGRect(origin: .zero, size: scaledSize))
            }

            // Get the final composited image
            let finalImage = UIGraphicsGetImageFromCurrentImageContext()
            return finalImage
        }.value
    }

    func copySelection() {
        // Copy is handled automatically by PKCanvasView - just switch to lasso tool
        if selectedTool != .lasso {
            selectedTool = .lasso
        }
    }

    func pasteSelection() {
        // Paste is handled automatically by PKCanvasView when lasso tool is active
        // User can use standard iOS paste gesture or we trigger it programmatically
        if selectedTool != .lasso {
            selectedTool = .lasso
        }
    }

    func deleteSelection() {
        // TODO: Implement proper lasso selection deletion
        // For now, clear the entire page
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else { return }
        pages[currentPageIndex].drawing = PKDrawing()
        markPageAsUnsaved()
        debouncedSave()
    }

    func performUndo() {
        Task { @MainActor in
            undoManager?.undo()
            updateUndoRedoState()
        }
    }

    func performRedo() {
        Task { @MainActor in
            undoManager?.redo()
            updateUndoRedoState()
        }
    }

    func updateUndoRedoState() {
        Task { @MainActor in
            canUndo = undoManager?.canUndo ?? false
            canRedo = undoManager?.canRedo ?? false
        }
    }

    // MARK: - Backend Sync

    func loadScribbleData() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Try to load from local cache first
            if let cachedPages = await loadPagesFromCache() {
                pages = cachedPages
                currentPageIndex = 0
                print("✅ Loaded \(pages.count) pages from local cache")
            }

            // Try to load the scribble from backend
            guard let scribble = try await APIService.shared.getScribble(scribbleId: scribbleId) else {
                print("No existing scribble found on backend")
                if pages.isEmpty {
                    // Create initial page if nothing in cache either
                    createInitialPage()
                }
                return
            }

            // Parse pages if they exist (pages is now an array of ScribblePage from APIService)
            if let pagesArray = scribble.pages, !pagesArray.isEmpty {
                // Load pages with their drawings
                var loadedPages: [Page] = []
                for (index, apiPage) in pagesArray.sorted(by: { $0.pageNumber < $1.pageNumber }).enumerated() {
                    if let drawingData = Data(base64Encoded: apiPage.drawingData),
                       let drawing = try? PKDrawing(data: drawingData) {
                        let page = Page(
                            pageNumber: index, // 0-indexed
                            drawing: drawing,
                            thumbnail: nil, // Thumbnail will be regenerated
                            hasUnsavedChanges: false
                        )
                        loadedPages.append(page)
                    }
                }

                if !loadedPages.isEmpty {
                    pages = loadedPages
                    currentPageIndex = 0

                    // Save to local cache
                    await saveAllPagesToCache()
                }
            } else if pages.isEmpty {
                // No pages from backend, create initial page
                createInitialPage()
            }

            print("✅ Loaded scribble with \(pages.count) pages")
        } catch {
            print("❌ Error loading scribble: \(error)")
            saveError = "Failed to load scribble: \(error.localizedDescription)"
            showSaveError = true

            // If no cached pages and backend failed, create initial page
            if pages.isEmpty {
                createInitialPage()
            }
        }
    }

    func loadPagesFromCache() async -> [Page]? {
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let scribbleDir = cacheDir.appendingPathComponent("scribbles").appendingPathComponent(scribbleId)

        guard FileManager.default.fileExists(atPath: scribbleDir.path) else {
            return nil
        }

        do {
            let contents = try FileManager.default.contentsOfDirectory(at: scribbleDir, includingPropertiesForKeys: nil)
            let pageFiles = contents.filter { $0.lastPathComponent.hasPrefix("page_") }.sorted(by: { $0.path < $1.path })

            var cachedPages: [Page] = []
            let decoder = JSONDecoder()

            for fileURL in pageFiles {
                let data = try Data(contentsOf: fileURL)
                let page = try decoder.decode(Page.self, from: data)
                cachedPages.append(page)
            }

            return cachedPages.isEmpty ? nil : cachedPages
        } catch {
            print("❌ Error loading pages from cache: \(error)")
            return nil
        }
    }

    func saveAllPagesToCache() async {
        for (index, _) in pages.enumerated() {
            let savedIndex = currentPageIndex
            currentPageIndex = index
            await savePageLocally()
            currentPageIndex = savedIndex
        }
    }

    func debouncedSave() {
        // Cancel previous save task
        saveTask?.cancel()

        // Create new save task with debounce
        saveTask = Task {
            try? await Task.sleep(nanoseconds: saveDebounceSeconds)

            guard !Task.isCancelled else { return }
            await savePageToBackendWithRetry(retryCount: 2)
        }
    }

    func savePageToBackendWithRetry(retryCount: Int) async {
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else { return }

        var attemptsLeft = retryCount
        var lastError: Error?
        var errorDetails: [String] = []

        while attemptsLeft >= 0 {
            do {
                let success = try await savePageToBackend()
                if success {
                    return // Success, exit
                }
            } catch {
                lastError = error
                let attemptNum = retryCount - attemptsLeft + 1
                let errorMsg = "Attempt \(attemptNum): \(error.localizedDescription)"
                errorDetails.append(errorMsg)
                print("❌ Save attempt failed (attempts left: \(attemptsLeft)): \(error)")
            }

            if attemptsLeft > 0 {
                // Exponential backoff: 1s, 2s, 4s
                let backoffSeconds = UInt64(pow(2.0, Double(retryCount - attemptsLeft))) * 1_000_000_000
                try? await Task.sleep(nanoseconds: backoffSeconds)
            }

            attemptsLeft -= 1
        }

        // All retries failed - compile detailed error message
        await MainActor.run {
            saveError = "Failed to save after \(retryCount + 1) attempts"

            // Extract more details from NSError if available
            var errorInfo = ""
            if let nsError = lastError as NSError? {
                errorInfo = """

                Error Domain: \(nsError.domain)
                Error Code: \(nsError.code)
                """

                // Add specific info for common error domains
                if nsError.domain == "NSURLErrorDomain" {
                    errorInfo += "\n\nNetwork Error Type: "
                    switch nsError.code {
                    case -1001: errorInfo += "Request timed out"
                    case -1003: errorInfo += "Cannot find host (check server URL)"
                    case -1004: errorInfo += "Cannot connect to host (server may be down)"
                    case -1005: errorInfo += "Network connection lost"
                    case -1009: errorInfo += "No internet connection"
                    case -1200: errorInfo += "SSL/TLS error (certificate issue)"
                    default: errorInfo += "Code \(nsError.code)"
                    }
                }

                // Add underlying error if available
                if let underlyingError = nsError.userInfo[NSUnderlyingErrorKey] as? NSError {
                    errorInfo += """


                    Underlying Error:
                    Domain: \(underlyingError.domain)
                    Code: \(underlyingError.code)
                    Description: \(underlyingError.localizedDescription)
                    """
                }
            }

            saveErrorDetails = """
            Page: \(currentPageIndex + 1)
            Total Attempts: \(retryCount + 1)

            Attempt History:
            \(errorDetails.joined(separator: "\n"))

            Last Error: \(lastError?.localizedDescription ?? "Unknown error")\(errorInfo)

            Possible Solutions:
            • Check your internet connection
            • Verify the server is running and accessible
            • Try again in a few moments
            • Check if firewall is blocking the connection
            """
            showSaveError = true
            hasUnsavedChanges = true
        }
        print("❌ All save attempts failed: \(lastError?.localizedDescription ?? "unknown error")")
    }

    func savePageToBackend() async throws -> Bool {
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else {
            throw NSError(domain: "ScribbleView", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid page index"])
        }

        await MainActor.run { isSaving = true }
        defer { Task { @MainActor in isSaving = false } }

        let page = pages[currentPageIndex]

        print("📤 Saving page \(page.pageNumber) (currentPageIndex: \(currentPageIndex), total pages: \(pages.count))")

        // Serialize PKDrawing to Data
        let drawingData = page.drawing.dataRepresentation()
        let drawingBase64 = drawingData.base64EncodedString()

        print("   Drawing data size: \(drawingBase64.count) chars")

        // Generate thumbnail with compression
        var thumbnailBase64: String?
        if let thumbnail = await generateThumbnail(from: page.drawing) {
            // Compress thumbnail to JPEG with 70% quality (30% reduction)
            if let thumbnailData = thumbnail.jpegData(compressionQuality: thumbnailCompressionQuality) {
                thumbnailBase64 = thumbnailData.base64EncodedString()
                print("   Thumbnail data size: \(thumbnailBase64?.count ?? 0) chars (compressed to \(Int(thumbnailCompressionQuality * 100))% quality)")
            }
        }

        // Validate request size and log details
        let totalSize = drawingBase64.count + (thumbnailBase64?.count ?? 0)

        // Always log the sizes for debugging
        print("📊 Request size breakdown:")
        print("   Drawing: \(String(format: "%.2f", Double(drawingBase64.count) / 1_000_000))MB (\(drawingBase64.count) bytes)")
        print("   Thumbnail: \(String(format: "%.2f", Double(thumbnailBase64?.count ?? 0) / 1_000_000))MB (\(thumbnailBase64?.count ?? 0) bytes)")
        print("   Total: \(String(format: "%.2f", Double(totalSize) / 1_000_000))MB (\(totalSize) bytes)")

        if totalSize > maxRequestSizeBytes {
            let errorMsg = "Request too large: \(String(format: "%.2f", Double(totalSize) / 1_000_000))MB exceeds \(maxRequestSizeBytes / 1_000_000)MB limit"
            print("❌ \(errorMsg)")
            await MainActor.run {
                saveError = errorMsg
                saveErrorDetails = """
                Page: \(currentPageIndex + 1)
                Drawing size: \(String(format: "%.2f", Double(drawingBase64.count) / 1_000_000))MB
                Thumbnail size: \(String(format: "%.2f", Double(thumbnailBase64?.count ?? 0) / 1_000_000))MB
                Total size: \(String(format: "%.2f", Double(totalSize) / 1_000_000))MB
                Max allowed: \(maxRequestSizeBytes / 1_000_000)MB

                This usually happens with very detailed drawings. Try reducing the amount of content on this page.
                """
                showSaveError = true
            }
            throw NSError(domain: "ScribbleView", code: -2, userInfo: [
                NSLocalizedDescriptionKey: errorMsg,
                "drawingSize": drawingBase64.count,
                "thumbnailSize": thumbnailBase64?.count ?? 0,
                "totalSize": totalSize
            ])
        }

        // Save to backend
        print("   Calling API with scribbleId: \(scribbleId), pageNumber: \(page.pageNumber)")
        let success = try await APIService.shared.upsertScribblePage(
            scribbleId: scribbleId,
            pageNumber: page.pageNumber,
            drawingData: drawingBase64,
            thumbnail: thumbnailBase64
        )

        if success {
            print("✅ Saved page \(page.pageNumber) to backend")
            await MainActor.run {
                if currentPageIndex < pages.count {
                    pages[currentPageIndex].hasUnsavedChanges = false
                    pages[currentPageIndex].lastSavedDate = Date()
                    hasUnsavedChanges = false
                }
                saveError = nil
                showSaveError = false
            }

            // Save to local cache after successful backend save
            await savePageLocally()
        } else {
            print("❌ Failed to save page \(page.pageNumber)")
            throw NSError(domain: "ScribbleView", code: -3, userInfo: [NSLocalizedDescriptionKey: "Backend returned failure"])
        }

        return success
    }

    // MARK: - Settings Persistence

    func saveUserSettings() {
        let defaults = UserDefaults.standard
        defaults.set(selectedTool == .pen ? "pen" : selectedTool == .pencil ? "pencil" : selectedTool == .marker ? "marker" : selectedTool == .eraser ? "eraser" : "lasso", forKey: "scribble_selected_tool")
        defaults.set(toolSize.rawValue, forKey: "scribble_tool_size")
        defaults.set(backgroundType == .none ? "none" : backgroundType == .dotGrid ? "dotGrid" : "lineGrid", forKey: "scribble_background_type")
        defaults.set(gridSize.rawValue, forKey: "scribble_grid_size")

        // Save color as components
        let uiColor = UIColor(selectedColor)
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        defaults.set([red, green, blue, alpha], forKey: "scribble_selected_color")
    }

    func loadUserSettings() async {
        let defaults = UserDefaults.standard

        await MainActor.run {
            // Load tool
            if let toolString = defaults.string(forKey: "scribble_selected_tool") {
                switch toolString {
                case "pen": selectedTool = .pen
                case "pencil": selectedTool = .pencil
                case "marker": selectedTool = .marker
                case "eraser": selectedTool = .eraser
                case "lasso": selectedTool = .lasso
                default: break
                }
            }

            // Load tool size
            if let sizeString = defaults.string(forKey: "scribble_tool_size"),
               let size = ToolSize(rawValue: sizeString) {
                toolSize = size
            }

            // Load background type
            if let bgString = defaults.string(forKey: "scribble_background_type") {
                switch bgString {
                case "none": backgroundType = .none
                case "dotGrid": backgroundType = .dotGrid
                case "lineGrid": backgroundType = .lineGrid
                default: break
                }
            }

            // Load grid size
            if let gridString = defaults.string(forKey: "scribble_grid_size"),
               let size = GridSize(rawValue: gridString) {
                gridSize = size
            }

            // Load color
            if let colorComponents = defaults.array(forKey: "scribble_selected_color") as? [CGFloat],
               colorComponents.count == 4 {
                selectedColor = SwiftUI.Color(
                    red: colorComponents[0],
                    green: colorComponents[1],
                    blue: colorComponents[2],
                    opacity: colorComponents[3]
                )
            }
        }
    }
    #endif
}

#if os(iOS)
// MARK: - Canvas View
struct CanvasView: UIViewRepresentable {
    @Binding var drawing: PKDrawing
    @Binding var selectedTool: ScribbleView.DrawingTool
    var selectedColor: SwiftUI.Color
    var toolSize: ScribbleView.ToolSize
    var backgroundType: BackgroundOptionsView.BackgroundType
    var gridSize: ScribbleView.GridSize
    @Binding var undoManager: UndoManager?
    var onDrawingChanged: () -> Void

    func makeUIView(context: Context) -> PKCanvasView {
        let canvas = PKCanvasView()
        canvas.drawingPolicy = .anyInput
        canvas.isOpaque = false
        canvas.drawing = drawing
        canvas.delegate = context.coordinator
        canvas.isUserInteractionEnabled = true
        canvas.allowsFingerDrawing = true

        // Enable zooming on the canvas (required for lasso selection scaling to work)
        canvas.minimumZoomScale = 1.0
        canvas.maximumZoomScale = 1.0
        canvas.zoomScale = 1.0

        // This is critical: PKCanvasView needs zoom enabled for lasso gestures to work properly
        // But we lock it at 1.0 so users can't zoom the canvas itself
        canvas.bouncesZoom = false

        context.coordinator.canvas = canvas
        updateTool(canvas: canvas)
        // Apply default background (dot grid)
        applyBackground(to: canvas, type: backgroundType, size: gridSize)

        // Set the undo manager from the canvas
        DispatchQueue.main.async {
            undoManager = canvas.undoManager
        }

        return canvas
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {
        if uiView.drawing != drawing {
            uiView.drawing = drawing
        }
        updateTool(canvas: uiView)
        // Update background if it changed
        applyBackground(to: uiView, type: backgroundType, size: gridSize)
    }

    func updateTool(canvas: PKCanvasView) {
        let uiColor = UIColor(selectedColor)

        switch selectedTool {
        case .lasso:
            canvas.tool = PKLassoTool()
        case .pen:
            canvas.tool = PKInkingTool(.pen, color: uiColor, width: toolSize.width)
        case .pencil:
            canvas.tool = PKInkingTool(.pencil, color: uiColor, width: toolSize.width)
        case .marker:
            canvas.tool = PKInkingTool(.marker, color: uiColor, width: toolSize.markerWidth)
        case .eraser:
            canvas.tool = PKEraserTool(.bitmap, width: toolSize.width * 3) // Scale eraser size
        }
    }

    func applyBackground(to canvas: PKCanvasView, type: BackgroundOptionsView.BackgroundType, size: ScribbleView.GridSize) {
        switch type {
        case .none:
            canvas.backgroundColor = UIColor.systemBackground
        case .dotGrid:
            canvas.backgroundColor = createDotGridBackground(size: size, traitCollection: canvas.traitCollection)
        case .lineGrid:
            canvas.backgroundColor = createLineGridBackground(size: size, traitCollection: canvas.traitCollection)
        }
    }

    func createDotGridBackground(size: ScribbleView.GridSize, traitCollection: UITraitCollection) -> UIColor {
        let dotSize = size.dotSize
        let spacing = size.spacing
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: spacing, height: spacing))

        let img = renderer.image { ctx in
            // Adapt background color to current interface style
            let backgroundColor: UIColor = traitCollection.userInterfaceStyle == .dark ? .black : .white
            let dotColor: UIColor = traitCollection.userInterfaceStyle == .dark ?
                UIColor.gray.withAlphaComponent(0.3) : UIColor.gray.withAlphaComponent(0.15)

            backgroundColor.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: spacing, height: spacing))

            dotColor.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: dotSize, height: dotSize))
        }

        return UIColor(patternImage: img)
    }

    func createLineGridBackground(size: ScribbleView.GridSize, traitCollection: UITraitCollection) -> UIColor {
        let spacing = size.spacing
        let lineWidth = size.lineWidth
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: spacing, height: spacing))

        let img = renderer.image { ctx in
            // Adapt background color to current interface style
            let backgroundColor: UIColor = traitCollection.userInterfaceStyle == .dark ? .black : .white
            let lineColor: UIColor = traitCollection.userInterfaceStyle == .dark ?
                UIColor.gray.withAlphaComponent(0.3) : UIColor.gray.withAlphaComponent(0.15)

            backgroundColor.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: spacing, height: spacing))

            lineColor.setStroke()
            ctx.cgContext.setLineWidth(lineWidth)

            // Vertical line
            ctx.cgContext.move(to: CGPoint(x: 0, y: 0))
            ctx.cgContext.addLine(to: CGPoint(x: 0, y: spacing))

            // Horizontal line
            ctx.cgContext.move(to: CGPoint(x: 0, y: 0))
            ctx.cgContext.addLine(to: CGPoint(x: spacing, y: 0))

            ctx.cgContext.strokePath()
        }

        return UIColor(patternImage: img)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, PKCanvasViewDelegate {
        var parent: CanvasView
        var canvas: PKCanvasView?

        init(_ parent: CanvasView) {
            self.parent = parent
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            if parent.drawing != canvasView.drawing {
                parent.drawing = canvasView.drawing
                parent.onDrawingChanged()
            }
        }
    }
}

// MARK: - Tool Button
struct ToolButton: View {
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(isSelected ? .blue : .primary)
                .frame(width: 32, height: 32)
                .background(isSelected ? SwiftUI.Color.blue.opacity(0.1) : SwiftUI.Color.clear)
                .cornerRadius(6)
        }
    }
}

// MARK: - Color Picker View
struct ColorPickerView: View {
    @Binding var selectedColor: SwiftUI.Color
    @Environment(\.dismiss) var dismiss

    let colors: [SwiftUI.Color] = [
        .black, .gray, .white,
        .red, .orange, .yellow,
        .green, .blue, .purple,
        .pink, .brown, .cyan
    ]

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Color grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 16) {
                    ForEach(colors, id: \.self) { color in
                        Button(action: {
                            selectedColor = color
                            dismiss()
                        }) {
                            Circle()
                                .fill(color)
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Circle()
                                        .stroke(selectedColor == color ? SwiftUI.Color.blue : SwiftUI.Color.gray.opacity(0.3), lineWidth: 3)
                                )
                        }
                    }
                }
                .padding()

                Spacer()
            }
            .navigationTitle("Choose Color")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Size Picker View
struct SizePickerView: View {
    @Binding var selectedSize: ScribbleView.ToolSize
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            List {
                Section {
                    ForEach(ScribbleView.ToolSize.allCases, id: \.self) { size in
                        Button(action: {
                            selectedSize = size
                            dismiss()
                        }) {
                            HStack {
                                Text(size.rawValue)
                                Spacer()
                                // Visual indicator of size
                                Circle()
                                    .fill(SwiftUI.Color.primary)
                                    .frame(width: min(size.width * 3, 30), height: min(size.width * 3, 30))

                                if selectedSize == size {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                        .padding(.leading, 8)
                                }
                            }
                        }
                        .foregroundColor(.primary)
                    }
                }
            }
            .navigationTitle("Choose Size")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Background Options View
struct BackgroundOptionsView: View {
    @Binding var backgroundType: BackgroundType
    @Binding var gridSize: ScribbleView.GridSize
    @Environment(\.dismiss) var dismiss

    enum BackgroundType {
        case none
        case dotGrid
        case lineGrid
    }

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Background Type")) {
                    Button(action: {
                        backgroundType = .none
                        dismiss()
                    }) {
                        HStack {
                            Text("None")
                            Spacer()
                            if backgroundType == .none {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    .foregroundColor(.primary)

                    Button(action: {
                        backgroundType = .dotGrid
                        dismiss()
                    }) {
                        HStack {
                            Text("Dot Grid")
                            Spacer()
                            if backgroundType == .dotGrid {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    .foregroundColor(.primary)

                    Button(action: {
                        backgroundType = .lineGrid
                        dismiss()
                    }) {
                        HStack {
                            Text("Line Grid")
                            Spacer()
                            if backgroundType == .lineGrid {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    .foregroundColor(.primary)
                }

                if backgroundType != .none {
                    Section(header: Text("Grid Size")) {
                        ForEach(ScribbleView.GridSize.allCases, id: \.self) { size in
                            Button(action: {
                                gridSize = size
                                dismiss()
                            }) {
                                HStack {
                                    Text(size.rawValue)
                                    Spacer()
                                    if gridSize == size {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                            .foregroundColor(.primary)
                        }
                    }
                }
            }
            .navigationTitle("Background")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
#endif

#if os(macOS)
// MARK: - macOS Read-Only Viewer
struct MacOSScribbleViewer: View {
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
                // Main content area
                VStack(spacing: 0) {
                    // Scribble image viewer
                    ScrollView([.horizontal, .vertical]) {
                        if let thumbnail = pages[currentPageIndex].thumbnail,
                           let imageData = Data(base64Encoded: thumbnail),
                           let nsImage = NSImage(data: imageData) {
                            Image(nsImage: nsImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                            VStack(spacing: 16) {
                                Image(systemName: "photo")
                                    .font(.system(size: 48))
                                    .foregroundColor(LocusColors.textSecondary)
                                Text("No preview available")
                                    .foregroundColor(LocusColors.textSecondary)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                    }
                    .background(Color(NSColor.controlBackgroundColor))

                    Rectangle()
                        .fill(LocusColors.borderStandard)
                        .frame(height: 2)

                    // Bottom toolbar with page navigation
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
                            .buttonStyle(PlainButtonStyle())

                            Text("\(currentPageIndex + 1) / \(pages.count)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(LocusColors.textSecondary)
                                .frame(minWidth: 50)

                            Button(action: nextPage) {
                                Image(systemName: "chevron.right")
                                    .foregroundColor(currentPageIndex < pages.count - 1 ? LocusColors.textPrimary : LocusColors.textSecondary)
                            }
                            .disabled(currentPageIndex >= pages.count - 1)
                            .buttonStyle(PlainButtonStyle())
                        }

                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(LocusColors.backgroundPrimary)
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
                print("✅ Loaded scribble with \(pages.count) pages for viewing")
            } else {
                errorMessage = "No pages found in scribble"
            }
        } catch {
            errorMessage = "Failed to load scribble: \(error.localizedDescription)"
            print("❌ Error loading scribble for viewing: \(error)")
        }
    }
}
#endif

#Preview {
    ScribbleView(scribbleId: "test")
}
