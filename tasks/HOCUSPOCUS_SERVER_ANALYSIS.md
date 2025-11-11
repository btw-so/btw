# Hocuspocus Server Implementation Analysis

## Overview
The BTW (tasks) application implements a Hocuspocus server for real-time collaborative editing using Yjs (Y.js) framework. The implementation handles both Notes and Scribbles as collaborative documents with persistence to PostgreSQL.

---

## 1. SERVER CONFIGURATION

### Location
- **File**: `/Users/siddharthagunti/Documents/code/btw/tasks/app.js` (lines 181-426)
- **Port**: `process.env.YJS_PORT`

### Server Setup
```javascript
const yjsServer = Server.configure({
    // Configuration object with hooks and extensions
    port: Number(process.env.YJS_PORT),
    extensions: [new Database({...})],
});

yjsServer.listen();
```

### Key Configuration Options
- **Port**: Environment variable `YJS_PORT` (must be configured)
- **Database Extension**: Uses `@hocuspocus/extension-database` for persistence
- **Transformer**: Uses `@hocuspocus/transformer` with TipTap extensions for HTML/JSON conversion

### Dependencies
```json
{
    "@hocuspocus/extension-database": "^1.1.1",
    "@hocuspocus/server": "1.1.1",
    "@hocuspocus/transformer": "1.1.1",
    "yjs": "13.5.48"
}
```

---

## 2. DOCUMENT STORAGE AND RETRIEVAL

### Database Schema
- **Database**: PostgreSQL (via `@hocuspocus/extension-database`)
- **Connection**: `process.env.TASKS_DATABASE_URL`
- **Connection Pool**: Max 10 connections
- **Tables**:
  - `btw.notes` - For collaborative notes with TipTap editor
  - `btw.scribbles` - For collaborative drawings/sketches

### Document Types Supported

#### A. Notes
- **Document Naming Convention**: `note.{user_id}.{note_id}.{usecase?}`
- **Storage Table**: `btw.notes`
- **Key Columns**:
  - `id` - Note ID
  - `user_id` - Owner user ID
  - `ydoc` - Yjs document state (binary/bytea)
  - `json` - TipTap JSON format
  - `html` - Rendered HTML
  - `title` - Note title
  - `created_at`, `updated_at` - Timestamps
  - `publish`, `published_at` - Publication status
  - `archive`, `delete` - Status flags
  - `slug` - Public URL slug
  - `tags` - Categorization (e.g., 'list', 'auto')

#### B. Scribbles
- **Document Naming Convention**: `scribble.{user_id}.{scribble_id}`
- **Storage Table**: `btw.scribbles`
- **Key Columns**:
  - `id` - Scribble ID
  - `user_id` - Owner user ID
  - `ydoc` - Yjs document state (binary/bytea)
  - `data` - Legacy Excalidraw data (optional)
  - `pages` - Page-based format with drawing_data and thumbnails
  - `settings` - Drawing settings (background, tools, etc.)
  - `created_at`, `updated_at` - Timestamps

### Database Extension Implementation

#### Fetch Function (Document Retrieval)
```javascript
fetch: async ({ documentName }) => {
    const isScribble = documentName.startsWith("scribble.");
    
    if (isScribble) {
        // Extract user_id and scribble id from document name
        // Query: SELECT ydoc FROM btw.scribbles WHERE id = $1 AND user_id = $2
    } else {
        // Extract user_id, note_id, usecase from document name
        // Query: SELECT ydoc FROM btw.notes WHERE id = $1 AND user_id = $2
        // Fallback: Convert HTML to Y.Doc if ydoc not present
    }
    
    return yDocBinary || null;
}
```

**Key Points**:
- Returns Yjs document state as binary data
- Handles legacy HTML format by converting to Y.Doc on-the-fly
- Supports gradual migration from HTML to Y.Doc format

#### Store Function (Document Persistence)
```javascript
store: async ({ documentName, state }) => {
    const isScribble = documentName.startsWith("scribble.");
    
    if (isScribble) {
        // INSERT INTO btw.scribbles with ON CONFLICT DO UPDATE
        // Updates ydoc field and updated_at timestamp
    } else {
        // INSERT INTO btw.notes with ON CONFLICT DO UPDATE
        // Updates ydoc field and updated_at timestamp
    }
}
```

