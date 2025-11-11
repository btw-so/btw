# Hocuspocus Server Implementation - Complete Documentation

This directory contains comprehensive documentation of the Hocuspocus server implementation in the BTW (tasks) application.

## Documentation Files

### 1. HOCUSPOCUS_SERVER_ANALYSIS.md (531 lines)
**Complete technical analysis of the Hocuspocus implementation**

Contains:
- Server Configuration & Setup
- Database Schema & Storage Strategy
- Document Types (Notes & Scribbles)
- WebSocket Connection Handling
- Authentication & Authorization Mechanisms
- Data Conversion Pipeline
- Persistence Strategy
- Integration with REST API
- Configuration Variables
- Key Files Reference
- Limitations & Future Enhancements
- Technical Implementation Notes

Best for: Deep understanding of the entire system architecture

---

### 2. HOCUSPOCUS_QUICK_REFERENCE.md (263 lines)
**Quick lookup guide for common tasks and patterns**

Contains:
- Key Components Overview
- Document Types & Naming Conventions
- Authentication Flow
- Database Operations (Fetch/Store)
- Data Conversion Pipeline
- Change Handling Logic
- Authorization Logic
- Configuration Variables Table
- Common REST Operations
- Performance Considerations
- Error Handling Guide
- Security Checklist
- Typical Data Flow Diagram

Best for: Quick reference while coding, checklists, and lookups

---

### 3. HOCUSPOCUS_CODE_SNIPPETS.md (647 lines)
**Production-ready code examples**

Contains:
- Full Server Configuration
- Database Extension - Fetch Implementation
- Database Extension - Store Implementation
- User Authentication (Token Generation & Verification)
- Data Conversion (upsertNote with HTML/JSON/Y.Doc)
- Scribble Management (upsertScribble)
- REST API Integration (Example Endpoints)
- Package Dependencies

Best for: Copy-paste reference, implementation patterns, actual working code

---

## Quick Navigation

### By Question Type

**"How does the server start?"**
- HOCUSPOCUS_CODE_SNIPPETS.md - Server Initialization section
- HOCUSPOCUS_QUICK_REFERENCE.md - Key Components

**"How are documents stored?"**
- HOCUSPOCUS_SERVER_ANALYSIS.md - Section 2: Document Storage & Retrieval
- HOCUSPOCUS_QUICK_REFERENCE.md - Database Operations section
- HOCUSPOCUS_CODE_SNIPPETS.md - Fetch and Store Functions

**"How does authentication work?"**
- HOCUSPOCUS_SERVER_ANALYSIS.md - Section 4: Authentication & Authorization
- HOCUSPOCUS_QUICK_REFERENCE.md - Authentication Flow section
- HOCUSPOCUS_CODE_SNIPPETS.md - User Authentication section

**"How do WebSocket connections work?"**
- HOCUSPOCUS_SERVER_ANALYSIS.md - Section 3: WebSocket Connection Handling
- HOCUSPOCUS_QUICK_REFERENCE.md - Key Components & Typical Data Flow

**"How are documents converted?"**
- HOCUSPOCUS_SERVER_ANALYSIS.md - Data Conversion Pipeline
- HOCUSPOCUS_QUICK_REFERENCE.md - Data Conversion Pipeline section
- HOCUSPOCUS_CODE_SNIPPETS.md - Data Conversion section

**"What are the configuration requirements?"**
- HOCUSPOCUS_SERVER_ANALYSIS.md - Section 8: Configuration Variables
- HOCUSPOCUS_QUICK_REFERENCE.md - Configuration Variables Table

**"What's the security model?"**
- HOCUSPOCUS_SERVER_ANALYSIS.md - Section 4: Security Considerations
- HOCUSPOCUS_QUICK_REFERENCE.md - Security Checklist & Authorization Logic

---

## Key Concepts Summary

### Document Naming Convention

**Notes:**
```
note.{user_id}.{note_id}[.{usecase}]
Example: note.42.abc-uuid-123.list
```

**Scribbles:**
```
scribble.{user_id}.{scribble_id}
Example: scribble.42.xyz-uuid-789
```

### Authentication Token Format
```
{loginToken}:::{deviceFingerprint}
```

### Database Tables
- `btw.notes` - Collaborative notes with TipTap editor
- `btw.scribbles` - Collaborative drawings/sketches
- `btw.login_token` - Authentication tokens
- `btw.users` - User accounts

### Main Features
1. Real-time collaborative editing via WebSocket
2. Yjs (Y.js) CRDT for conflict-free synchronization
3. PostgreSQL persistence with smart upsert logic
4. Token + fingerprint authentication
5. Per-document authorization (owner only)
6. 4-second debounced saves
7. Support for HTML, JSON, and binary Y.Doc formats
8. Backward compatibility with legacy HTML format

