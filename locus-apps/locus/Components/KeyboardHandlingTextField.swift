//
//  KeyboardHandlingTextField.swift
//  locus
//
//  Custom TextField with keyboard event handling for node navigation
//

import SwiftUI

#if os(macOS)
import AppKit
/// Custom text view that captures keyboard events
class KeyboardCapturingTextView: NSTextView {
    var onKeyEvent: ((NSEvent, Int, Int) -> Bool)?  // event, cursorPosition, textLength

    override func becomeFirstResponder() -> Bool {
        let result = super.becomeFirstResponder()

        if result {
            print("🎯 becomeFirstResponder called - text: '\(self.string)'")

            // CRITICAL: Set LTR typing attributes THE MOMENT we become first responder
            self.alignment = .left
            self.baseWritingDirection = .leftToRight

            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.alignment = .left
            paragraphStyle.baseWritingDirection = .leftToRight

            // Set BOTH defaultParagraphStyle AND typingAttributes
            self.defaultParagraphStyle = paragraphStyle

            self.typingAttributes = [
                .font: self.font ?? NSFont.systemFont(ofSize: 16),
                .foregroundColor: self.textColor ?? NSColor.labelColor,
                .paragraphStyle: paragraphStyle
            ]

            print("   ✅ Set LTR typing attributes in becomeFirstResponder")
        }

        return result
    }

    override func keyDown(with event: NSEvent) {
        print("⌨️ KeyboardCapturingTextView.keyDown called - keyCode: \(event.keyCode)")

        // Force LTR before processing any key
        self.alignment = .left
        self.baseWritingDirection = .leftToRight

        if let handler = onKeyEvent {
            let cursorPos = selectedRange().location
            let textLen = string.count
            let handled = handler(event, cursorPos, textLen)
            print("  Handler returned: \(handled), cursor: \(cursorPos)/\(textLen)")
            if handled {
                return
            }
        }
        super.keyDown(with: event)

        // Force LTR after processing key
        self.alignment = .left
        self.baseWritingDirection = .leftToRight
    }

    override func insertText(_ string: Any, replacementRange: NSRange) {
        print("📝 insertText(_:replacementRange:) called - string: '\(string)', replacementRange: \(replacementRange), current cursor: \(selectedRange().location)")

        // DUMP ALL PROPERTIES BEFORE INSERTION
        print("   🔍 BEFORE insertion:")
        print("      alignment: \(self.alignment.rawValue)")
        print("      baseWritingDirection: \(self.baseWritingDirection.rawValue)")
        print("      defaultParagraphStyle.baseWritingDirection: \(self.defaultParagraphStyle?.baseWritingDirection.rawValue ?? -999)")
        if let attrs = self.typingAttributes[.paragraphStyle] as? NSParagraphStyle {
            print("      typingAttributes paragraphStyle.baseWritingDirection: \(attrs.baseWritingDirection.rawValue)")
        }

        // Save cursor position BEFORE insertion
        // If replacementRange is NSRange.notFound (Int.max), use current selection
        let insertionPoint = (replacementRange.location == NSNotFound) ? selectedRange().location : replacementRange.location

        // CRITICAL: Set LTR attributes BEFORE calling super
        self.alignment = .left
        self.baseWritingDirection = .leftToRight

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .left
        paragraphStyle.baseWritingDirection = .leftToRight

        // Set BOTH defaultParagraphStyle AND typingAttributes
        self.defaultParagraphStyle = paragraphStyle

        self.typingAttributes = [
            .font: self.font ?? NSFont.systemFont(ofSize: 16),
            .foregroundColor: self.textColor ?? NSColor.labelColor,
            .paragraphStyle: paragraphStyle
        ]

        print("   ✅ Set LTR typing attributes, calling super.insertText")

        super.insertText(string, replacementRange: replacementRange)

        // DUMP ALL PROPERTIES AFTER INSERTION
        print("   🔍 AFTER insertion:")
        print("      alignment: \(self.alignment.rawValue)")
        print("      baseWritingDirection: \(self.baseWritingDirection.rawValue)")
        print("      defaultParagraphStyle.baseWritingDirection: \(self.defaultParagraphStyle?.baseWritingDirection.rawValue ?? -999)")
        if let textStorage = self.textStorage, textStorage.length > 0 {
            let attrs = textStorage.attributes(at: 0, effectiveRange: nil)
            if let para = attrs[.paragraphStyle] as? NSParagraphStyle {
                print("      ACTUAL TEXT paragraphStyle.baseWritingDirection: \(para.baseWritingDirection.rawValue)")
            }
        }

        print("   ✅ After insertText - cursor: \(selectedRange().location), textLength: \(self.string.count)")

        // Force LTR on the text view again after insertion
        self.alignment = .left
        self.baseWritingDirection = .leftToRight
    }

    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        // Handle Tab key to prevent system from stealing it
        if event.keyCode == 48 { // Tab key
            print("⌨️ Tab key in performKeyEquivalent")
            if let handler = onKeyEvent {
                let cursorPos = selectedRange().location
                let textLen = string.count
                if handler(event, cursorPos, textLen) {
                    return true
                }
            }
        }
        return super.performKeyEquivalent(with: event)
    }
}