**Key Points**:
- Uses PostgreSQL `ON CONFLICT DO UPDATE` for upsert operation
- Intelligently updates `updated_at` only if content actually changed
- Supports atomic operations with transactions

### Data Conversion Pipeline

#### HTML to Y.Doc
```javascript
const json = MyTipTapTransformerJSON(html);
const ydoc = MyTipTapTransformer.toYdoc(json, "default");
```

#### Y.Doc to HTML
```javascript
const prosemirrorJSON = MyTipTapTransformer.fromYdoc(data.document, "default");
const html = MyTipTapTransformerHTML(prosemirrorJSON);
```

#### Y.Doc Serialization
```javascript
const update = Y.encodeStateAsUpdate(ydoc);
const buffer = Buffer.from(update);
// Store buffer in database
```

---

## 3. WEBSOCKET/CONNECTION HANDLING

### Connection Protocol
- **Framework**: WebSocket via Hocuspocus server
- **Client Connection**: Through Hocuspocus client library
- **Connection String**: `ws://localhost:{YJS_PORT}`

### Authentication During Connection

#### onAuthenticate Hook
```javascript
async onAuthenticate(data) {
    const { token: tokenfingerprint, documentName } = data;
    
    // Extract token and fingerprint from combined string
    const token = tokenfingerprint.split(":::")[0];
    const fingerprint = tokenfingerprint.split(":::")[1];
    
    // Verify user
    const user = await getUserFromToken({ token, fingerprint });
    
    // Document type authorization
    if (documentName.startsWith("note.")) {
        // Verify user owns the note
        // Extract user_id from documentName
        // Check if user.id matches document owner
    } else if (documentName.startsWith("scribble.")) {
        // Verify user owns the scribble
        // Simple user_id check from document name
    }
    
    // Return context for use in other hooks
    return {
        user,
        documentType: isScribble ? "scribble" : "note"
    };
}
```

**Authentication Requirements**:
- Token + Fingerprint pair (from `loginToken:::fingerprint`)
- Document name format validation
- User ownership verification
- Per-document authorization (no sharing yet)

#### Token Format
- **Standard Format**: `{loginToken}:::{fingerprint}`
- **Storage**: `btw.login_token` table
- **Validation**: Token exists, fingerprint matches, user exists

### Document Change Handling

#### onChange Hook
```javascript
async onChange(data) {
    const user_id = data.context.user.id;
    
    if (data.context.documentType === "scribble") {
        // For scribbles: Database extension handles storage
        // No additional transform needed
        return;
    } else {
        // For notes: Convert Y.Doc to JSON and HTML
        const json = MyTipTapTransformer.fromYdoc(data.document, "default");
        const html = MyTipTapTransformerHTML(json);
        
        // Upsert into database
        upsertNote({
            id,
            user_id,
            json,
            html
        });
    }
}
```

**Debouncing Strategy**:
- Implements 4-second debounce per document
- Prevents excessive database writes
- Maintains separate debounce timers per document

---

## 4. AUTHENTICATION & AUTHORIZATION

### User Authentication Flow

#### 1. Token Generation
- **Endpoint**: REST API (via `logic/user.js`)
- **Process**:
  ```javascript
  async createLoginToken({ email, fingerprint, ip_address }) {
      // Verify user exists by email
      // Create random UUID token
      // Insert into btw.login_token table
      // Return token
  }
  ```

#### 2. Token Verification
- **Function**: `getUserFromToken({ token, fingerprint })`
- **Validation**:
  - Token exists in `btw.login_token`
  - Fingerprint matches stored fingerprint
  - User (via user_id) exists
  - Returns user object on success

#### 3. Single User Mode
- **Configuration**: `process.env.TURN_OFF_SINGLE_USER_MODE`
- **Behavior**:
  - When disabled: Returns default admin user
  - When enabled: Requires valid token + fingerprint

