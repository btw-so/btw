//
//  ChildWidget.swift
//  Locus Extensions
//
//  Widget that displays the most recently created child node and its note content
//

import WidgetKit
import SwiftUI

// MARK: - Data Models
struct ChildWidgetNodeData: Codable {
    let parentNodeId: String
    let parentNodeText: String
    let lastUpdated: Date
}

struct ChildNodeInfo {
    let childNodeId: String
    let childNodeText: String
    let childNoteContent: String?
    let childCreatedAt: Date
}

// MARK: - Timeline Provider
struct ChildWidgetProvider: TimelineProvider {
    typealias Entry = ChildWidgetEntry

    func placeholder(in context: Context) -> ChildWidgetEntry {
        ChildWidgetEntry(
            date: Date(),
            parentData: ChildWidgetNodeData(
                parentNodeId: "placeholder",
                parentNodeText: "Select a parent node",
                lastUpdated: Date()
            ),
            childInfo: ChildNodeInfo(
                childNodeId: "placeholder",
                childNodeText: "Most recent child",
                childNoteContent: "The most recent child and its note will appear here",
                childCreatedAt: Date()
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (ChildWidgetEntry) -> Void) {
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ChildWidgetEntry>) -> Void) {
        print("🔵 [ChildWidget] ==================== getTimeline START ====================")

        // Read parent data from App Groups shared storage
        let (parentData, widgetToken, fingerprint) = loadChildWidgetData()

        print("🔵 [ChildWidget] Parent data loaded:")
        print("🔵 [ChildWidget]   - parentNodeId: \(parentData.parentNodeId)")
        print("🔵 [ChildWidget]   - parentNodeText: \(parentData.parentNodeText)")
        print("🔵 [ChildWidget]   - widgetToken: \(widgetToken?.prefix(10) ?? "nil")...")
        print("🔵 [ChildWidget]   - fingerprint: \(fingerprint ?? "nil")")
        print("🔵 [ChildWidget]   - isEmpty: \(parentData.parentNodeId.isEmpty)")

        // If no parent configured, show empty state
        if parentData.parentNodeId.isEmpty {
            print("⚠️ [ChildWidget] No parent node configured, showing empty state")
            let entry = ChildWidgetEntry(
                date: Date(),
                parentData: parentData,
                childInfo: nil
            )
            let timeline = Timeline(entries: [entry], policy: .never)
            completion(timeline)
            return
        }

        // Fetch the most recent child dynamically
        print("🔵 [ChildWidget] About to fetch most recent child...")
        fetchMostRecentChild(parentId: parentData.parentNodeId, widgetToken: widgetToken, fingerprint: fingerprint) { childInfo in
            print("🔵 [ChildWidget] fetchMostRecentChild callback received")

            let entry = ChildWidgetEntry(
                date: Date(),
                parentData: parentData,
                childInfo: childInfo
            )

            if let child = childInfo {
                print("✅ [ChildWidget] Created entry with child: \(child.childNodeText)")
            } else {
                print("⚠️ [ChildWidget] Created entry with NO child")
            }

            // Refresh timeline every 15 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

            print("🔵 [ChildWidget] ==================== getTimeline END ====================")
            completion(timeline)
        }
    }

    private func loadChildWidgetData() -> (parentData: ChildWidgetNodeData, widgetToken: String?, fingerprint: String?) {
        print("🔵 [ChildWidget] loadChildWidgetData called")

        // Access shared UserDefaults using App Group
        guard let userDefaults = UserDefaults(suiteName: "group.com.siddg.locus.widgets") else {
            print("❌ [ChildWidget] Failed to access App Group")
            return (ChildWidgetNodeData(
                parentNodeId: "",
                parentNodeText: "Configuration error",
                lastUpdated: Date()
            ), nil, nil)
        }

        print("✅ [ChildWidget] App Group accessed")

        // Try to load saved data
        if let jsonData = userDefaults.data(forKey: "childWidget") {
            print("✅ [ChildWidget] Found data for key 'childWidget'")

            if let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
               let parentNodeId = dict["parentNodeId"] as? String,
               let parentNodeText = dict["parentNodeText"] as? String,
               let lastUpdated = dict["lastUpdated"] as? TimeInterval {
                print("✅ [ChildWidget] Successfully decoded parent: \(parentNodeText)")
                let widgetToken = dict["widgetToken"] as? String
                let fingerprint = dict["fingerprint"] as? String
                print("🔵 [ChildWidget] WidgetToken: \(widgetToken?.prefix(10) ?? "nil")...")
                print("🔵 [ChildWidget] Fingerprint: \(fingerprint ?? "nil")")
                return (ChildWidgetNodeData(
                    parentNodeId: parentNodeId,
                    parentNodeText: parentNodeText,
                    lastUpdated: Date(timeIntervalSince1970: lastUpdated)
                ), widgetToken, fingerprint)
            }
            print("❌ [ChildWidget] Failed to decode JSON")
        } else {
            print("⚠️ [ChildWidget] No data found for key 'childWidget'")
        }

        // Return default if no data
        return (ChildWidgetNodeData(
            parentNodeId: "",
            parentNodeText: "No node selected",
            lastUpdated: Date()
        ), nil, nil)
    }

    private func fetchMostRecentChild(parentId: String, widgetToken: String?, fingerprint: String?, completion: @escaping (ChildNodeInfo?) -> Void) {
        print("🔵 [ChildWidget] fetchMostRecentChild called for parent: \(parentId)")

        guard !parentId.isEmpty else {
            print("⚠️ [ChildWidget] Empty parent ID")
            completion(nil)
            return
        }

        guard let widgetToken = widgetToken else {
            print("❌ [ChildWidget] No widget token available")
            completion(nil)
            return
        }

        guard let fingerprint = fingerprint else {
            print("❌ [ChildWidget] No fingerprint available")
            completion(nil)
            return
        }

        // Construct API URL - POST to /list/get
        let urlString = "https://api.siddg.com/list/get"
        guard let url = URL(string: urlString) else {
            print("❌ [ChildWidget] Invalid URL")
            completion(nil)
            return
        }

        print("🔵 [ChildWidget] Fetching from: \(urlString)")

        // Prepare POST body with widgetToken and fingerprint
        let requestBody: [String: Any] = [
            "id": parentId,
            "widgetToken": widgetToken,
            "fingerprint": fingerprint,
            "page": 1,
            "limit": 200,
            "after": 0
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: requestBody) else {
            print("❌ [ChildWidget] Failed to encode request body")
            completion(nil)
            return
        }

        print("🔵 [ChildWidget] Request body: \(requestBody)")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ [ChildWidget] API error: \(error)")
                completion(nil)
                return
            }

            // Log HTTP response
            if let httpResponse = response as? HTTPURLResponse {
                print("🔵 [ChildWidget] HTTP Status: \(httpResponse.statusCode)")
                print("🔵 [ChildWidget] Response headers: \(httpResponse.allHeaderFields)")
            }

            guard let data = data else {
                print("❌ [ChildWidget] No data received")
                completion(nil)
                return
            }

            // Log raw response
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔵 [ChildWidget] Raw response (first 500 chars): \(String(responseString.prefix(500)))")
            }

            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let nodesData = json?["data"] as? [String: Any],
                      let nodes = nodesData["nodes"] as? [[String: Any]] else {
                    print("❌ [ChildWidget] Invalid JSON structure")
                    if let json = json {
                        print("❌ [ChildWidget] JSON keys: \(json.keys)")
                    }
                    completion(nil)
                    return
                }