// Type alias for compatibility
typealias KeyboardCapturingTextField = KeyboardCapturingTextView

/// SwiftUI wrapper for KeyboardCapturingTextField
struct KeyboardHandlingTextField: NSViewRepresentable {
    @Binding var text: String
    let font: NSFont
    let textColor: NSColor
    let placeholder: String
    let onKeyEvent: (NSEvent, Int, Int) -> Bool  // event, cursorPosition, textLength
    let onFocusChange: (Bool) -> Void
    var shouldFocus: Bool = false
    var cursorPosition: CursorPosition? = nil
    @Binding var calculatedHeight: CGFloat

    enum CursorPosition {
        case start
        case end
    }

    func makeNSView(context: Context) -> KeyboardCapturingTextField {
        print("🏗️ makeNSView called - creating NEW text view")
        let textView = KeyboardCapturingTextField()

        textView.backgroundColor = .clear
        textView.font = font
        textView.textColor = textColor
        textView.onKeyEvent = onKeyEvent
        textView.delegate = context.coordinator

        // Enable word wrapping
        textView.isHorizontallyResizable = false
        textView.isVerticallyResizable = true
        textView.textContainer?.widthTracksTextView = true
        textView.textContainer?.heightTracksTextView = false
        textView.textContainer?.containerSize = NSSize(width: 0, height: CGFloat.greatestFiniteMagnitude)

        // Set line fragment padding to 0
        textView.textContainer?.lineFragmentPadding = 0

        // Set max size
        textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude)

        // Disable rich text
        textView.isRichText = false
        textView.allowsUndo = true

        // Minimal padding
        textView.textContainerInset = NSSize(width: 0, height: 0)

        // Set text alignment to left-to-right
        textView.alignment = .left
        textView.baseWritingDirection = .leftToRight

        // Set default typing attributes with LTR paragraph style
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .left
        paragraphStyle.baseWritingDirection = .leftToRight

        // Set BOTH defaultParagraphStyle AND typingAttributes
        textView.defaultParagraphStyle = paragraphStyle

        textView.typingAttributes = [
            .font: font,
            .foregroundColor: textColor,
            .paragraphStyle: paragraphStyle
        ]

        // Set initial text
        textView.string = text

