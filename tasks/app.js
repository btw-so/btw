var createError = require("http-errors");
var debounce = require("debounce");
require("newrelic");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var cors = require("cors");
var logger = require("morgan");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { Youtube } = require("@tiptap/extension-youtube");
const { Document } = require("@tiptap/extension-document");
const { Paragraph } = require("@tiptap/extension-paragraph");
const { Image } = require("@tiptap/extension-image");
const { Text } = require("@tiptap/extension-text");
const { Bold } = require("@tiptap/extension-bold");
const { Blockquote } = require("@tiptap/extension-blockquote");
const { OrderedList } = require("@tiptap/extension-ordered-list");
const { BulletList } = require("@tiptap/extension-bullet-list");
const { ListItem } = require("@tiptap/extension-list-item");
const { CharacterCount } = require("@tiptap/extension-character-count");
const { Code } = require("@tiptap/extension-code");
const { CodeBlockLowlight } = require("@tiptap/extension-code-block-lowlight");
const { Dropcursor } = require("@tiptap/extension-dropcursor");
const { Gapcursor } = require("@tiptap/extension-gapcursor");
const { HardBreak } = require("@tiptap/extension-hard-break");
const { Heading } = require("@tiptap/extension-heading");
const { Highlight } = require("@tiptap/extension-highlight");
const { HorizontalRule } = require("@tiptap/extension-horizontal-rule");
const { Italic } = require("@tiptap/extension-italic");
const { Link } = require("@tiptap/extension-link");
const { Mention } = require("@tiptap/extension-mention");
const { Placeholder } = require("@tiptap/extension-placeholder");
const { Strike } = require("@tiptap/extension-strike");
const { TaskItem } = require("@tiptap/extension-task-item");
const { TaskList } = require("@tiptap/extension-task-list");
const { Typography } = require("@tiptap/extension-typography");
const { Underline } = require("@tiptap/extension-underline");
const { Node, mergeAttributes } = require("@tiptap/core");

const Embed = Node.create({
    name: "btw-embed",
    group: "block",
    selectable: true,
    draggable: true,
    atom: true,

    parseHTML() {
        return [
            {
                tag: "btw-embed",
                contentElement: "textarea",
            },
        ];
    },
    addAttributes() {
        return {
            code: {
                default: null,
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        return ["btw-embed", mergeAttributes(HTMLAttributes)];
    },
    parseHTML() {
        return [
            {
                tag: "btw-embed",
            },
        ];
    },
});

const CustomDocument = Document.extend({
    content: "heading block*",
});
var { Database } = require("@hocuspocus/extension-database");
var { Server } = require("@hocuspocus/server");
var { generateHTML, generateJSON } = require("@tiptap/html");
var { TiptapTransformer } = require("@hocuspocus/transformer");
var extensions = [
    Embed,
    CustomDocument,
    Paragraph,
    Text,
    Bold,
    Blockquote,
    OrderedList,
    BulletList,
    ListItem,
    Code,
    Dropcursor,
    Gapcursor,
    HardBreak,
    Heading,
    Highlight,
    HorizontalRule,
    Italic,
    Link,
    Strike,
    TaskList,
    Typography,
    Underline,
    Image,
    TaskItem.configure({
        nested: true,
    }),
    Placeholder.configure({
        placeholder: ({ node }) => {
            if (node.type.name === "heading") {
                return "What’s the title?";
            }

            return "Write something...";
        },
    }),
    Youtube.configure({
        controls: false,
    }),
    CodeBlockLowlight,
    Mention.configure({
        HTMLAttributes: {
            class: "mention",
        },
    }),
];
var MyTipTapTransformer = TiptapTransformer.extensions(extensions);
var MyTipTapTransformerHTML = (json) => generateHTML(json, extensions);
var MyTipTapTransformerJSON = (html) => generateJSON(html, extensions);

var indexRouter = require("./routes/index");
var otpRouter = require("./routes/otp");
var notesRouter = require("./routes/notes");
var { baseQueue } = require("./services/queue");
var { upsertNote, getNote } = require("./logic/notes");

var {
    getUserFromToken,
    createLoginToken,
    createUser,
    setUserDetails,
} = require("./logic/user");
var db = require("./services/db");

var app = express();

if (process.env.NODE_ENV == "production") {
    app.set("trust proxy", 1);
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/otp", otpRouter);
app.use("/notes", notesRouter);
app.use("/user", require("./routes/user"));

// Queue monitor
const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullAdapter(baseQueue)],
    serverAdapter: serverAdapter,
});
serverAdapter.setBasePath("/admin/queues");
app.use("/admin/queues", serverAdapter.getRouter());