                print("✅ [ChildWidget] Received \(nodes.count) nodes")

                // Filter direct children and sort by pos (descending)
                let directChildren = nodes.filter { node in
                    guard let nodeParentId = node["parent_id"] as? String else { return false }
                    return nodeParentId == parentId
                }

                print("🔵 [ChildWidget] Found \(directChildren.count) direct children")

                guard !directChildren.isEmpty else {
                    print("⚠️ [ChildWidget] No children found")
                    completion(nil)
                    return
                }

                // Sort by pos descending (highest pos = most recent)
                let sortedChildren = directChildren.sorted { child1, child2 in
                    let pos1 = child1["pos"] as? Double ?? 0
                    let pos2 = child2["pos"] as? Double ?? 0
                    return pos1 > pos2
                }

                guard let mostRecent = sortedChildren.first,
                      let childId = mostRecent["id"] as? String,
                      let childText = mostRecent["text"] as? String else {
                    print("❌ [ChildWidget] Failed to parse most recent child")
                    completion(nil)
                    return
                }

                let createdAtTimestamp = mostRecent["created_at"] as? TimeInterval ?? Date().timeIntervalSince1970
                let createdAt = Date(timeIntervalSince1970: createdAtTimestamp / 1000)

                print("✅ [ChildWidget] Most recent child: \(childText)")

