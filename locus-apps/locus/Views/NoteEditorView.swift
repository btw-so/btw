//
//  NoteEditorView.swift
//  locus
//
//  Rich text editor for notes using TipTap
//

import SwiftUI
import WebKit
import Combine

/// TipTap editor view for notes with real-time collaboration
struct NoteEditorView: View {
    let noteId: String
    @StateObject private var viewModel = NoteEditorViewModel()

    var body: some View {
        ZStack {
            TipTapWebView(noteId: noteId, viewModel: viewModel)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Loading overlay
            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black.opacity(0.3))
            }

            // Error overlay
            if let error = viewModel.errorMessage {
                VStack {
                    Text("Error")
                        .font(.headline)
                    Text(error)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .padding()
                    Button("Retry") {
                        viewModel.retryLoading()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                #if os(macOS)
                .background(Color(NSColor.windowBackgroundColor))
                #else
                .background(Color(uiColor: .systemBackground))
                #endif
                .cornerRadius(10)
                .shadow(radius: 10)
            }
        }
        .background(LocusColors.backgroundPrimary)
    }
}

/// ViewModel for managing note editor state
class NoteEditorViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var errorMessage: String?
    @Published var wordCount = 0
    @Published var connectionStatus: String = "disconnected"

    func retryLoading() {
        isLoading = true
        errorMessage = nil
    }

    func handleMessage(_ message: [String: Any]) {
        if let type = message["type"] as? String {
            switch type {
            case "contentUpdate":
                // Handle content updates if needed
                break
            case "connectionStatus":
                if let status = message["status"] as? String {
                    DispatchQueue.main.async {
                        self.connectionStatus = status
                    }
                }
            case "error":
                if let error = message["message"] as? String {
                    DispatchQueue.main.async {
                        self.errorMessage = error
                    }
                }
            default:
                break
            }
        }
    }
}

