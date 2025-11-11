# Hocuspocus Implementation - Code Snippets

## Server Initialization

### Full Server Configuration (app.js lines 181-426)

```javascript
const yjsServer = Server.configure({
    async onAuthenticate(data) {
        const { token: tokenfingerprint, documentName } = data;

        const token = tokenfingerprint.split(":::")[0];
        const fingerprint = tokenfingerprint.split(":::")[1];

        const user = await getUserFromToken({ token, fingerprint });

        if (!user) {
            throw new Error("Not authorized!");
        }

        // Check if it's a note or scribble document
        const isScribble = documentName.startsWith("scribble.");
        const isNote = documentName.startsWith("note.");

        if (isNote) {
            const userAccordingToUI = documentName.split("note.")[1].split(".")[0];
            var userFromDB;

            try {
                const note = await getNote({
                    id: documentName.split("note.")[1].split(".")[1],
                    user_id: user.id,
                });
                if (note) {
                    userFromDB = note.user_id;
                }
            } catch (e) {
                // can be a new note. for now supporting new notes direct authentication
                console.log(e);
            }

            // We might have shareable docs later on. For now we only allow the owner
            if (
                (userFromDB && user.id !== userFromDB) ||
                "" + user.id !== userAccordingToUI
            ) {
                throw new Error("Not authorized!");
            }
        } else if (isScribble) {
            const userAccordingToUI = documentName.split("scribble.")[1].split(".")[0];
            
            // For scribbles, just verify the user ID matches
            if ("" + user.id !== userAccordingToUI) {
                throw new Error("Not authorized!");
            }
        } else {
            throw new Error("Unknown document type!");
        }

        // You can set contextual data to use it in other hooks
        return {
            user,
            documentType: isScribble ? "scribble" : "note",
        };
    },

    async onChange(data) {
        const save = () => {
            const user_id = data.context.user.id;
            
            if (data.context.documentType === "scribble") {
                // For scribbles, we don't need to transform the data
                // Just let the Database extension handle the storage
                // The data will be stored as ydoc in the database
                return;
            } else {
                // For notes, use the existing logic
                // Convert the y-doc to something you can actually use in your views.
                // In this example we use the TiptapTransformer to get JSON from the given
                // ydoc.
                const prosemirrorJSON = MyTipTapTransformer.fromYdoc(
                    data.document,
                    "default"
                );

                var html = MyTipTapTransformerHTML(prosemirrorJSON);

                const id = data.documentName.split("note.")[1].split(".")[1];

                upsertNote({
                    id,
                    user_id,
                    json: prosemirrorJSON,
                    html,
                });
            }
        };

        debounced[data.documentName] && debounced[data.documentName].clear();
        debounced[data.documentName] = debounce(() => save(), 4000);
        debounced[data.documentName]();
    },

    port: Number(process.env.YJS_PORT),
    extensions: [
        new Database({
            // Return a Promise to retrieve data …
            fetch: async ({ documentName }) => {
                // Implementation below...
            },
            // … and a Promise to store data:
            store: async ({ documentName, state }) => {
                // Implementation below...
            },
        }),
    ],
});

yjsServer.listen();
```

---

## Database Extension - Fetch Function

### Load Document State

```javascript
fetch: async ({ documentName }) => {
    const isScribble = documentName.startsWith("scribble.");
    
    if (isScribble) {
        const id = documentName.split("scribble.")[1].split(".")[1];
        const user_id = documentName.split("scribble.")[1].split(".")[0];
        
        return new Promise((resolve, reject) => {
            resolve(
                db.getTasksDB().then((db) => {
                    return db
                        .query(
                            `SELECT ydoc from btw.scribbles where id = $1 and user_id = $2`,
                            [id, Number(user_id)]
                        )
                        .then(({ rows }) => {
                            if (rows.length > 0 && rows[0].ydoc) {
                                return rows[0].ydoc;
                            } else {
                                return null;
                            }
                        });
                })
            );
        });
    } else {
        // Existing note logic
        const id = documentName.split("note.")[1].split(".")[1];
        const user_id = documentName.split("note.")[1].split(".")[0];
        let usecase =
            documentName.split("note.")[1].split(".").length > 2
                ? documentName.split("note.")[1].split(".")[2]
                : null;

        return new Promise((resolve, reject) => {
            resolve(
                db.getTasksDB().then((db) => {
                    return db
                        .query(
                            `SELECT ydoc from btw.notes where id = $1 and user_id = $2`,
                            [id, Number(user_id)]
                        )
                        .then(({ rows }) => {
                            if (rows.length > 0) {
                                if (rows[0].ydoc) {
                                    return rows[0].ydoc;
                                } else if (rows[0] && rows[0].html) {
                                    // Fallback: Convert HTML to Y.Doc
                                    const json = MyTipTapTransformerJSON(rows[0].html);
                                    return MyTipTapTransformer.toYdoc(
                                        json,
                                        "default"
                                    );
                                }
                            } else {
                                return null;
                            }
                        });
                })
            );
        });
    }
}
```