#### Token Storage Schema
```sql
CREATE TABLE btw.login_token (
    uuid TEXT PRIMARY KEY,          -- Token
    user_id INTEGER,                -- User reference
    ip_address TEXT,                -- Client IP
    fingerprint TEXT,               -- Device fingerprint
    created_at TIMESTAMP            -- Creation time
);
```

**Token Lifecycle**:
- Validity: 30 days (old tokens auto-deleted)
- Associated with single device (via fingerprint)
- Prevents token reuse on different devices

### Document Authorization

#### Per-Document Authorization
```javascript
// For Notes
const userAccordingToUI = documentName.split("note.")[1].split(".")[0];
const noteFromDB = await getNote({ id: ..., user_id: user.id });

// Check 1: User ID in URL matches authenticated user
if ("" + user.id !== userAccordingToUI) {
    throw new Error("Not authorized!");
}

// Check 2: User owns the note in database
if (noteFromDB && user.id !== noteFromDB.user_id) {
    throw new Error("Not authorized!");
}
```

```javascript
// For Scribbles
const userAccordingToUI = documentName.split("scribble.")[1].split(".")[0];

// Simple check: User ID in URL matches authenticated user
if ("" + user.id !== userAccordingToUI) {
    throw new Error("Not authorized!");
}
```

#### Authorization Features
- **Current**: Single owner (no sharing)
- **Planned**: Support for shared documents ("We might have shareable docs later on")
- **No Collaboration**: Only owner can access

### Security Considerations

#### 1. Token Security
- Fingerprint binding prevents token theft
- IP address logging for audit trails
- 30-day automatic expiration
- Deletion on logout

#### 2. Document Access Control
- Document name encodes user_id (user-facing consistency)
- Database double-checks user ownership
- Per-connection authentication

#### 3. Data Exposure
- HTML content sanitization in REST endpoints
- Published notes have separate public access control (via slug + hash)
- Private notes accessible only to owner

### Widget Authentication (Optional)
- **Purpose**: Embed widget tokens for conditional access
- **Function**: `generateWidgetToken({ nodeId, userId, fingerprint })`
- **Use Case**: Public node embedding with selective child access
- **Storage**: Generated on-demand, verified on each request

---

## 5. DATA FLOW DIAGRAM

```
Client Request
    ↓
[WebSocket Connection]
    ↓
[onAuthenticate Hook]
    ├─ Extract token:::fingerprint
    ├─ Verify getUserFromToken()
    ├─ Validate document ownership
    └─ Return context { user, documentType }
    ↓
[Document Fetch/Update]
    ├─ Database.fetch(documentName)
    │   └─ Query btw.notes OR btw.scribbles
    │   └─ Return Y.Doc state (binary)
    │
    ├─ Document Edit (Real-time)
    │   └─ onChange Hook triggers
    │   └─ For Notes: Convert Y.Doc → JSON → HTML
    │   └─ For Scribbles: Pass-through (DB handles)
    │
    └─ Database.store(documentName, state)
        └─ INSERT/UPDATE with ydoc state
        └─ Upsert note JSON/HTML (notes only)
```

---

## 6. PERSISTENCE STRATEGY

### Immediate Storage
- **Trigger**: onChange hook fires
- **Debounce**: 4 seconds (per document)
- **Operation**: Upsert into database

### Incremental Updates
- **Format**: Binary Y.Doc updates
- **Storage**: Database bytea column
- **Advantage**: Efficient delta storage

### Legacy Format Support
- **HTML Format**: Stored for backward compatibility
- **JSON Format**: ProseMirror/TipTap JSON representation
- **Conversion**: On-demand HTML↔Y.Doc conversion

### Automatic Timestamp Management
```sql
updated_at = CASE WHEN
    notes.ydoc <> EXCLUDED.ydoc OR
    notes.html <> EXCLUDED.html OR
    notes.title <> EXCLUDED.title
    THEN EXCLUDED.updated_at
    ELSE notes.updated_at
END
```

**Benefit**: Only updates timestamp when content actually changes

---

## 7. INTEGRATION WITH REST API

