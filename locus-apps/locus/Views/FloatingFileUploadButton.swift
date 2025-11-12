//
//  FloatingFileUploadButton.swift
//  locus
//
//  File upload button component
//

import SwiftUI
import UniformTypeIdentifiers

struct FloatingFileUploadButton: View {
    let onFileSelected: (URL) -> Void
    @Binding var isUploading: Bool
    @State private var showingFilePicker = false
    @State private var isHovering = false

    var body: some View {
        Button(action: {
            if !isUploading {
                showingFilePicker = true
            }
        }) {
            if isUploading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: LocusColors.textSecondary))
                    .scaleEffect(0.8)
            } else {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 20))
                    .foregroundColor(LocusColors.textSecondary)
            }
        }
        .buttonStyle(PlainButtonStyle())
        .frame(width: 40, height: 40)
        .background(
            Circle()
                .fill(LocusColors.backgroundSecondary)
                .opacity(isHovering ? 1.0 : 0.3)
        )
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovering = hovering
            }
        }
        .fileImporter(
            isPresented: $showingFilePicker,
            allowedContentTypes: [
                .image,
                .pdf,
                .plainText,
                .commaSeparatedText,
                .spreadsheet,
                UTType(filenameExtension: "xlsx") ?? .data,
                UTType(filenameExtension: "xls") ?? .data
            ],
            allowsMultipleSelection: true
        ) { result in
            switch result {
            case .success(let urls):
                for url in urls {
                    onFileSelected(url)
                }
            case .failure(let error):
                print("❌ File picker error: \(error)")
            }
        }
    }
}

#Preview {
    FloatingFileUploadButton(
        onFileSelected: { url in
            print("Selected file: \(url)")
        },
        isUploading: .constant(false)
    )
}
