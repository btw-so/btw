//
//  NoteWidget.swift
//  List Extensions
//
//  Widget that displays the note content of a selected node
//

import WidgetKit
import SwiftUI

// MARK: - Data Models
struct WidgetNodeData: Codable {
    let nodeId: String
    let nodeText: String
    let noteContent: String?
    let lastUpdated: Date
}

// MARK: - Timeline Provider
struct NoteWidgetProvider: TimelineProvider {
    typealias Entry = NoteWidgetEntry

    func placeholder(in context: Context) -> NoteWidgetEntry {
        NoteWidgetEntry(
            date: Date(),
            nodeData: WidgetNodeData(
                nodeId: "placeholder",
                nodeText: "Hello",
                noteContent: "Your note content will appear here",
                lastUpdated: Date()
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (NoteWidgetEntry) -> Void) {
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NoteWidgetEntry>) -> Void) {
        print("🔵 [NoteWidget] getTimeline called")

        // Read data from App Groups shared storage
        let nodeData = loadNoteWidgetData()
        let entry = NoteWidgetEntry(date: Date(), nodeData: nodeData)

        print("🔵 [NoteWidget] Creating entry with nodeText: \(nodeData.nodeText)")

        // Refresh timeline every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

        completion(timeline)
    }

    private func loadNoteWidgetData() -> WidgetNodeData {
        print("🔵 [NoteWidget] loadNoteWidgetData called")

        // Access shared UserDefaults using App Group
        guard let userDefaults = UserDefaults(suiteName: "group.com.listgo.widgets") else {
            print("❌ [NoteWidget] Failed to access App Group")
            return WidgetNodeData(
                nodeId: "",
                nodeText: "Configuration error",
                noteContent: "Unable to access shared data",
                lastUpdated: Date()
            )
        }

        print("✅ [NoteWidget] App Group accessed")

        // Try to load saved data from JSON
        if let jsonData = userDefaults.data(forKey: "noteWidget") {
            print("✅ [NoteWidget] Found data for key 'noteWidget'")

            // Try manual decoding since we're storing JSON
            if let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
               let nodeId = dict["nodeId"] as? String,
               let nodeText = dict["nodeText"] as? String,
               let noteContent = dict["noteContent"] as? String,
               let lastUpdated = dict["lastUpdated"] as? TimeInterval {
                print("✅ [NoteWidget] Successfully decoded: \(nodeText)")
                return WidgetNodeData(
                    nodeId: nodeId,
                    nodeText: nodeText,
                    noteContent: noteContent,
                    lastUpdated: Date(timeIntervalSince1970: lastUpdated)
                )
            }
            print("❌ [NoteWidget] Failed to decode JSON")
        } else {
            print("⚠️ [NoteWidget] No data found for key 'noteWidget'")
        }

        // Return default if no data
        return WidgetNodeData(
            nodeId: "",
            nodeText: "No node selected",
            noteContent: "Open the app to select a node for this widget",
            lastUpdated: Date()
        )
    }
}

// MARK: - Timeline Entry
struct NoteWidgetEntry: TimelineEntry {
    let date: Date
    let nodeData: WidgetNodeData
}

// MARK: - Widget View
struct NoteWidgetView: View {
    var entry: NoteWidgetEntry

    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header with node title
            Text(entry.nodeData.nodeText)
                .font(.custom("Avenir Next", size: 24))
                .fontWeight(.semibold)
                .lineLimit(2)
                .foregroundColor(.primary)

            // Note content
            if let content = entry.nodeData.noteContent, !content.isEmpty {
                Text(stripMarkdown(content))
                    .font(.custom("Avenir Next", size: 17))
                    .foregroundColor(.primary.opacity(0.85))
                    .lineLimit(widgetFamily == .systemSmall ? 8 : (widgetFamily == .systemMedium ? 10 : 20))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else {
                Text("Empty note")
                    .font(.custom("Avenir Next", size: 17))
                    .foregroundColor(.gray.opacity(0.6))
                    .italic()
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }

            Spacer()
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            Color.clear
        }
    }

    private func stripMarkdown(_ markdown: String) -> String {
        var text = markdown

        // Remove headers (# ## ###)
        text = text.replacingOccurrences(of: #"^#{1,6}\s+"#, with: "", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"\n#{1,6}\s+"#, with: "\n", options: .regularExpression, range: nil)

        // Remove bold (**text** or __text__)
        text = text.replacingOccurrences(of: #"\*\*(.+?)\*\*"#, with: "$1", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"__(.+?)__"#, with: "$1", options: .regularExpression, range: nil)

        // Remove italic (*text* or _text_)
        text = text.replacingOccurrences(of: #"\*(.+?)\*"#, with: "$1", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"_(.+?)_"#, with: "$1", options: .regularExpression, range: nil)

        // Remove links [text](url)
        text = text.replacingOccurrences(of: #"\[(.+?)\]\(.+?\)"#, with: "$1", options: .regularExpression, range: nil)

        // Remove images ![alt](url)
        text = text.replacingOccurrences(of: #"!\[.+?\]\(.+?\)"#, with: "", options: .regularExpression, range: nil)

        // Remove inline code `code`
        text = text.replacingOccurrences(of: #"`(.+?)`"#, with: "$1", options: .regularExpression, range: nil)

        // Remove code blocks ```code```
        text = text.replacingOccurrences(of: #"```[\s\S]*?```"#, with: "", options: .regularExpression, range: nil)

        // Remove blockquotes >
        text = text.replacingOccurrences(of: #"^>\s+"#, with: "", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"\n>\s+"#, with: "\n", options: .regularExpression, range: nil)

        // Replace list markers with bullet (-, *, +, 1.)
        text = text.replacingOccurrences(of: #"^[\s]*[-*+]\s+"#, with: "• ", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"\n[\s]*[-*+]\s+"#, with: "\n• ", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"^[\s]*\d+\.\s+"#, with: "• ", options: .regularExpression, range: nil)
        text = text.replacingOccurrences(of: #"\n[\s]*\d+\.\s+"#, with: "\n• ", options: .regularExpression, range: nil)

        // Remove horizontal rules (--- or ***)
        text = text.replacingOccurrences(of: #"^[-*]{3,}$"#, with: "", options: .regularExpression, range: nil)

        // Clean up excessive newlines
        text = text.replacingOccurrences(of: #"\n{3,}"#, with: "\n\n", options: .regularExpression, range: nil)

        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Widget Configuration
struct NoteWidget: Widget {
    let kind: String = "NoteWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoteWidgetProvider()) { entry in
            NoteWidgetView(entry: entry)
        }
        .configurationDisplayName("Note Widget")
        .description("Displays the note content of your selected node")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Preview
#Preview(as: .systemSmall) {
    NoteWidget()
} timeline: {
    NoteWidgetEntry(
        date: .now,
        nodeData: WidgetNodeData(
            nodeId: "1",
            nodeText: "My Important Note",
            noteContent: "This is some sample note content that will be displayed in the widget. It can be quite long and will wrap across multiple lines.",
            lastUpdated: .now
        )
    )
}
