# Hocuspocus Implementation - Quick Reference

## Key Components

### 1. Server Initialization (app.js, lines 181-426)
```javascript
const yjsServer = Server.configure({
    async onAuthenticate(data),      // Token validation
    async onChange(data),             // Document change handling
    port: process.env.YJS_PORT,
    extensions: [new Database({...})]
});
yjsServer.listen();
```

---

## Document Types & Naming

### Notes
- **Format**: `note.{user_id}.{note_id}[.{usecase}]`
- **Example**: `note.42.abc-123.list`
- **Storage**: `btw.notes` table
- **Key Fields**: `ydoc` (binary), `html`, `json`, `title`, `created_at`, `updated_at`

### Scribbles  
- **Format**: `scribble.{user_id}.{scribble_id}`
- **Example**: `scribble.42.xyz-789`
- **Storage**: `btw.scribbles` table
- **Key Fields**: `ydoc` (binary), `pages`, `settings`, `data` (legacy)

---

## Authentication Flow

### Token Format
```
{loginToken}:::{deviceFingerprint}
```

### Validation Steps
1. Split token and fingerprint
2. Query `btw.login_token` table
3. Verify fingerprint matches
4. Load user from `btw.users`
5. Check document ownership

---

## Database Operations

### Fetch (Load Document)
```javascript
// For Notes
SELECT ydoc FROM btw.notes WHERE id = $1 AND user_id = $2

// For Scribbles
SELECT ydoc FROM btw.scribbles WHERE id = $1 AND user_id = $2
```

### Store (Save Document)
```javascript
// Upsert with smart timestamp update
INSERT INTO btw.notes (id, user_id, ydoc, ...) 
VALUES (...) 
ON CONFLICT(id, user_id) DO UPDATE 
SET ydoc = EXCLUDED.ydoc, 
    updated_at = CASE WHEN 
        notes.ydoc <> EXCLUDED.ydoc 
    THEN EXCLUDED.updated_at 
    ELSE notes.updated_at 
END
```

---

## Data Conversion Pipeline

### HTML → Y.Doc
```javascript
const json = generateJSON(html, tiptapExtensions);
const ydoc = TiptapTransformer.extensions(tiptapExtensions)
    .toYdoc(json, "default");
```

### Y.Doc → HTML
```javascript
const json = MyTipTapTransformer.fromYdoc(document, "default");
const html = generateHTML(json, tiptapExtensions);
```

### Y.Doc Serialization
```javascript
const update = Y.encodeStateAsUpdate(ydoc);
const buffer = Buffer.from(update);  // Store as bytea
```

---

## Change Handling (onChange Hook)

### For Notes
1. Convert Y.Doc to JSON
2. Generate HTML from JSON
3. Extract title from JSON
4. Upsert with 4-second debounce

### For Scribbles
- Database extension handles storage automatically
- No additional transformation needed

---

## Authorization Logic

### Per-Document Check
```javascript
// Step 1: Extract user from documentName
const userFromDoc = documentName.split(delimiter)[1].split(".")[0];

// Step 2: Verify matches authenticated user
if ("" + authenticatedUser.id !== userFromDoc) {
    throw new Error("Not authorized!");
}

// Step 3: For notes, verify database ownership
const noteFromDB = await getNote({ id, user_id: authenticatedUser.id });
if (noteFromDB && noteFromDB.user_id !== authenticatedUser.id) {
    throw new Error("Not authorized!");
}
```

---

## Configuration Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `YJS_PORT` | Hocuspocus WebSocket port | Required |
| `TASKS_DATABASE_URL` | PostgreSQL connection | Required |
| `TURN_OFF_SINGLE_USER_MODE` | Multi-user mode | 0 (single user) |
| `ADMIN_EMAIL` | Default admin user | Required |
| `CORS_DOMAINS` | Allowed origins | Required |
| `ENCRYPTION_KEY` | Token encryption | Required |

---

## Common Operations

### Client Connection
```javascript
// WebSocket URL
ws://localhost:${YJS_PORT}

// Auth token format
const token = `${loginToken}:::${fingerprint}`;
```

### Create Note via REST
```
POST /notes/get-by-id
Body: { fingerprint, id }
Returns: { success, data: { note } }
```

### Publish Note
```
POST /notes/update/publish
Body: { fingerprint, id, user_id, publish: true }
```

### Get User's Notes
```
POST /notes/get
Body: { fingerprint, page, limit, after }
Returns: { notes[], page, total, limit }
```

---

## Performance Considerations

### Debouncing
- **Trigger**: Document change event
- **Delay**: 4 seconds per document
- **Benefit**: Reduces database writes significantly

### Connection Pool
- **Max connections**: 10
- **Driver**: Node PostgreSQL (pg)
- **SSL**: Enabled in production

### Token Cleanup
- **Auto-delete**: Tokens older than 30 days
- **Trigger**: Hourly background job
- **Table**: `btw.login_token`

---

## Error Handling

### Authentication Failures
- Missing token → "Not authorized!"
- Fingerprint mismatch → "Not authorized!" (token deleted)
- User doesn't exist → "Not authorized!" (token deleted)
- Invalid document type → "Unknown document type!"

### Authorization Failures
- User doesn't own note → "Not authorized!"
- User doesn't own scribble → "Not authorized!"

---

## Security Checklist

- [x] Token + fingerprint validation on each connection
- [x] Per-connection authentication in onAuthenticate hook
- [x] Double-check database ownership for notes
- [x] 30-day token expiration with auto-cleanup
- [x] Fingerprint binding prevents token reuse
- [x] Document name encoding prevents URL tampering
- [ ] Collaborative editing (not implemented yet)
- [ ] Shared document permissions (planned)
- [ ] Collaborative cursors (planned)

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `app.js` | 181-426 | Hocuspocus server config |
| `logic/notes.js` | 198-271 | upsertNote function |
| `logic/scribbles.js` | 35-128 | upsertScribble function |
| `logic/user.js` | 394-454 | getUserFromToken function |
| `services/db.js` | 1-39 | PostgreSQL pool setup |

---

## Typical Data Flow

```
1. Client connects via WebSocket
   ↓
2. Sends auth: { token:::fingerprint, documentName }
   ↓
3. onAuthenticate validates and returns context
   ↓
4. Database.fetch() loads Y.Doc from PostgreSQL
   ↓
5. Client syncs with server's Y.Doc state
   ↓
6. User edits document
   ↓
7. onChange fires (debounced 4s)
   ↓
8. Database.store() persists to PostgreSQL
   ↓
9. (For notes only) Upsert JSON/HTML via upsertNote()
   ↓
10. Repeat from step 6
```

