# BTW List App API Specification

This document provides a comprehensive API specification for the BTW List App, designed to support a cross-platform read-only app with offline quick notes capability.

## Base URL
All API endpoints are relative to your base URL (e.g., `https://your-domain.com`)

## Authentication
All authenticated endpoints require a login token cookie (`btw_uuid`) and a `fingerprint` parameter in the request body/query.

---

## Authentication APIs

### 1. Generate OTP
Generate a one-time password for user authentication.

**Endpoint:** `POST /otp/generate`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid email",
  "data": {
    "isValid": false
  }
}
```

**Notes:**
- Email must be in valid format
- OTP will be sent to the provided email address
- In single-user mode with `ADMIN_OTP` set, no email will be sent

---

### 2. Validate OTP
Validate the OTP and create a login session.

**Endpoint:** `POST /otp/validate`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "fingerprint": "unique-device-fingerprint"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true
  }
}
```

**Notes:**
- Creates a new user if one doesn't exist
- Sets a login token cookie (`btw_uuid`) valid for 30 days
- Cookie is set on root domain for subdomain access

**Error Response:**
```json
{
  "success": false,
  "error": "Expired or invalid OTP",
  "data": {
    "isValid": false
  }
}
```

---

## Node & List APIs

### 3. Get List/Nodes
Fetch a hierarchical list of nodes.

**Endpoint:** `POST /list/get`

**Request Body:**
```json
{
  "fingerprint": "unique-device-fingerprint",
  "page": 1,
  "limit": 200,
  "after": 0,
  "id": "home"
}
```

