//
//  NoteWidget.swift
//  Locus Extensions
//
//  Widget that displays the note content of a selected node
//

import WidgetKit
import SwiftUI

// MARK: - Data Models
struct WidgetNodeData: Codable {
    let nodeId: String
    let nodeText: String
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
                lastUpdated: Date()
            ),
            noteContent: "Your note content will appear here"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (NoteWidgetEntry) -> Void) {
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NoteWidgetEntry>) -> Void) {
        print("🔵 [NoteWidget] ==================== getTimeline START ====================")

        // Read data from App Groups shared storage
        let (nodeData, widgetToken, fingerprint) = loadNoteWidgetData()

        print("🔵 [NoteWidget] Node data loaded:")
        print("🔵 [NoteWidget]   - nodeId: \(nodeData.nodeId)")
        print("🔵 [NoteWidget]   - nodeText: \(nodeData.nodeText)")
        print("🔵 [NoteWidget]   - widgetToken: \(widgetToken?.prefix(10) ?? "nil")...")
        print("🔵 [NoteWidget]   - fingerprint: \(fingerprint ?? "nil")")
        print("🔵 [NoteWidget]   - isEmpty: \(nodeData.nodeId.isEmpty)")

        // If no node configured, show empty state
        if nodeData.nodeId.isEmpty {
            print("⚠️ [NoteWidget] No node configured, showing empty state")
            let entry = NoteWidgetEntry(
                date: Date(),
                nodeData: nodeData,
                noteContent: nil
            )
            let timeline = Timeline(entries: [entry], policy: .never)
            completion(timeline)
            return
        }

        // Fetch note content dynamically via API
        print("🔵 [NoteWidget] About to fetch note content...")
        fetchNodeNote(nodeId: nodeData.nodeId, widgetToken: widgetToken, fingerprint: fingerprint) { noteContent in
            print("🔵 [NoteWidget] fetchNodeNote callback received")

            let entry = NoteWidgetEntry(
                date: Date(),
                nodeData: nodeData,
                noteContent: noteContent
            )

            if let content = noteContent {
                print("✅ [NoteWidget] Created entry with note content length: \(content.count)")
            } else {
                print("⚠️ [NoteWidget] Created entry with NO note content")
            }

            // Refresh timeline every 15 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

            print("🔵 [NoteWidget] ==================== getTimeline END ====================")
            completion(timeline)
        }
    }

    private func loadNoteWidgetData() -> (nodeData: WidgetNodeData, widgetToken: String?, fingerprint: String?) {
        print("🔵 [NoteWidget] loadNoteWidgetData called")

        // Access shared UserDefaults using App Group
        guard let userDefaults = UserDefaults(suiteName: "group.com.siddg.locus.widgets") else {
            print("❌ [NoteWidget] Failed to access App Group")
            return (WidgetNodeData(
                nodeId: "",
                nodeText: "Configuration error",
                lastUpdated: Date()
            ), nil, nil)
        }

        print("✅ [NoteWidget] App Group accessed")

        // Try to load saved data from JSON
        if let jsonData = userDefaults.data(forKey: "noteWidget") {
            print("✅ [NoteWidget] Found data for key 'noteWidget'")

            // Try manual decoding since we're storing JSON
            if let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
               let nodeId = dict["nodeId"] as? String,
               let nodeText = dict["nodeText"] as? String,
               let lastUpdated = dict["lastUpdated"] as? TimeInterval {
                print("✅ [NoteWidget] Successfully decoded: \(nodeText)")
                let widgetToken = dict["widgetToken"] as? String
                let fingerprint = dict["fingerprint"] as? String
                print("🔵 [NoteWidget] WidgetToken: \(widgetToken?.prefix(10) ?? "nil")...")
                print("🔵 [NoteWidget] Fingerprint: \(fingerprint ?? "nil")")
                return (WidgetNodeData(
                    nodeId: nodeId,
                    nodeText: nodeText,
                    lastUpdated: Date(timeIntervalSince1970: lastUpdated)
                ), widgetToken, fingerprint)
            }
            print("❌ [NoteWidget] Failed to decode JSON")
        } else {
            print("⚠️ [NoteWidget] No data found for key 'noteWidget'")
        }

        // Return default if no data
        return (WidgetNodeData(
            nodeId: "",
            nodeText: "No node selected",
            lastUpdated: Date()
        ), nil, nil)
    }

    private func fetchNodeNote(nodeId: String, widgetToken: String?, fingerprint: String?, completion: @escaping (String?) -> Void) {
        print("🔵 [NoteWidget] fetchNodeNote called for nodeId: \(nodeId)")

        guard !nodeId.isEmpty else {
            print("⚠️ [NoteWidget] Empty node ID")
            completion(nil)
            return
        }

        guard let widgetToken = widgetToken else {
            print("❌ [NoteWidget] No widget token available")
            completion(nil)
            return
        }

        guard let fingerprint = fingerprint else {
            print("❌ [NoteWidget] No fingerprint available")
            completion(nil)
            return
        }

        let urlString = "https://api.siddg.com/list/api/node/\(nodeId)?widgetToken=\(widgetToken)&fingerprint=\(fingerprint)"

        print("🔵 [NoteWidget] Fetching from: \(urlString)")

        guard let url = URL(string: urlString) else {
            print("❌ [NoteWidget] Invalid URL")
            completion(nil)
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                print("❌ [NoteWidget] API error: \(error)")
                completion(nil)
                return
            }

            // Log HTTP response
            if let httpResponse = response as? HTTPURLResponse {
                print("🔵 [NoteWidget] HTTP Status: \(httpResponse.statusCode)")
            }

            guard let data = data else {
                print("❌ [NoteWidget] No data received")
                completion(nil)
                return
            }

            // Log raw response
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔵 [NoteWidget] Raw response (first 500 chars): \(String(responseString.prefix(500)))")
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("❌ [NoteWidget] Failed to parse JSON")
                completion(nil)
                return
            }

            print("🔵 [NoteWidget] JSON keys: \(json.keys)")

            guard let nodeData = json["data"] as? [String: Any] else {
                print("❌ [NoteWidget] No 'data' in response")
                completion(nil)
                return
            }

            print("🔵 [NoteWidget] Data keys: \(nodeData.keys)")

            guard let note = nodeData["note"] as? [String: Any] else {
                print("⚠️ [NoteWidget] No 'note' in data (node may not have a note)")
                completion(nil)
                return
            }

            print("🔵 [NoteWidget] Note keys: \(note.keys)")

            let noteContent = (note["md"] as? String) ?? (note["html"] as? String)
            print("✅ [NoteWidget] Note content length: \(noteContent?.count ?? 0)")
            completion(noteContent)
        }

        task.resume()
    }
}

// MARK: - Timeline Entry
struct NoteWidgetEntry: TimelineEntry {
    let date: Date
    let nodeData: WidgetNodeData
    let noteContent: String?
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
            if let content = entry.noteContent, !content.isEmpty {
                Text(stripMarkdown(content))
                    .font(.custom("Avenir Next", size: 17))
                    .foregroundColor(.primary.opacity(0.85))
                    .lineLimit(widgetFamily == .systemSmall ? 8 : (widgetFamily == .systemMedium ? 10 : 20))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else {
                Text("No note content")
                    .font(.custom("Avenir Next", size: 17))
                    .foregroundColor(.gray.opacity(0.6))
                    .italic()
            }

            Spacer()
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) {
            Color.clear
        }
        .widgetURL(getWidgetURL())
    }

    private func getWidgetURL() -> URL? {
        // If widget is configured, open the node detail
        if !entry.nodeData.nodeId.isEmpty {
            return URL(string: "locus://node/\(entry.nodeData.nodeId)")
        }
        // If not configured, open widget config
        return URL(string: "locus://widgetConfig")
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
            lastUpdated: .now
        ),
        noteContent: "This is some sample note content that will be displayed in the widget. It can be quite long and will wrap across multiple lines."
    )
}