                // Fetch child's note content (pass parentId for token verification)
                self.fetchNodeNote(nodeId: childId, parentNodeId: parentId, widgetToken: widgetToken, fingerprint: fingerprint) { noteContent in
                    let childInfo = ChildNodeInfo(
                        childNodeId: childId,
                        childNodeText: childText,
                        childNoteContent: noteContent,
                        childCreatedAt: createdAt
                    )
                    completion(childInfo)
                }
            } catch {
                print("❌ [ChildWidget] JSON parse error: \(error)")
                completion(nil)
            }
        }

        task.resume()
    }

    private func fetchNodeNote(nodeId: String, parentNodeId: String, widgetToken: String, fingerprint: String, completion: @escaping (String?) -> Void) {
        let urlString = "https://api.siddg.com/list/api/node/\(nodeId)?widgetToken=\(widgetToken)&fingerprint=\(fingerprint)&parentNodeId=\(parentNodeId)"

        print("🔵 [ChildWidget] Fetching note for nodeId: \(nodeId)")
        print("🔵 [ChildWidget] Note URL: \(urlString)")

        guard let url = URL(string: urlString) else {
            print("❌ [ChildWidget] Invalid note URL")
            completion(nil)
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                print("❌ [ChildWidget] Note fetch error: \(error)")
                completion(nil)
                return
            }

            // Log HTTP response
            if let httpResponse = response as? HTTPURLResponse {
                print("🔵 [ChildWidget] Note HTTP Status: \(httpResponse.statusCode)")
            }

            guard let data = data else {
                print("❌ [ChildWidget] No note data received")
                completion(nil)
                return
            }

            // Log raw response
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔵 [ChildWidget] Note response: \(String(responseString.prefix(500)))")
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("❌ [ChildWidget] Failed to parse note JSON")
                completion(nil)
                return
            }

            print("🔵 [ChildWidget] Note JSON keys: \(json.keys)")

            guard let nodeData = json["data"] as? [String: Any] else {
                print("❌ [ChildWidget] No 'data' in note response")
                completion(nil)
                return
            }

            print("🔵 [ChildWidget] Note data keys: \(nodeData.keys)")

            guard let note = nodeData["note"] as? [String: Any] else {
                print("❌ [ChildWidget] No 'note' in data")
                completion(nil)
                return
            }

            print("🔵 [ChildWidget] Note keys: \(note.keys)")

            let noteContent = (note["md"] as? String) ?? (note["html"] as? String)
            print("✅ [ChildWidget] Note content length: \(noteContent?.count ?? 0)")
            completion(noteContent)
        }

        task.resume()
    }
}

// MARK: - Timeline Entry
struct ChildWidgetEntry: TimelineEntry {
    let date: Date
    let parentData: ChildWidgetNodeData
    let childInfo: ChildNodeInfo?
}

// MARK: - Widget View
struct ChildWidgetView: View {
    var entry: ChildWidgetEntry

    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header with parent node title
            Text(entry.parentData.parentNodeText)
                .font(.custom("Avenir Next", size: 11))
                .lineLimit(1)
                .foregroundColor(.secondary)

            // Child node info
            if let child = entry.childInfo {
                Text(child.childNodeText)
                    .font(.custom("Avenir Next", size: 24))
                    .fontWeight(.semibold)
                    .lineLimit(2)
                    .foregroundColor(.primary)

                // Child note content
                if let content = child.childNoteContent, !content.isEmpty {
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
            } else {
                VStack(spacing: 8) {
                    Text("No child nodes yet")
                        .font(.custom("Avenir Next", size: 17))
                        .foregroundColor(.gray.opacity(0.6))
                        .italic()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }

            Spacer()
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(getWidgetURL())
    }

    private func getWidgetURL() -> URL? {
        // If widget is configured and has a child, open the child node detail
        if let child = entry.childInfo {
            return URL(string: "locus://node/\(child.childNodeId)")
        }
        // If configured but no child, open the parent node
        if !entry.parentData.parentNodeId.isEmpty {
            return URL(string: "locus://node/\(entry.parentData.parentNodeId)")
        }
        // If not configured, open widget config
        return URL(string: "locus://widgetConfig")
    }

    private func timeAgoString(from date: Date) -> String {
        let now = Date()
        let components = Calendar.current.dateComponents([.minute, .hour, .day], from: date, to: now)

        if let days = components.day, days > 0 {
            return days == 1 ? "1 day ago" : "\(days) days ago"
        } else if let hours = components.hour, hours > 0 {
            return hours == 1 ? "1 hour ago" : "\(hours) hours ago"
        } else if let minutes = components.minute, minutes > 0 {
            return minutes == 1 ? "1 min ago" : "\(minutes) mins ago"
        } else {
            return "Just now"
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
struct ChildWidget: Widget {
    let kind: String = "ChildWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ChildWidgetProvider()) { entry in
            ChildWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.clear
                }
        }
        .configurationDisplayName("Child Widget")
        .description("Displays the most recently created child node and its note content")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Preview
#Preview(as: .systemMedium) {
    ChildWidget()
} timeline: {
    ChildWidgetEntry(
        date: .now,
        parentData: ChildWidgetNodeData(
            parentNodeId: "parent-1",
            parentNodeText: "Work Projects",
            lastUpdated: .now
        ),
        childInfo: ChildNodeInfo(
            childNodeId: "child-1",
            childNodeText: "Mobile App Design",
            childNoteContent: "Working on the new widget feature for the iOS app. Need to implement NoteWidget and ChildWidget components.",
            childCreatedAt: Calendar.current.date(byAdding: .hour, value: -2, to: .now)!
        )
    )
    ChildWidgetEntry(
        date: .now,
        parentData: ChildWidgetNodeData(
            parentNodeId: "parent-2",
            parentNodeText: "Personal",
            lastUpdated: .now
        ),
        childInfo: nil
    )
}