---

## Database Extension - Store Function

### Persist Document State

```javascript
store: async ({ documentName, state }) => {
    const isScribble = documentName.startsWith("scribble.");
    
    if (isScribble) {
        const id = documentName.split("scribble.")[1].split(".")[1];
        const user_id = documentName.split("scribble.")[1].split(".")[0];
        
        return new Promise((resolve, reject) => {
            resolve(
                db.getTasksDB().then((db) => {
                    return db.query(
                        `INSERT INTO btw.scribbles (id, user_id, ydoc, created_at, updated_at) 
                         VALUES($1, $2, $3, $4, $5) 
                         ON CONFLICT(id, user_id) DO UPDATE SET 
                            ydoc = $3, 
                            updated_at = CASE WHEN
                                scribbles.ydoc <> EXCLUDED.ydoc
                                OR FALSE THEN
                                EXCLUDED.updated_at
                                ELSE
                                scribbles.updated_at
                            END 
                         RETURNING ydoc`,
                        [
                            id,
                            Number(user_id),
                            state,
                            new Date(),
                            new Date(),
                        ]
                    );
                })
            );
        });
    } else {
        // Existing note logic
        const id = documentName.split("note.")[1].split(".")[1];
        const user_id = documentName.split("note.")[1].split(".")[0];
        let usecase =
            documentName.split("note.")[1].split(".").length > 2
                ? documentName.split("note.")[1].split(".")[2]
                : null;

        return new Promise((resolve, reject) => {
            resolve(
                db.getTasksDB().then((db) => {
                    return db.query(
                        `INSERT INTO btw.notes (id, user_id, ydoc, created_at, updated_at, tags) 
                         VALUES($1, $2, $3, $4, $5, $6) 
                         ON CONFLICT(id, user_id) DO UPDATE SET 
                            ydoc = $3, 
                            updated_at = CASE WHEN
                                notes.ydoc <> EXCLUDED.ydoc
                                OR FALSE THEN
                                EXCLUDED.updated_at
                                ELSE
                                notes.updated_at
                            END 
                         RETURNING ydoc`,
                        [
                            id,
                            Number(user_id),
                            state,
                            new Date(),
                            new Date(),
                            usecase || "",
                        ]
                    );
                })
            );
        });
    }
}
```

---

## User Authentication

### Token Generation

```javascript
async function createLoginToken({ email, fingerprint, ip_address }) {
    const tasksDB = await db.getTasksDB();
    const client = await tasksDB.connect();

    // get the user
    const { rows: users } = await client.query(
        `SELECT * FROM btw.users WHERE processed_email = $1`,
        [email.toLowerCase().split(".").join("")]
    );

    if (users.length > 0) {
        const user = users[0];

        // create a random uuid token
        const token = uuidv4();

        // insert the token in DB
        await client.query(
            `INSERT INTO btw.login_token (uuid, user_id, ip_address, fingerprint, created_at) 
             VALUES ($1, $2, $3, $4, $5)`,
            [token, user.id, ip_address, fingerprint, new Date()]
        );

        client.release();
        return token;
    } else {
        client.release();
        throw new Error("User does not exist");
    }
}
```

### Token Verification

