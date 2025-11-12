//
//  FilePreviewView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
import PDFKit
import AVKit

struct FilePreviewView: View {
    let fileId: String
    let nodeTitle: String
    @State private var fileURL: URL?
    @State private var filename: String = ""
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            // Download button header
            if let url = fileURL {
                HStack {
                    Text(filename)
                        .font(.system(size: 12))
                        .foregroundColor(LocusColors.textSecondary)

                    Spacer()

                    Button(action: {
                        downloadFile(url: url)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.down.circle")
                                .font(.system(size: 14))
                            Text("Download")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(LocusColors.textPrimary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(LocusColors.backgroundSecondary)
                        .cornerRadius(6)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.vertical, Spacing.sm)

                Rectangle()
                    .fill(LocusColors.borderStandard)
                    .frame(height: 2)
            }

            // File content - ensure it always fills available space
            Group {
                if isLoading {
                    ProgressView("Loading file...")
                } else if let error = error {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundColor(.red)
                        Text(error)
                            .foregroundColor(LocusColors.textSecondary)
                    }
                } else if let url = fileURL {
                    FileContentView(url: url)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .task {
            await loadFile()
        }
    }

    func loadFile() async {
        isLoading = true
        do {
            // Get file URL from API
            let fileUrlString = try await APIService.shared.getFile(fileId: fileId)

            guard let url = URL(string: fileUrlString) else {
                self.error = "Invalid file URL"
                isLoading = false
                return
            }

            // Extract filename from URL
            self.filename = url.lastPathComponent
            self.fileURL = url
            self.error = nil
        } catch {
            print("Error loading file: \(error)")
            self.error = "Failed to load file: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func downloadFile(url: URL) {
        #if os(macOS)
        let savePanel = NSSavePanel()

        // Use node title with file extension from the original filename
        let fileExtension = url.pathExtension
        var suggestedName: String

        if nodeTitle.isEmpty {
            suggestedName = url.lastPathComponent
        } else if nodeTitle.lowercased().hasSuffix(".\(fileExtension.lowercased())") {
            // Node title already has the extension
            suggestedName = nodeTitle
        } else {
            // Add the extension to the node title
            suggestedName = "\(nodeTitle).\(fileExtension)"
        }

        savePanel.nameFieldStringValue = suggestedName

        savePanel.begin { response in
            if response == .OK, let destination = savePanel.url {
                // Download the file from the remote URL
                Task {
                    do {
                        let (data, _) = try await URLSession.shared.data(from: url)

                        // Remove existing file if it exists
                        if FileManager.default.fileExists(atPath: destination.path) {
                            try FileManager.default.removeItem(at: destination)
                        }

                        // Write the downloaded data to the destination
                        try data.write(to: destination)
                        print("✅ File saved successfully to: \(destination.path)")
                    } catch {
                        print("❌ Error downloading file: \(error)")
                    }
                }
            }
        }
        #else
        // iOS sharing
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
        #endif
    }
}

struct FileContentView: View {
    let url: URL

    @ViewBuilder
    var body: some View {
        let fileExtension = url.pathExtension.lowercased()

        if ["png", "jpg", "jpeg", "gif", "webp"].contains(fileExtension) {
            AsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                ProgressView()
            }
        } else if fileExtension == "pdf" {
            PDFKitView(url: url)
        } else if ["mp4", "mov", "avi"].contains(fileExtension) {
            VideoPlayer(player: AVPlayer(url: url))
        } else {
            VStack(spacing: Spacing.md) {
                Image(systemName: "doc")
                    .font(.system(size: 48))
                    .foregroundColor(LocusColors.textSecondary)
                Text("Preview not available")
                    .foregroundColor(LocusColors.textSecondary)
                Link("Download File", destination: url)
                    .foregroundColor(LocusColors.accent)
            }
        }
    }
}

#if os(iOS)
struct PDFKitView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = PDFDocument(url: url)
        pdfView.autoScales = true
        return pdfView
    }

    func updateUIView(_ uiView: PDFView, context: Context) {}
}
#else
struct PDFKitView: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = PDFDocument(url: url)
        pdfView.autoScales = true
        return pdfView
    }

    func updateNSView(_ nsView: PDFView, context: Context) {}
}
#endif

#Preview {
    FilePreviewView(fileId: "test", nodeTitle: "Sample File")
}
