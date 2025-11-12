//
//  APIService.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import Foundation
import CommonCrypto

class APIService {
    static let shared = APIService()
    private let baseURL = "https://api.siddg.com"
    private let session: URLSession
    private var loginToken: String?

    // Encryption key for generating share hashes
    let encryptionKey = "listsiddg.com"

    private init() {
        // Create URLSession with cookie storage
        let config = URLSessionConfiguration.default
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        self.session = URLSession(configuration: config)

        // Try to load saved login token
        self.loginToken = UserDefaults.standard.string(forKey: "loginToken")
    }

    private func saveLoginToken(_ token: String) {
        self.loginToken = token
        UserDefaults.standard.set(token, forKey: "loginToken")
    }

    private func clearLoginToken() {
        self.loginToken = nil
        UserDefaults.standard.removeObject(forKey: "loginToken")
    }

    func generateFingerprint() -> String {
        // For simplicity, use a stored UUID. In production, use a proper fingerprinting library
        if let stored = UserDefaults.standard.string(forKey: "deviceFingerprint") {
            return stored
        } else {
            let uuid = UUID().uuidString
            UserDefaults.standard.set(uuid, forKey: "deviceFingerprint")
            return uuid
        }
    }

    func generateOTP(email: String) async throws -> Bool {
        let url = URL(string: "\(baseURL)/otp/generate")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "email": email,
            "fingerprint": generateFingerprint()
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(APIResponse.self, from: data)
        return result.success
    }

    func verifyOTP(email: String, otp: String) async throws -> Bool {
        let url = URL(string: "\(baseURL)/otp/validate")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "email": email,
            "otp": otp,
            "fingerprint": generateFingerprint()
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        // Extract loginToken from Set-Cookie header
        print("🔍 Response headers: \(httpResponse.allHeaderFields)")
        if let headerFields = httpResponse.allHeaderFields as? [String: String],
           let url = response.url {
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: headerFields, for: url)
            print("🍪 Found cookies: \(cookies)")
            for cookie in cookies {
                print("🍪 Cookie name: \(cookie.name), value: \(cookie.value)")
                if cookie.name == "btw_uuid" {
                    print("✅ Saving loginToken: \(cookie.value)")
                    saveLoginToken(cookie.value)
                    break
                }
            }
        }

        // Also check if loginToken was saved
        print("💾 Current loginToken: \(loginToken ?? "nil")")