### REST Endpoints for Document Management
- **Get Notes**: `/notes/get` - Fetch user's notes with pagination
- **Get Single Note**: `/notes/get-by-id` - Retrieve specific note
- **Update Note HTML**: `/notes/update/html` - Direct HTML update
- **Publish/Unpublish**: `/notes/update/publish` - Control publication
- **Archive/Unarchive**: `/notes/update/archive` - Archive management
- **Delete/Undelete**: `/notes/update/delete` - Soft delete management
- **Get Scribbles**: `/scribbles/get` - Fetch user's scribbles

### Parallel Persistence Paths
1. **WebSocket (Real-time)**: onChange debounced upsert
2. **REST API**: Direct updates to notes/scribbles
3. **Background Jobs**: Cache refresh, markdown conversion

### Cache Invalidation
- **Trigger**: Note/scribble update
- **Mechanism**: POST to `PUBLISHER_SERVER_URL/internal/cache/refresh/notes`
- **Purpose**: Keep public publishing system in sync

---

## 8. CONFIGURATION ENVIRONMENT VARIABLES

### Required Variables
```bash
# Hocuspocus Server
YJS_PORT=1234

# Database
TASKS_DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
ADMIN_EMAIL=admin@example.com
ADMIN_SLUG=admin
BTW_UUID_KEY=btw_uuid

# Mode Configuration
TURN_OFF_SINGLE_USER_MODE=0  # 1 = multi-user mode
ADMIN_OTP=                   # OTP for admin in single-user mode

# Publishing
PUBLISHER_SERVER_URL=http://publisher:3000
HTTPS_DOMAIN=1               # 1 = use https, 0 = use http
ENCRYPTION_KEY=your-secret-key

# CORS
CORS_DOMAINS=http://localhost:3000,https://app.example.com

# Other Services
DOMAIN=example.com
LIST_DOMAIN=https://lists.example.com
DEBUG=0
NODE_ENV=production|development
```

---

## 9. KEY FILES

| File | Purpose |
|------|---------|
| `/app.js` | Main server config, Hocuspocus setup |
| `/logic/notes.js` | Note CRUD operations |
| `/logic/scribbles.js` | Scribble CRUD operations |
| `/logic/user.js` | Authentication, user management |
| `/routes/notes.js` | REST endpoints for notes |
| `/routes/scribbles.js` | REST endpoints for scribbles |
| `/routes/list.js` | REST endpoints for list/nodes |
| `/services/db.js` | PostgreSQL connection pool |

---

## 10. LIMITATIONS & FUTURE ENHANCEMENTS

### Current Limitations
1. **No Document Sharing**: Only single owner access
2. **No Collaborative Cursors**: No presence/awareness features
3. **No Conflict Resolution UI**: Relies on Yjs built-in CRDT
4. **No Permissions System**: Owner has full control or nothing

### Planned Features
- Document sharing with collaborators
- Selective child node access (widget tokens)
- Advanced permission models
- Collaborative cursors and presence

---

## 11. TECHNICAL IMPLEMENTATION NOTES

### Yjs Document Encoding
```javascript
// Serialize Y.Doc to binary
const update = Y.encodeStateAsUpdate(ydoc);
const buffer = Buffer.from(update);
// Result: Bytea in PostgreSQL

// Deserialize (implicit in Hocuspocus)
// Server reconstructs Y.Doc from bytea data
```

### TipTap/ProseMirror Integration
```javascript
// TipTap Extensions configured
const tiptapExtensions = [
    Document, Paragraph, Text, Bold, Italic,
    Heading, Link, Image, CodeBlock, TaskList,
    // ... many more
];

// Transformer for conversions
const MyTipTapTransformer = TiptapTransformer.extensions(tiptapExtensions);

// HTML Generation
const html = generateHTML(json, tiptapExtensions);
```

### Debouncing Strategy
```javascript
// Global debounce object per document
let debounced = {};

// In onChange
debounced[documentName] && debounced[documentName].clear();
debounced[documentName] = debounce(() => save(), 4000);
debounced[documentName]();
```