#if os(macOS)
/// WebKit wrapper for TipTap editor (macOS)
struct TipTapWebView: NSViewRepresentable {
    let noteId: String
    let viewModel: NoteEditorViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        // Add message handler for communication from JavaScript
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "locusEditor")
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator

        // Load the HTML file
        if let htmlPath = Bundle.main.path(forResource: "note-editor", ofType: "html"),
           let htmlURL = URL(string: "file://\(htmlPath)") {

            // Get authentication details
            guard let user = AuthManager.shared.currentUser,
                  let token = UserDefaults.standard.string(forKey: "loginToken") else {
                DispatchQueue.main.async {
                    viewModel.errorMessage = "Not authenticated"
                    viewModel.isLoading = false
                }
                return webView
            }

            let fingerprint = APIService.shared.generateFingerprint()

            // Create configuration JSON
            #if os(iOS)
            let isIPhone = UIDevice.current.userInterfaceIdiom == .phone
            #else
            let isIPhone = false
            #endif

            // Get current theme
            let themeManager = ThemeManager.shared
            let theme: String
            switch themeManager.selectedTheme {
            case .light:
                theme = "light"
            case .dark:
                theme = "dark"
            case .system:
                #if os(macOS)
                let appearance = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua])
                theme = appearance == .darkAqua ? "dark" : "light"
                #else
                theme = UITraitCollection.current.userInterfaceStyle == .dark ? "dark" : "light"
                #endif
            }

            let config: [String: Any] = [
                "backendURL": "wss://yjs.siddg.com",
                "userId": String(user.id),
                "noteId": noteId,
                "token": token,
                "fingerprint": fingerprint,
                "userName": user.name ?? user.email,
                "placeholder": "Write something...",
                "isIPhone": isIPhone,
                "theme": theme
            ]

            // Convert config to JSON string
            if let configData = try? JSONSerialization.data(withJSONObject: config, options: []),
               let configJSON = String(data: configData, encoding: .utf8) {

                // Create HTML with embedded config
                var htmlString = try? String(contentsOf: htmlURL, encoding: .utf8)

                // Inject configuration script before closing </body> tag
                let configScript = """
                <script id="editor-config" type="application/json">
                \(configJSON)
                </script>
                """

                if let html = htmlString {
                    htmlString = html.replacingOccurrences(of: "</body>", with: "\(configScript)\n</body>")
                    webView.loadHTMLString(htmlString!, baseURL: htmlURL.deletingLastPathComponent())
                }
            }
        } else {
            DispatchQueue.main.async {
                viewModel.errorMessage = "Could not load editor"
                viewModel.isLoading = false
            }
        }

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        // No updates needed
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: TipTapWebView

        init(_ parent: TipTapWebView) {
            self.parent = parent
        }

        // Handle messages from JavaScript
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "locusEditor",
               let messageBody = message.body as? [String: Any] {
                parent.viewModel.handleMessage(messageBody)
            }
        }

        // Handle page load completion
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.viewModel.isLoading = false
            }
        }

        // Handle navigation errors
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.viewModel.errorMessage = "Failed to load editor: \(error.localizedDescription)"
                self.parent.viewModel.isLoading = false
            }
        }
    }
}
#else
/// WebKit wrapper for TipTap editor (iOS)
struct TipTapWebView: UIViewRepresentable {
    let noteId: String
    let viewModel: NoteEditorViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        // Add message handler for communication from JavaScript
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "locusEditor")
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator

        // Load the HTML file
        if let htmlPath = Bundle.main.path(forResource: "note-editor", ofType: "html"),
           let htmlURL = URL(string: "file://\(htmlPath)") {

            // Get authentication details
            guard let user = AuthManager.shared.currentUser,
                  let token = UserDefaults.standard.string(forKey: "loginToken") else {
                DispatchQueue.main.async {
                    viewModel.errorMessage = "Not authenticated"
                    viewModel.isLoading = false
                }
                return webView
            }

            let fingerprint = APIService.shared.generateFingerprint()

            // Create configuration JSON
            #if os(iOS)
            let isIPhone = UIDevice.current.userInterfaceIdiom == .phone
            #else
            let isIPhone = false
            #endif

            // Get current theme
            let themeManager = ThemeManager.shared
            let theme: String
            switch themeManager.selectedTheme {
            case .light:
                theme = "light"
            case .dark:
                theme = "dark"
            case .system:
                #if os(macOS)
                let appearance = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua])
                theme = appearance == .darkAqua ? "dark" : "light"
                #else
                theme = UITraitCollection.current.userInterfaceStyle == .dark ? "dark" : "light"
                #endif
            }

            let config: [String: Any] = [
                "backendURL": "wss://yjs.siddg.com",
                "userId": String(user.id),
                "noteId": noteId,
                "token": token,
                "fingerprint": fingerprint,
                "userName": user.name ?? user.email,
                "placeholder": "Write something...",
                "isIPhone": isIPhone,
                "theme": theme
            ]

            // Convert config to JSON string
            if let configData = try? JSONSerialization.data(withJSONObject: config, options: []),
               let configJSON = String(data: configData, encoding: .utf8) {

                // Create HTML with embedded config
                var htmlString = try? String(contentsOf: htmlURL, encoding: .utf8)

                // Inject configuration script before closing </body> tag
                let configScript = """
                <script id="editor-config" type="application/json">
                \(configJSON)
                </script>
                """

                if let html = htmlString {
                    htmlString = html.replacingOccurrences(of: "</body>", with: "\(configScript)\n</body>")
                    webView.loadHTMLString(htmlString!, baseURL: htmlURL.deletingLastPathComponent())
                }
            }
        } else {
            DispatchQueue.main.async {
                viewModel.errorMessage = "Could not load editor"
                viewModel.isLoading = false
            }
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: TipTapWebView

        init(_ parent: TipTapWebView) {
            self.parent = parent
        }

        // Handle messages from JavaScript
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "locusEditor",
               let messageBody = message.body as? [String: Any] {
                parent.viewModel.handleMessage(messageBody)
            }
        }

        // Handle page load completion
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.viewModel.isLoading = false
            }
        }

        // Handle navigation errors
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.viewModel.errorMessage = "Failed to load editor: \(error.localizedDescription)"
                self.parent.viewModel.isLoading = false
            }
        }
    }
}
#endif

#Preview {
    NoteEditorView(noteId: "356935be-5f8b-4104-86a2-db91fd16a8c3")
}