        let result = try JSONDecoder().decode(OTPValidationResponse.self, from: data)
        return result.success && result.data.isValid
    }

    func getUser() async throws -> User? {
        let url = URL(string: "\(baseURL)/user/details")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Manually set cookie header with loginToken
        if let token = loginToken {
            print("🔐 Sending loginToken: \(token)")
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        } else {
            print("⚠️ No loginToken available!")
        }

        let body = ["fingerprint": generateFingerprint()]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        // Debug response
        if let responseString = String(data: data, encoding: .utf8) {
            print("📥 User response (status \(httpResponse.statusCode)): \(responseString)")
        }

        // Check status code
        guard httpResponse.statusCode == 200 else {
            print("❌ Bad status code: \(httpResponse.statusCode)")
            throw URLError(.badServerResponse)
        }

        // Try to decode the response
        do {
            let result = try JSONDecoder().decode(UserResponse.self, from: data)
            print("✅ User result - success: \(result.success), user: \(result.data.user?.email ?? "nil")")

            // If user not found, clear the token
            if !result.success || result.data.user == nil {
                print("❌ Clearing loginToken because user not found")
                clearLoginToken()
            }

            return result.success ? result.data.user : nil
        } catch {
            print("❌ JSON decode error: \(error)")
            if let decodingError = error as? DecodingError {
                switch decodingError {
                case .dataCorrupted(let context):
                    print("   Data corrupted: \(context)")
                case .keyNotFound(let key, let context):
                    print("   Key '\(key)' not found: \(context.debugDescription)")
                case .typeMismatch(let type, let context):
                    print("   Type '\(type)' mismatch: \(context.debugDescription)")
                case .valueNotFound(let type, let context):
                    print("   Value '\(type)' not found: \(context.debugDescription)")
                @unknown default:
                    print("   Unknown decoding error")
                }
            }
            throw error
        }
    }

    func logout() {
        clearLoginToken()
    }

    // MARK: - List Management

    func getList(id: String, after: Int64 = 0, page: Int = 1, limit: Int = 200) async throws -> ListResponse.ListData {
        let url = URL(string: "\(baseURL)/list/get")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
            print("🔐 getList - Sending loginToken: \(token)")
        } else {
            print("⚠️ getList - No loginToken available!")
        }

        let body = [
            "id": id,
            "after": after,
            "page": page,
            "limit": limit,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        print("📤 getList request - id: \(id), after: \(after), page: \(page), limit: \(limit)")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        // Only log errors, not success responses (too large)
        if httpResponse.statusCode != 200, let responseString = String(data: data, encoding: .utf8) {
            print("📥 getList response (status \(httpResponse.statusCode)): \(responseString)")
        }

        guard httpResponse.statusCode == 200 else {
            print("❌ getList bad status code: \(httpResponse.statusCode)")
            throw URLError(.badServerResponse)
        }

        do {
            let result = try JSONDecoder().decode(ListResponse.self, from: data)
            print("✅ getList success: \(result.success), nodes count: \(result.data.nodes.count)")
            return result.data
        } catch {
            print("❌ getList decode error: \(error)")
            throw error
        }
    }

    func getPinnedNodes() async throws -> [ListNode] {
        let url = URL(string: "\(baseURL)/list/pinned")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = ["fingerprint": generateFingerprint()]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        // Debug response
        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ getPinnedNodes failed (status \(httpResponse.statusCode)): \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(PinnedNodesResponse.self, from: data)
        return result.success ? result.data.pinnedNodes : []
    }

    func getBackupNodes(page: Int = 1, limit: Int = 200) async throws -> ListResponse.ListData {
        let url = URL(string: "\(baseURL)/list/backup/nodes")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "page": page,
            "limit": limit,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ getBackupNodes failed (status \(httpResponse.statusCode)): \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(ListResponse.self, from: data)
        return result.data
    }

    func searchNodes(query: String) async throws -> [ListNode] {
        let url = URL(string: "\(baseURL)/list/search")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "query": query,
            "fingerprint": generateFingerprint()
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(SearchNodesResponse.self, from: data)
        return result.success ? result.data.nodes : []
    }

    func upsertNode(_ update: NodeUpdateRequest) async throws -> Bool {
        let url = URL(string: "\(baseURL)/list/update")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        // Build the complete node object with all required fields
        var nodeData: [String: Any] = [
            "id": update.id,
            "text": update.text ?? "",
            "updated_at": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        // Add required fields
        if let parentId = update.parentId {
            nodeData["parent_id"] = parentId
        }
        if let pos = update.pos {
            nodeData["pos"] = pos
        }

        // Add optional fields
        if let checked = update.checked {
            nodeData["checked"] = checked
        }
        if let checkedDate = update.checkedDate {
            nodeData["checked_date"] = checkedDate
        }
        if let collapsed = update.collapsed {
            nodeData["collapsed"] = collapsed
        }
        if let pinnedPos = update.pinnedPos {
            nodeData["pinned_pos"] = pinnedPos
        }
        if let noteId = update.noteId {
            nodeData["note_id"] = noteId
        }
        if let fileId = update.fileId {
            nodeData["file_id"] = fileId
        }

        // Wrap in the expected structure: { fingerprint, nodes: [...] }
        let body: [String: Any] = [
            "fingerprint": generateFingerprint(),
            "nodes": [nodeData]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        // Add better error logging
        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ upsertNode failed (status \(httpResponse.statusCode)): \(responseString)")
                print("📤 Request body: \(String(data: request.httpBody ?? Data(), encoding: .utf8) ?? "nil")")
            }
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(APIResponse.self, from: data)
        return result.success
    }

    // MARK: - File Management

    func getFile(fileId: String) async throws -> String {
        let url = URL(string: "\(baseURL)/files/get-by-id")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        // Get user ID from AuthManager
        guard let userId = AuthManager.shared.currentUser?.id else {
            throw URLError(.userAuthenticationRequired)
        }

        let body = [
            "file_id": fileId,
            "user_id": String(userId),
            "fingerprint": generateFingerprint()
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        // Parse response to get file URL
        let result = try JSONDecoder().decode(FileResponse.self, from: data)
        guard result.success, let fileUrl = result.data.file?.url else {
            throw URLError(.badServerResponse)
        }

        return fileUrl
    }

    func uploadFile(fileData: Data, fileName: String, folder: String) async throws -> String {
        // Generate a unique filename with nonce (matching Uppy logic)
        let sanitizedName = sanitizeFileName(fileName)
        let nonce = String(Int.random(in: 100000..<999999))

        // Get file extension
        let url = URL(fileURLWithPath: fileName)
        let ext = url.pathExtension
        let finalFileName = ext.isEmpty ? "\(folder)/\(sanitizedName)_\(nonce)" : "\(folder)/\(sanitizedName)_\(nonce).\(ext)"

        print("📤 Uploading file: \(finalFileName)")

        // Step 1: Get S3 upload parameters from Uppy Companion
        let companionURL = baseURL // Use same base URL as API (https://api.siddg.com)
        let s3Params = try await getS3UploadParams(
            companionURL: companionURL,
            fileName: finalFileName,
            fileType: getMimeType(for: ext)
        )

        print("✅ Got S3 parameters")

        // Step 2: Upload to S3 using multipart form data
        let uploadedURL = try await uploadToS3Multipart(
            fileData: fileData,
            s3Params: s3Params
        )

        print("✅ File uploaded to: \(uploadedURL)")

        return uploadedURL
    }

    private func getS3UploadParams(companionURL: String, fileName: String, fileType: String) async throws -> S3UploadParams {
        // Build query parameters matching web app format
        var components = URLComponents(string: "\(companionURL)/companion/s3/params")!

        let folder = String(fileName.split(separator: "/").first ?? "")

        components.queryItems = [
            URLQueryItem(name: "filename", value: fileName.split(separator: "/").last.map(String.init)),
            URLQueryItem(name: "type", value: fileType),
            URLQueryItem(name: "metadata[folder]", value: folder),
            URLQueryItem(name: "metadata[name]", value: fileName.split(separator: "/").last.map(String.init)),
            URLQueryItem(name: "metadata[relativePath]", value: fileName),
            URLQueryItem(name: "metadata[fileName]", value: fileName)
        ]

        guard let url = components.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ Get S3 params failed: \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(S3UploadParams.self, from: data)
    }

    private func uploadToS3Multipart(fileData: Data, s3Params: S3UploadParams) async throws -> String {
        guard let url = URL(string: s3Params.url) else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = s3Params.method

        let boundary = "----WebKitFormBoundary\(UUID().uuidString.replacingOccurrences(of: "-", with: ""))"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add all fields from s3Params
        for (key, value) in s3Params.fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        // Add file data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(s3Params.fields["key"] ?? "file")\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        print("📊 S3 upload status: \(httpResponse.statusCode)")

        // S3 returns 200, 201, or 204 on success
        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 || httpResponse.statusCode == 204 else {
            print("❌ S3 upload failed with status: \(httpResponse.statusCode)")
            throw URLError(.badServerResponse)
        }

        // Construct the file URL from the upload URL and key
        if let key = s3Params.fields["key"] {
            // The S3 URL is typically: https://bucket.s3.region.amazonaws.com/
            // We need to append the key to get the full file URL
            let baseURL = s3Params.url.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let fileURL = "\(baseURL)/\(key)"
            print("📍 Constructed file URL: \(fileURL)")
            return fileURL
        }

        // Fallback: return the base URL
        return s3Params.url
    }

    private func getMimeType(for ext: String) -> String {
        let mimeTypes: [String: String] = [
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "pdf": "application/pdf",
            "txt": "text/plain",
            "csv": "text/csv",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls": "application/vnd.ms-excel"
        ]
        return mimeTypes[ext.lowercased()] ?? "application/octet-stream"
    }

    private func sanitizeFileName(_ fileName: String) -> String {
        // Extract name and extension
        let url = URL(fileURLWithPath: fileName)
        let nameWithoutExtension = url.deletingPathExtension().lastPathComponent
        let ext = url.pathExtension

        // Sanitize the name
        let sanitized = nameWithoutExtension
            .lowercased()
            .replacingOccurrences(of: "[^a-z0-9_-]", with: "", options: .regularExpression)

        // Return with extension
        return ext.isEmpty ? sanitized : "\(sanitized).\(ext)"
    }

    func addFile(fileId: String, url: String, name: String) async throws -> Bool {
        let apiURL = URL(string: "\(baseURL)/files/add-file")!
        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        guard let userId = AuthManager.shared.currentUser?.id else {
            throw URLError(.userAuthenticationRequired)
        }

        let body = [
            "id": fileId,
            "user_id": userId,  // Send as Int, not String
            "url": url,
            "name": name,
            "fingerprint": generateFingerprint()
        ] as [String : Any]

        print("📤 addFile request body: \(body)")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        // Always log response for debugging
        if let responseString = String(data: data, encoding: .utf8) {
            print("📥 addFile response (status \(httpResponse.statusCode)): \(responseString)")
        }

        if httpResponse.statusCode != 200 {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(APIResponse.self, from: data)
        print("✅ addFile result: success=\(result.success)")
        return result.success
    }

    func getBackupFiles(page: Int = 1, limit: Int = 100) async throws -> FilesResponse.FilesData {
        let url = URL(string: "\(baseURL)/files/backup/files")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "page": page,
            "limit": limit,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ getBackupFiles failed (status \(httpResponse.statusCode)): \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(FilesResponse.self, from: data)

        // Check if the API returned success and has data
        guard result.success, let filesData = result.data else {
            let errorMsg = result.error ?? "Unknown error from API"
            print("❌ getBackupFiles API error: \(errorMsg)")
            throw NSError(domain: "APIService", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMsg])
        }

        return filesData
    }

    // MARK: - Scribble Management

    func getScribblePage(scribbleId: String, pageNumber: Int) async throws -> ScribblePage? {
        let url = URL(string: "\(baseURL)/scribbles/page/get")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "scribble_id": scribbleId,
            "page_number": pageNumber,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(ScribblePageResponse.self, from: data)
        return result.success ? result.page : nil
    }

    func upsertScribblePage(scribbleId: String, pageNumber: Int, drawingData: String, thumbnail: String?) async throws -> Bool {
        let url = URL(string: "\(baseURL)/scribbles/page/upsert")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        var body: [String: Any] = [
            "scribble_id": scribbleId,
            "page_number": pageNumber,
            "drawing_data": drawingData,
            "fingerprint": generateFingerprint()
        ]

        if let thumbnail = thumbnail {
            body["thumbnail"] = thumbnail
        }

        print("🔧 upsertScribblePage - URL: \(url.absoluteString)")
        print("   scribble_id: \(scribbleId), page_number: \(pageNumber)")
        print("   loginToken: \(loginToken ?? "nil")")
        print("   fingerprint: \(generateFingerprint())")

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ upsertScribblePage failed (status \(httpResponse.statusCode)): \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(ScribbleResponse.self, from: data)
        return result.success
    }

    func getScribble(scribbleId: String) async throws -> Scribble? {
        let url = URL(string: "\(baseURL)/scribbles/get")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "scribble_id": scribbleId,
            "fingerprint": generateFingerprint()
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(ScribbleGetResponse.self, from: data)
        return result.success ? result.scribble : nil
    }

    // MARK: - Note Management

    func getNote(id: String) async throws -> LocusNote? {
        let url = URL(string: "\(baseURL)/notes/get-by-id")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "id": id,
            "fingerprint": generateFingerprint()
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(NoteResponse.self, from: data)
        return result.success ? result.data.note : nil
    }

    func getNotes(page: Int = 1, limit: Int = 50, after: Int64 = 0) async throws -> NotesResponse.NotesData {
        let url = URL(string: "\(baseURL)/notes/get")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "page": page,
            "limit": limit,
            "after": after,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(NotesResponse.self, from: data)

        // Check if the API returned success and has data
        guard result.success, let notesData = result.data else {
            let errorMsg = result.error ?? "Unknown error from API"
            print("❌ getNotes API error: \(errorMsg)")
            throw NSError(domain: "APIService", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMsg])
        }

        return notesData
    }

    func getBackupNotes(page: Int = 1, limit: Int = 50) async throws -> NotesResponse.NotesData {
        let url = URL(string: "\(baseURL)/notes/backup/notes")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        let body = [
            "page": page,
            "limit": limit,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ getBackupNotes failed (status \(httpResponse.statusCode)): \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        // Debug: Print raw response on decoding errors
        do {
            let result = try JSONDecoder().decode(NotesResponse.self, from: data)

            // Check if the API returned success and has data
            guard result.success, let notesData = result.data else {
                let errorMsg = result.error ?? "Unknown error from API"
                print("❌ getBackupNotes API error: \(errorMsg)")
                throw NSError(domain: "APIService", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMsg])
            }

            return notesData
        } catch {
            print("❌ Failed to decode notes response")
            if let responseString = String(data: data, encoding: .utf8) {
                // Only print first 500 chars to avoid flooding console
                let preview = String(responseString.prefix(500))
                print("📄 Response preview: \(preview)")
            }
            print("❌ Decode error: \(error)")
            throw error
        }
    }

    func updateNote(id: String, html: String) async throws -> Bool {
        let url = URL(string: "\(baseURL)/notes/update/html")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = loginToken {
            request.setValue("btw_uuid=\(token)", forHTTPHeaderField: "Cookie")
        }

        guard let userId = AuthManager.shared.currentUser?.id else {
            throw URLError(.userAuthenticationRequired)
        }

        let body = [
            "id": id,
            "user_id": userId,
            "html": html,
            "fingerprint": generateFingerprint()
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode != 200 {
            if let responseString = String(data: data, encoding: .utf8) {
                print("❌ updateNote failed (status \(httpResponse.statusCode)): \(responseString)")
            }
            throw URLError(.badServerResponse)
        }

        let result = try JSONDecoder().decode(APIResponse.self, from: data)
        return result.success
    }

    /// Generate a private note URL using fingerprint-split encryption
    /// This creates a URL that allows authentication without any API calls
    /// Returns the URL hash that can be used to construct: /private/note/{noteId}/{urlHash}
    func generatePrivateNoteURL(noteId: String) throws -> String {
        guard let loginToken = self.loginToken else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }

        let fingerprint = generateFingerprint()

        // Split fingerprint into F1 (first half) and F2 (second half)
        let splitPoint = fingerprint.count / 2
        let F1 = String(fingerprint.prefix(splitPoint))
        let F2 = String(fingerprint.suffix(fingerprint.count - splitPoint))

        print("🔐 Generating private note URL - F1 length: \(F1.count), F2 length: \(F2.count)")

        // Create timestamp + loginToken payload
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000) // milliseconds
        let payload = "\(timestamp):\(loginToken)"

        print("📦 Payload: \(payload)")

        // Encrypt payload using F1 as the key (AES-256-CBC)
        guard let encrypted = encryptAES256(payload: payload, key: F1) else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Encryption failed"])
        }

        print("🔒 Encrypted payload")

        // Combine encrypted payload with F2: {encrypted}:::{F2}
        let combined = "\(encrypted):::\(F2)"

        // Base64 encode the combined string for URL safety
        guard let combinedData = combined.data(using: .utf8) else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode combined string"])
        }
        let urlHash = combinedData.base64EncodedString()

        print("✅ Generated URL hash for note \(noteId)")

        return urlHash
    }

    /// Encrypt a string using AES-256-CBC with a given key
    private func encryptAES256(payload: String, key: String) -> String? {
        guard let payloadData = payload.data(using: .utf8),
              let keyData = key.data(using: .utf8) else {
            return nil
        }

        // Use CommonCrypto for AES encryption (matches Node.js crypto.createCipher)
        // Note: crypto.createCipher in Node.js is deprecated but we're matching the backend implementation
        // It derives a key and IV from the password using MD5

        var derivedKey = Data(count: 32) // 256 bits
        var derivedIV = Data(count: 16)  // 128 bits

        // Derive key and IV using MD5 (to match Node.js crypto.createCipher behavior)
        var md5Hash = keyData.md5Hash()
        derivedKey.replaceSubrange(0..<16, with: md5Hash)

        // Second round: MD5(hash + password)
        var secondInput = Data()
        secondInput.append(md5Hash)
        secondInput.append(keyData)
        md5Hash = secondInput.md5Hash()
        derivedKey.replaceSubrange(16..<32, with: md5Hash)

        // Third round for IV: MD5(hash + password)
        var thirdInput = Data()
        thirdInput.append(md5Hash)
        thirdInput.append(keyData)
        derivedIV = thirdInput.md5Hash()

        // Perform AES-256-CBC encryption
        let encrypted = performAESEncryption(data: payloadData, key: derivedKey, iv: derivedIV)
        return encrypted?.base64EncodedString()
    }

    private func performAESEncryption(data: Data, key: Data, iv: Data) -> Data? {
        let keyBytes = [UInt8](key)
        let ivBytes = [UInt8](iv)
        let dataBytes = [UInt8](data)

        var encryptedBytes = [UInt8](repeating: 0, count: dataBytes.count + 16) // Add padding space
        var numBytesEncrypted: size_t = 0

        let cryptStatus = CCCrypt(
            CCOperation(kCCEncrypt),
            CCAlgorithm(kCCAlgorithmAES),
            CCOptions(kCCOptionPKCS7Padding),
            keyBytes,
            key.count,
            ivBytes,
            dataBytes,
            data.count,
            &encryptedBytes,
            encryptedBytes.count,
            &numBytesEncrypted
        )

        guard cryptStatus == kCCSuccess else {
            print("❌ Encryption failed with status: \(cryptStatus)")
            return nil
        }

        return Data(bytes: encryptedBytes, count: numBytesEncrypted)
    }
}