        return textView
    }

    func updateNSView(_ textView: KeyboardCapturingTextField, context: Context) {
        let needsTextUpdate = textView.string != text
        let isEditing = textView.window?.firstResponder == textView

        print("🔄 updateNSView CALLED - text: '\(text)', textView.string: '\(textView.string)', isEditing: \(isEditing), needsTextUpdate: \(needsTextUpdate), cursor: \(textView.selectedRange().location)")

        // CRITICAL: If user is editing, DON'T touch ANYTHING except height calculation
        if isEditing {
            print("   ⚠️ User is editing - SKIPPING all updates except height")
            // ONLY do height calculation when editing, nothing else
            if let layoutManager = textView.layoutManager,
               let textContainer = textView.textContainer {
                layoutManager.ensureLayout(for: textContainer)
                let usedRect = layoutManager.usedRect(for: textContainer)
                let newHeight = max(20, usedRect.height)

                if abs(calculatedHeight - newHeight) > 0.5 {
                    DispatchQueue.main.async {
                        calculatedHeight = newHeight
                    }
                }
            }
            return  // EXIT EARLY - don't modify anything while user is typing!
        }

        print("   ✅ User NOT editing - applying LTR settings")

        // Ensure text direction is always left-to-right
        textView.alignment = .left
        textView.baseWritingDirection = .leftToRight

        // Create LTR paragraph style
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .left
        paragraphStyle.baseWritingDirection = .leftToRight

        // Update typing attributes
        textView.typingAttributes = [
            .font: font,
            .foregroundColor: textColor,
            .paragraphStyle: paragraphStyle
        ]

        if needsTextUpdate {
            print("🔄 updateNSView - text mismatch! textView: '\(textView.string)', binding: '\(text)', isEditing: \(isEditing)")
        }

        if needsTextUpdate {
            print("   ⚠️ Updating textView.string from binding (not editing)")
            // Save cursor position
            let savedSelection = textView.selectedRange()

            textView.string = text
            // Re-apply writing direction after text update
            textView.baseWritingDirection = .leftToRight

            // Apply paragraph style to the new text
            if text.count > 0 {
                let range = NSRange(location: 0, length: text.count)
                textView.textStorage?.addAttribute(.paragraphStyle, value: paragraphStyle, range: range)
            }

            // Restore cursor position (bounded by new text length)
            let newLocation = min(savedSelection.location, text.count)
            textView.setSelectedRange(NSRange(location: newLocation, length: 0))
        }

        // Calculate height based on text content
        if let layoutManager = textView.layoutManager,
           let textContainer = textView.textContainer {
            // Force layout calculation
            layoutManager.ensureLayout(for: textContainer)
            let usedRect = layoutManager.usedRect(for: textContainer)
            let newHeight = max(20, usedRect.height) // Minimum height of 20

            // Update immediately without async if text just changed, otherwise async to avoid re-render loop
            if abs(calculatedHeight - newHeight) > 0.5 {
                if needsTextUpdate {
                    // Synchronous update on text change to prevent flash
                    calculatedHeight = newHeight
                } else {
                    DispatchQueue.main.async {
                        calculatedHeight = newHeight
                    }
                }
            }
        }

        // Handle focus request
        if shouldFocus {
            // Set typing attributes BEFORE async to ensure they're ready
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.alignment = .left
            paragraphStyle.baseWritingDirection = .leftToRight

            textView.alignment = .left
            textView.baseWritingDirection = .leftToRight
            textView.defaultParagraphStyle = paragraphStyle
            textView.typingAttributes = [
                .font: font,
                .foregroundColor: textColor,
                .paragraphStyle: paragraphStyle
            ]

            DispatchQueue.main.async {
                textView.window?.makeFirstResponder(textView)

                // Set cursor position if specified
                if let position = cursorPosition {
                    let location = position == .end ? textView.string.count : 0
                    textView.setSelectedRange(NSRange(location: location, length: 0))
                }

                // Force typing attributes again after focus
                textView.alignment = .left
                textView.baseWritingDirection = .leftToRight
                textView.typingAttributes = [
                    .font: textView.font ?? NSFont.systemFont(ofSize: 16),
                    .foregroundColor: textView.textColor ?? NSColor.labelColor,
                    .paragraphStyle: paragraphStyle
                ]
            }
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: KeyboardHandlingTextField

        init(_ parent: KeyboardHandlingTextField) {
            self.parent = parent
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }

            print("📝 textDidChange - text: '\(textView.string)', cursor: \(textView.selectedRange().location)")

            // DON'T modify text storage here - it resets the cursor!
            // Just update the parent's text binding
            self.parent.text = textView.string

            // Update height when text changes
            if let layoutManager = textView.layoutManager,
               let textContainer = textView.textContainer {
                layoutManager.ensureLayout(for: textContainer)
                let usedRect = layoutManager.usedRect(for: textContainer)
                let newHeight = max(20, usedRect.height)

                if abs(self.parent.calculatedHeight - newHeight) > 0.5 {
                    DispatchQueue.main.async { [self] in
                        self.parent.calculatedHeight = newHeight
                    }
                }
            }

            print("   ✅ textDidChange complete - cursor still at: \(textView.selectedRange().location)")
        }

        func textDidBeginEditing(_ notification: Notification) {
            print("📝 textDidBeginEditing called")
            // DON'T modify text storage here - it interferes with insertText!
            // Just notify parent that editing began
            parent.onFocusChange(true)
        }

        func textDidEndEditing(_ notification: Notification) {
            parent.onFocusChange(false)
        }
    }
}

#endif
