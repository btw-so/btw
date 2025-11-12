//
//  ClipboardUtils.swift
//  locus
//
//  Cross-platform clipboard utilities
//

import Foundation

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

/// Copy text to clipboard (works on both iOS and macOS)
func copyToClipboard(_ text: String) {
    #if os(iOS)
    UIPasteboard.general.string = text
    #elseif os(macOS)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(text, forType: .string)
    #endif
}