struct APIResponse: Codable {
    let success: Bool
    // error can be a string or object, so we'll ignore it for now
    // let error: String?
}

struct OTPValidationResponse: Codable {
    let success: Bool
    let data: OTPData

    struct OTPData: Codable {
        let isValid: Bool
    }
}

struct UserResponse: Codable {
    let success: Bool
    let data: UserData

    struct UserData: Codable {
        let user: User?
        let isLoggedIn: Bool
    }
}

struct User: Codable {
    let id: Int
    let email: String
    let name: String?
    // Add other user fields as needed
}

struct FileResponse: Codable {
    let success: Bool
    let data: FileData

    struct FileData: Codable {
        let file: FileInfo?
    }

    struct FileInfo: Codable {
        let id: String
        let url: String
        let name: String?
    }
}

struct S3UploadParams: Codable {
    let method: String
    let url: String
    let fields: [String: String]
}

struct TemporaryLoginResponse: Codable {
    let success: Bool
    let data: TemporaryLoginData

    struct TemporaryLoginData: Codable {
        let secret: String?
    }
}

// MARK: - Scribble Types

struct ScribblePageResponse: Codable {
    let success: Bool
    let page: ScribblePage?
}

struct ScribblePage: Codable {
    let pageNumber: Int
    let drawingData: String
    let thumbnail: String?
    let modified: String

    enum CodingKeys: String, CodingKey {
        case pageNumber = "page_number"
        case drawingData = "drawing_data"
        case thumbnail
        case modified
    }
}

struct ScribbleResponse: Codable {
    let success: Bool
    let scribble: Scribble?
}

struct ScribbleGetResponse: Codable {
    let success: Bool
    let scribble: Scribble?
}

struct Scribble: Codable {
    let id: String
    let userId: Int
    let pages: [ScribblePage]?
    let settings: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case pages
        case settings
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Data Extension for MD5

extension Data {
    func md5Hash() -> Data {
        var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
        self.withUnsafeBytes { bytes in
            _ = CC_MD5(bytes.baseAddress, CC_LONG(self.count), &digest)
        }
        return Data(digest)
    }
}