**Parameters:**
- `fingerprint` (required): Device fingerprint for authentication
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, max: 200, default: 200
- `after` (optional): Timestamp for filtering nodes updated after this date
- `id` (optional): Parent node ID, default: "home"

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "uuid",
        "user_id": "user-uuid",
        "text": "Node title",
        "checked": false,
        "collapsed": false,
        "checked_date": null,
        "parent_id": "home",
        "pos": 1,
        "updated_at": "2025-10-08T12:00:00Z",
        "note_id": "note-uuid",
        "file_id": null,
        "pinned_pos": null,
        "note_exists": true,
        "scribble_exists": false
      }
    ],
    "page": 1,
    "total": 42,
    "limit": 200
  },
  "isLoggedIn": true
}
```

**Notes:**
- Returns hierarchical data up to 10 levels deep
- Includes indicators for note and scribble existence
- Requires authentication via cookie and fingerprint

---

### 4. Get Node Details
Fetch detailed information about a specific node including its note content.

**Endpoint:** `GET /list/api/node/:nodeId`

**URL Parameters:**
- `nodeId` (required): The UUID of the node to fetch

**Query Parameters:**
```
?fingerprint=unique-device-fingerprint
```

**Response:**
```json
{
  "success": true,
  "data": {
    "node": {
      "id": "node-uuid",
      "text": "Node title",
      "checked": false,
      "collapsed": false,
      "parent_id": "home",
      "pos": 1,
      "pinned_pos": null,
      "created_at": "2025-10-08T12:00:00Z",
      "updated_at": "2025-10-08T12:00:00Z"
    },
    "note": {
      "id": "note-uuid",
      "title": "Note Title",
      "md": "# Note Title\n\nMarkdown content here",
      "html": "<h1>Note Title</h1><p>HTML content here</p>",
      "created_at": "2025-10-08T12:00:00Z",
      "updated_at": "2025-10-08T12:00:00Z"
    },
    "file": null
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Node not found"
}
```

**Notes:**
- Returns node metadata, associated note (if exists), and file (if exists)
- Note includes both markdown and HTML representations
- File object is null if no file is attached to the node
- Requires authentication

---

### 5. Create Note
Create a new node with an associated note from title and/or markdown.

**Endpoint:** `POST /list/api/note/create`

**Request Body:**
```json
{
  "fingerprint": "unique-device-fingerprint",
  "title": "My New Note",
  "md": "# My New Note\n\nThis is the content of my note.",
  "parentId": "home"
}
```

**Parameters:**
- `fingerprint` (required): Device fingerprint for authentication
- `title` (optional): Title of the note (also used as node text)
- `md` (optional): Markdown content (will be converted to HTML and TipTap JSON)
- `parentId` (optional): Parent node ID, default: "home"

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://your-domain.com/public/note/note-uuid/hash",
    "node_id": "new-node-uuid",
    "note_id": "new-note-uuid"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": "Either title or markdown is required"
}
```

```json
{
  "success": false,
  "error": "Parent node not found"
}
```

**Notes:**
- Either `title` or `md` must be provided
- Markdown is automatically converted to HTML and TipTap JSON format
- Note is automatically tagged with "list,auto"
- New node is positioned after existing children of parent
- Returns a public URL for sharing the note

---

### 6. Search Nodes
Search for nodes by text content.

**Endpoint:** `POST /list/search`

**Request Body:**
```json
{
  "fingerprint": "unique-device-fingerprint",
  "query": "search term",
  "limit": 50,
  "page": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "uuid",
        "text": "Node containing search term",
        "parent_id": "parent-uuid",
        "pos": 1,
        "note_id": "note-uuid"
      }
    ]
  },
  "isLoggedIn": true
}
```

---

### 7. Get Pinned Nodes
Fetch user's pinned nodes.

**Endpoint:** `POST /list/pinned`

**Request Body:**
```json
{
  "fingerprint": "unique-device-fingerprint"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pinnedNodes": [
      {
        "id": "uuid",
        "text": "Pinned node title",
        "pinned_pos": 1,
        "note_id": "note-uuid",
        "parent_id": "home"
      }
    ]
  }
}
```

**Notes:**
- Returns nodes ordered by `pinned_pos`
- Maximum 100 pinned nodes returned
- Excludes nodes with `parent_id` of 'limbo'

---

## Public APIs (No Authentication Required)

### 8. Get Public Note
Retrieve a public note by ID and hash.

**Endpoint:** `POST /list/public/note`

**Request Body:**
```json
{
  "id": "note-uuid",
  "hash": "short-hash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "note": {
      "id": "note-uuid",
      "md": "# Note Title\n\nMarkdown content",
      "html": "<h1>Note Title</h1><p>HTML content</p>",
      "heading": "Node text/title"
    }
  }
}
```

**Notes:**
- Hash is generated using HMAC-SHA256 of note ID
- No authentication required
- Returns markdown, HTML, and associated node heading

---

## Error Codes

All endpoints return a `success` boolean field. When `success: false`, an `error` field provides details:

- **"User not found"** - Invalid or expired authentication
- **"Invalid email"** - Email format validation failed
- **"Expired or invalid OTP"** - OTP validation failed
- **"Node not found"** - Requested node doesn't exist or doesn't belong to user
- **"Parent node not found"** - Specified parent node doesn't exist
- **"Invalid hash"** - Public note/list hash validation failed
- **"Missing required fields"** - Required parameters not provided

---

## Use Case: Cross-Platform Read-Only App with Offline Notes

### Architecture Overview

The API supports building a cross-platform app with these capabilities:

1. **Online Mode:**
   - User authenticates via OTP (`/otp/generate` + `/otp/validate`)
   - Fetch and display user's nodes/notes hierarchically (`/list/get`)
   - View detailed note content (`/list/api/node/:nodeId`)
   - Search through notes (`/list/search`)
   - Access pinned notes for quick access (`/list/pinned`)

2. **Offline Mode:**
   - App maintains local storage for quick notes
   - Notes are stored locally without internet dependency
   - No sync while offline

3. **Publish Offline Notes (When Online):**
   - When user comes online, use `/list/api/note/create`
   - Set `parentId: "home"` to publish under the home node
   - Provide `title` and `md` (markdown) from offline note
   - App receives back `node_id`, `note_id`, and public URL
   - Clear local offline note after successful publish

### Example Flow

1. **Login:**
   ```
   POST /otp/generate { email: "user@example.com" }
   POST /otp/validate { email: "user@example.com", otp: "123456", fingerprint: "xyz" }
   ```

2. **Fetch Nodes:**
   ```
   POST /list/get { fingerprint: "xyz", id: "home" }
   ```

3. **View Note:**
   ```
   GET /list/api/node/node-uuid?fingerprint=xyz
   ```

4. **Publish Offline Note:**
   ```
   POST /list/api/note/create {
     fingerprint: "xyz",
     title: "Quick Thought",
     md: "Had this idea while offline...",
     parentId: "home"
   }
   ```

---

## CORS Configuration

All endpoints support CORS with credentials. Allowed origins are configured via the `CORS_DOMAINS` environment variable (comma-separated list).

---

## Rate Limiting

Rate limiting is not explicitly defined in the current implementation. Consider implementing rate limiting for production use, especially for OTP generation endpoints.

---

## Versioning

Current API version: v1 (implicit)

Future versions may be introduced with `/v2/` prefix if breaking changes are needed.