const companion = require("@uppy/companion");
const UPPY_OPTIONS = {
    filePath: "/",
    server: {
        protocol: !!Number(process.env.DEBUG) ? "http" : "https",
        host: process.env.DOMAIN,
        path: "/companion",
    },
    secret: process.env.SECRET,
    debug: !!Number(process.env.DEBUG),
    s3: {
        getKey: (req, fileName) =>
            `${Date.now()}/${fileName.split(" ").join("_")}`,
        key: process.env.S3_KEY,
        secret: process.env.S3_SECRET,
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        region: "us-east-1",
        acl: process.env.COMPANION_AWS_ACL || "public-read",
        object_url: { public: true },
    },
    object_url: { public: true },
    corsOrigins: process.env.COMPANION_CLIENT_ORIGINS,
    uploadUrls: process.env.COMPANION_UPLOAD_URLS,
};
const { app: companionApp } = companion.app(UPPY_OPTIONS);

console.log("process.env.COMPANION_AWS_ACL", process.env.COMPANION_AWS_ACL);

app.use("/companion", companionApp);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

let debounced = {};

const yjsServer = Server.configure({
    async onAuthenticate(data) {
        const { token: tokenfingerprint, documentName } = data;

        const token = tokenfingerprint.split(":::")[0];
        const fingerprint = tokenfingerprint.split(":::")[1];

        const user = await getUserFromToken({ token, fingerprint });

        if (!user) {
            throw new Error("Not authorized!");
        }

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

        // You can set contextual data to use it in other hooks
        return {
            user,
        };
    },
    async onChange(data) {
        const save = () => {
            // Convert the y-doc to something you can actually use in your views.
            // In this example we use the TiptapTransformer to get JSON from the given
            // ydoc.
            const prosemirrorJSON = MyTipTapTransformer.fromYdoc(
                data.document,
                "default"
            );

            var html = MyTipTapTransformerHTML(prosemirrorJSON);

            const user_id = data.context.user.id;
            const id = data.documentName.split("note.")[1].split(".")[1];

            upsertNote({
                id,
                user_id,
                json: prosemirrorJSON,
                html,
            });

            // Maybe you want to store the user who changed the document?
            // Guess what, you have access to your custom context from the
            // onAuthenticate hook here. See authorization & authentication for more
            // details
            // console.log(
            //     `Document ${data.documentName} changed by ${data.context.user.id}`
            // );
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
                // console.log("fetching", documentName);
                const id = documentName.split("note.")[1].split(".")[1];
                const user_id = documentName.split("note.")[1].split(".")[0];

                return new Promise((resolve, reject) => {
                    resolve(
                        db.getTasksDB().then((db) => {
                            return db
                                .query(
                                    `SELECT ydoc from btw.notes where id = $1 and user_id = $2`,
                                    [id, Number(user_id)]
                                )
                                .then(({ rows }) => {
                                    // console.log("Found", rows.length);
                                    if (rows.length > 0) {
                                        if (rows[0].ydoc) {
                                            return rows[0]?.ydoc;
                                        } else if (rows[0]?.html) {
                                            const json =
                                                MyTipTapTransformerJSON(
                                                    rows[0].html
                                                );
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
            },
            // … and a Promise to store data:
            store: async ({ documentName, state }) => {
                // console.log("storing", documentName);
                const id = documentName.split("note.")[1].split(".")[1];
                const user_id = documentName.split("note.")[1].split(".")[0];

                return new Promise((resolve, reject) => {
                    resolve(
                        db.getTasksDB().then((db) => {
                            return db.query(
                                `INSERT INTO btw.notes (id, user_id, ydoc, created_at, updated_at) VALUES($1, $2, $3, $4, $5) ON CONFLICT(id, user_id) DO UPDATE SET ydoc = $3, updated_at = $4 RETURNING ydoc`,
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
            },
        }),
    ],
});

yjsServer.listen();

module.exports = app;