---

## Technology Stack

- **Framework**: Hocuspocus server
- **Real-time**: WebSocket via Hocuspocus client
- **CRDT**: Yjs (Y.js)
- **Editor**: TipTap with ProseMirror
- **Database**: PostgreSQL
- **ORM**: Node pg (raw SQL with parameterized queries)
- **Authentication**: Token + fingerprint
- **Serialization**: Y.js encodeStateAsUpdate

---

## Server Entry Point

**File**: `/Users/siddharthagunti/Documents/code/btw/tasks/app.js`

**Lines**: 181-426

**Startup**:
```javascript
const yjsServer = Server.configure({
    onAuthenticate: async (data) => { /* validation */ },
    onChange: async (data) => { /* persistence */ },
    port: process.env.YJS_PORT,
    extensions: [new Database({...})]
});
yjsServer.listen();
```

---

## Configuration Checklist

Required environment variables:

- [ ] `YJS_PORT` - WebSocket server port
- [ ] `TASKS_DATABASE_URL` - PostgreSQL connection string
- [ ] `ADMIN_EMAIL` - Default admin user email
- [ ] `ADMIN_SLUG` - Default admin slug
- [ ] `BTW_UUID_KEY` - Cookie key for login token
- [ ] `CORS_DOMAINS` - Comma-separated allowed origins
- [ ] `ENCRYPTION_KEY` - For token encryption
- [ ] `TURN_OFF_SINGLE_USER_MODE` - 0 = single user, 1 = multi-user

Optional:
- `PUBLISHER_SERVER_URL` - For cache invalidation
- `HTTPS_DOMAIN` - 1 for HTTPS, 0 for HTTP
- `NODE_ENV` - production or development
- `DEBUG` - Enable debug mode

---

## Common Tasks

### Enable Multi-User Mode
Set `TURN_OFF_SINGLE_USER_MODE=1`

### Change WebSocket Port
Set `YJS_PORT=1234` (replace with desired port)

### Configure Database
Set `TASKS_DATABASE_URL=postgresql://user:pass@host:5432/dbname`

### Add Custom TipTap Extensions
Edit `logic/tiptapExtensions.js` and add to:
- `const tiptapExtensions = [...]`

### Implement Document Sharing
Modify `onAuthenticate` hook to support shared documents
(Currently planned, not implemented)

---

## Performance Tips

1. **Debounce is 4 seconds** - Prevents database thrashing
2. **Connection pool max is 10** - Tune via db.js if needed
3. **Y.Doc is binary** - Efficient for storage and transfer
4. **HTML fallback** - Supports legacy format conversion

---

## Troubleshooting

### "Not authorized!" Error
Check:
1. Token exists in `btw.login_token` table
2. Fingerprint matches stored fingerprint
3. User still exists in `btw.users` table
4. For notes: User ID in document name matches user ID in database
5. For scribbles: User ID in document name matches authenticated user

### Document Not Loading
Check:
1. Document exists in database (`btw.notes` or `btw.scribbles`)
2. Y.Doc state is not NULL
3. User has permission to access document
4. Database connection is working

### Changes Not Persisting
Check:
1. onChange hook is firing (check logs)
2. Database write succeeds (check for SQL errors)
3. Debounce isn't preventing save (wait 4+ seconds)
4. User has write permission to document

---

## Security Notes

1. **Token Binding**: Each token is bound to a device fingerprint
2. **Expiration**: Tokens expire after 30 days
3. **Document Name**: Encodes user_id for client-side consistency
4. **Double-Check**: Database verifies ownership even if doc name says OK
5. **No Sharing**: Currently, only owner can access (planned improvement)

---

## Future Enhancements

- [ ] Document sharing with collaborators
- [ ] Collaborative cursors and presence
- [ ] Advanced permission models
- [ ] Widget-based selective child access
- [ ] Audit logging
- [ ] Version history
- [ ] Real-time presence awareness

---

## Support Resources

- Hocuspocus Docs: https://docs.hocuspocus.dev/
- Yjs Docs: https://docs.yjs.dev/
- TipTap Docs: https://tiptap.dev/
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

## Document Generation Date

Generated: October 30, 2025

**Analysis Scope**: `/Users/siddharthagunti/Documents/code/btw/tasks`

**Key Files Analyzed**:
- `/app.js` (Lines 181-426)
- `/logic/notes.js`
- `/logic/scribbles.js`
- `/logic/user.js`
- `/routes/notes.js`
- `/routes/scribbles.js`
- `/routes/list.js`
- `/services/db.js`
- `/package.json`