```javascript
async function getUserFromToken({ token, fingerprint }) {
    const tasksDB = await db.getTasksDB();

    if (
        !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
        !process.env.ADMIN_OTP
    ) {
        // Single user mode and admin otp is not set. so we return admin user always
        const { rows } = await tasksDB.query(
            `SELECT * FROM btw.users WHERE email = $1`,
            [process.env.ADMIN_EMAIL.split(",")[0]]
        );

        if (rows.length > 0) {
            return rows[0];
        }

        return null;
    }

    if (!token) return null;
    if (!fingerprint) return null;

    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.login_token WHERE uuid = $1`,
        [token]
    );

    if (rows.length > 0) {
        const loginTokens = rows[0];

        if (fingerprint && fingerprint == loginTokens.fingerprint) {
            // get the user of this login token
            const { rows: users } = await tasksDB.query(
                `SELECT * FROM btw.users WHERE id = $1`,
                [loginTokens.user_id]
            );

            if (users.length > 0) {
                return users[0];
            } else {
                // delete the token from DB
                await tasksDB.query(
                    `DELETE FROM btw.login_token WHERE uuid = $1`,
                    [token]
                );

                return null;
            }
        } else {
            // delete the token from DB
            await tasksDB.query(`DELETE FROM btw.login_token WHERE uuid = $1`, [
                token,
            ]);

            return null;
        }
    } else {
        return null;
    }
}
```

---

## Data Conversion

### Upsert Note with HTML and JSON

```javascript
async function upsertNote({ id, user_id, json, html, title: defaultTitle, ydoc, tags }) {
    const created_at = new Date();
    const updated_at = new Date();

    const hasHTML = typeof html === "string";

    let title = defaultTitle ? defaultTitle : "";
    if (json && !title) {
        try {
            title = json.content[0].content[0].text;
        } catch (e) {
            // console.log(e);
        }
    }

    const pool = await db.getTasksDB();
    let query = `INSERT INTO btw.notes (id, user_id, created_at, updated_at ${
        title ? `,title` : ""
    } ${json ? `,json` : ""} ${
        hasHTML ? `,html` : ""
    } ) VALUES ($1, $2, $3, $4`;

    var nums = (title ? 1 : 0) + (hasHTML ? 1 : 0) + (json ? 1 : 0);
    for (var i = 0; i < nums; i++) {
        query += `,$${i + 5}`;
    }
    var titlenum = title ? 5 : 0;
    var jsonnum = json ? 5 + (title ? 1 : 0) : 0;
    var htmlnum = hasHTML ? 5 + (title && json ? 2 : title || json ? 1 : 0) : 0;

    query += `) ON CONFLICT (id, user_id) DO UPDATE SET ${
        json ? `json = $${jsonnum},` : ""
    } ${hasHTML ? `html = $${htmlnum},` : ""} ${
        title ? `title = $${titlenum},` : ""
    } updated_at = CASE WHEN notes."json"::jsonb @> EXCLUDED.json::jsonb
    OR notes.html <> EXCLUDED.html
    OR notes.title <> EXCLUDED.title
    OR FALSE THEN
    EXCLUDED.updated_at
    ELSE
    notes.updated_at
END`;

    await pool.query(query, [
        id,
        user_id,
        created_at,
        updated_at,
        ...(title ? [title] : []),
        ...(json ? [json] : []),
        ...(hasHTML ? [html.replaceAll("\u0000", "")] : []),
    ]);

    if (ydoc) {
        // If ydoc is a Y.Doc, serialize it
        let ydocBuffer;
        if (typeof ydoc.encodeStateAsUpdate === 'function' || 
            (ydoc.constructor && ydoc.constructor.name === 'Doc')) {
            // ydoc is a Y.Doc instance
            const update = Y.encodeStateAsUpdate(ydoc);
            ydocBuffer = Buffer.from(update);
        } else if (Buffer.isBuffer(ydoc)) {
            ydocBuffer = ydoc;
        } else if (ydoc instanceof Uint8Array) {
            ydocBuffer = Buffer.from(ydoc);
        } else {
            throw new Error("Invalid ydoc type");
        }
        await pool.query(
            `UPDATE btw.notes SET ydoc = $1 WHERE id = $2 AND user_id = $3`, 
            [ydocBuffer, id, user_id]
        );
    }

    if (tags) {
        await pool.query(
            `UPDATE btw.notes SET tags = $1 WHERE id = $2 AND user_id = $3`, 
            [tags, id, user_id]
        );
    }
}
```

---

## Scribble Management

### Upsert Scribble

```javascript
async function upsertScribble(user, scribble_id, data = null, ydoc = null, pages = null, settings = null) {
    const created_at = new Date();
    const updated_at = new Date();
    const pool = await db.getTasksDB();

    // Check if scribble exists
    const existing = await getScribble(user, scribble_id);

    if (existing) {
        // Update existing scribble
        let updateFields = ['updated_at = $1'];
        let updateValues = [updated_at];
        let paramIndex = 2;

        // Legacy format support
        if (data !== null) {
            updateFields.push(`data = $${paramIndex}`);
            updateValues.push(data);
            paramIndex++;
        }

        if (ydoc !== null) {
            // If ydoc is a Y.Doc, serialize it
            let ydocBuffer;
            if (typeof ydoc.encodeStateAsUpdate === 'function' || 
                (ydoc.constructor && ydoc.constructor.name === 'Doc')) {
                const update = Y.encodeStateAsUpdate(ydoc);
                ydocBuffer = Buffer.from(update);
            } else if (Buffer.isBuffer(ydoc)) {
                ydocBuffer = ydoc;
            } else if (ydoc instanceof Uint8Array) {
                ydocBuffer = Buffer.from(ydoc);
            } else {
                throw new Error("Invalid ydoc type");
            }
            updateFields.push(`ydoc = $${paramIndex}`);
            updateValues.push(ydocBuffer);
            paramIndex++;
        }

        // New page-based format
        if (pages !== null) {
            updateFields.push(`pages = $${paramIndex}`);
            updateValues.push(JSON.stringify(pages));
            paramIndex++;
        }

        if (settings !== null) {
            updateFields.push(`settings = $${paramIndex}`);
            updateValues.push(JSON.stringify(settings));
            paramIndex++;
        }

        // Add WHERE clause parameters
        updateValues.push(scribble_id, user.id);

        const updateQuery = `
            UPDATE btw.scribbles
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        `;

        await pool.query(updateQuery, updateValues);
    } else {
        // Insert new scribble
        let ydocBuffer = null;
        if (ydoc !== null) {
            if (typeof ydoc.encodeStateAsUpdate === 'function' || 
                (ydoc.constructor && ydoc.constructor.name === 'Doc')) {
                const update = Y.encodeStateAsUpdate(ydoc);
                ydocBuffer = Buffer.from(update);
            } else if (Buffer.isBuffer(ydoc)) {
                ydocBuffer = ydoc;
            } else if (ydoc instanceof Uint8Array) {
                ydocBuffer = Buffer.from(ydoc);
            }
        }

        await pool.query(
            `INSERT INTO btw.scribbles (id, user_id, data, ydoc, pages, settings, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                scribble_id,
                user.id,
                data,
                ydocBuffer,
                pages ? JSON.stringify(pages) : null,
                settings ? JSON.stringify(settings) : null,
                created_at,
                updated_at
            ]
        );
    }

    return await getScribble(user, scribble_id);
}
```

---

## REST API Integration

### Get Notes Endpoint

```javascript
router.post("/notes/get", cors(...), async (req, res) => {
    const { fingerprint, page = 1, limit = 50, after } = req.body || {};

    const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

    let user;

    try {
        user = await getUserFromToken({
            token: loginToken,
            fingerprint,
        });

        if (!user) {
            throw new Error("User not found");
        }

        const {
            notes,
            page: pageToSend,
            total,
            limit: limitToSend,
        } = await getNotes({
            user_id: user.id,
            page,
            limit,
            after,
        });
        
        res.json({
            success: true,
            data: { notes, page: pageToSend, total, limit: limitToSend },
            isLoggedIn: !!user,
        });
    } catch (e) {
        res.json({
            success: false,
            data: { notes: [] },
            error: e,
            isLoggedIn: !!user,
        });
        return;
    }
});
```

---

## Package Dependencies

```json
{
    "@hocuspocus/extension-database": "^1.1.1",
    "@hocuspocus/server": "1.1.1",
    "@hocuspocus/transformer": "1.1.1",
    "@tiptap/core": "^2.0.0-beta.220",
    "@tiptap/html": "^2.0.0-beta.220",
    "yjs": "13.5.48",
    "pg": "^8.0.3",
    "express": "~4.16.1",
    "uuid": "^8.0.0",
    "debounce": "1.2.1"
}
```

