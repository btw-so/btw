//
//  NodeModels.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import Foundation


struct ListNode: Codable, Identifiable {
    let id: String
    var parentId: String?
    var pos: Double?
    var text: String
    var checked: Bool?
    var checkedDate: String?
    var collapsed: Bool?
    var pinnedPos: Int64?
    var noteId: String?
    var fileId: String?
    var noteExists: Bool?
    var scribbleExists: Bool?
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case parentId = "parent_id"
        case pos
        case text
        case checked
        case checkedDate = "checked_date"
        case collapsed
        case pinnedPos = "pinned_pos"
        case noteId = "note_id"
        case fileId = "file_id"
        case noteExists = "note_exists"
        case scribbleExists = "scribble_exists"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var isPinned: Bool {
        return pinnedPos != nil
    }

    // Computed properties with safe defaults
    var safePos: Double {
        return pos ?? 0
    }

    var safeChecked: Bool {
        return checked ?? false
    }

    var safeCollapsed: Bool {
        return collapsed ?? false
    }

    var safeNoteExists: Bool {
        return noteExists ?? false
    }

    var safeScribbleExists: Bool {
        return scribbleExists ?? false
    }
}

struct NodeUIInfo {
    var children: [String]
    var depth: Int
}

struct SearchResult: Codable {
    let nodes: [ListNode]
}

struct PinnedNodesResponse: Codable {
    let success: Bool
    let data: PinnedNodesData
    let error: String?

    struct PinnedNodesData: Codable {
        let pinnedNodes: [ListNode]
    }
}

struct SearchNodesResponse: Codable {
    let success: Bool
    let data: SearchResult
    let error: String?
}

struct ListResponse: Codable {
    let success: Bool
    let data: ListData

    struct ListData: Codable {
        let nodes: [ListNode]
        let total: Int?      // Optional - only present in paginated responses
        let page: Int?       // Optional - only present in paginated responses
        let limit: Int?      // Optional - only present in paginated responses
    }

    // Ignore error field since it can be string or object
    enum CodingKeys: String, CodingKey {
        case success
        case data
    }
}

struct NodeUpdateRequest: Codable {
    let id: String
    let parentId: String?
    let pos: Double?
    let text: String?
    let checked: Bool?
    let checkedDate: String?
    let collapsed: Bool?
    let pinnedPos: Int64?
    let noteId: String?
    let fileId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case parentId = "parent_id"
        case pos
        case text
        case checked
        case checkedDate = "checked_date"
        case collapsed
        case pinnedPos = "pinned_pos"
        case noteId = "note_id"
        case fileId = "file_id"
    }
}

// MARK: - Note Types

struct LocusNote: Codable {
    let id: String
    let userId: Int
    let title: String?
    let html: String?
    let md: String?
    let json: String?
    let tags: String?
    let image: String?
    let archive: Bool?
    let delete: Bool?
    let publish: Bool?
    let `private`: Bool?
    let slug: String?
    let createdAt: String?
    let updatedAt: String?
    let publishedAt: String?
    let deletedAt: String?
    // Note: ydoc is binary data, we'll skip it for backups

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case html
        case md
        case json
        case tags
        case image
        case archive
        case delete
        case publish
        case `private`
        case slug
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case publishedAt = "published_at"
        case deletedAt = "deleted_at"
    }

    // Custom decoder to handle json field being either String or Dictionary
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(Int.self, forKey: .userId)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        html = try container.decodeIfPresent(String.self, forKey: .html)
        md = try container.decodeIfPresent(String.self, forKey: .md)

        // Handle json field - can be String or Dictionary/Array (any JSON value)
        if let jsonString = try? container.decodeIfPresent(String.self, forKey: .json) {
            // Already a string, use as-is
            json = jsonString
        } else if container.contains(.json) {
            // Try to decode as a generic JSON value and re-encode it as a string
            let jsonDecoder = JSONDecoder()
            if let jsonData = try? JSONSerialization.data(withJSONObject: try container.decode(AnyCodable.self, forKey: .json).value, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                json = jsonString
            } else {
                json = nil
            }
        } else {
            json = nil
        }

        tags = try container.decodeIfPresent(String.self, forKey: .tags)
        image = try container.decodeIfPresent(String.self, forKey: .image)
        archive = try container.decodeIfPresent(Bool.self, forKey: .archive)
        delete = try container.decodeIfPresent(Bool.self, forKey: .delete)
        publish = try container.decodeIfPresent(Bool.self, forKey: .publish)
        `private` = try container.decodeIfPresent(Bool.self, forKey: .private)
        slug = try container.decodeIfPresent(String.self, forKey: .slug)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
        publishedAt = try container.decodeIfPresent(String.self, forKey: .publishedAt)
        deletedAt = try container.decodeIfPresent(String.self, forKey: .deletedAt)
    }
}

// Helper to decode any JSON value
struct AnyCodable: Codable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        if let intValue = value as? Int {
            try container.encode(intValue)
        } else if let doubleValue = value as? Double {
            try container.encode(doubleValue)
        } else if let boolValue = value as? Bool {
            try container.encode(boolValue)
        } else if let stringValue = value as? String {
            try container.encode(stringValue)
        } else if let arrayValue = value as? [Any] {
            try container.encode(arrayValue.map { AnyCodable(value: $0) })
        } else if let dictValue = value as? [String: Any] {
            try container.encode(dictValue.mapValues { AnyCodable(value: $0) })
        } else {
            try container.encodeNil()
        }
    }

    init(value: Any) {
        self.value = value
    }
}

struct NoteResponse: Codable {
    let success: Bool
    let data: NoteData
    let error: String?

    struct NoteData: Codable {
        let note: LocusNote?
    }
}

struct NotesResponse: Codable {
    let success: Bool
    let data: NotesData?
    let isLoggedIn: Bool?
    let error: String?

    struct NotesData: Codable {
        let notes: [LocusNote]?
        let page: Int?
        let total: Int?
        let limit: Int?
    }
}

// MARK: - File Types

struct LocusFile: Codable {
    let id: String
    let userId: Int
    let name: String?
    let url: String
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case url
        case createdAt = "created_at"
    }
}

struct FilesResponse: Codable {
    let success: Bool
    let data: FilesData?
    let isLoggedIn: Bool?
    let error: String?

    struct FilesData: Codable {
        let files: [LocusFile]?
        let page: Int?
        let total: Int?
        let limit: Int?
    }
}
