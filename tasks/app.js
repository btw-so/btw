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
const {
    tiptapExtensions,
    Embed,
    CustomDocument,
} = require("./logic/tiptapExtensions");
var { generateHTML, generateJSON } = require("@tiptap/html");
var { TiptapTransformer } = require("@hocuspocus/transformer");
var MyTipTapTransformer = TiptapTransformer.extensions(tiptapExtensions);
var MyTipTapTransformerHTML = (json) => generateHTML(json, tiptapExtensions);
var MyTipTapTransformerJSON = (html) => generateJSON(html, tiptapExtensions);
var { Database } = require("@hocuspocus/extension-database");
var { Server } = require("@hocuspocus/server");

var jobsRouter = require("./routes/jobs");
var indexRouter = require("./routes/index");
var otpRouter = require("./routes/otp");
var notesRouter = require("./routes/notes");
var listRouter = require("./routes/list");
var filesRouter = require("./routes/files");
var whatsappRouter = require("./routes/whatsapp");
var telegramRouter = require("./routes/telegram");
var userRouter = require("./routes/user");
var a1Router = require("./routes/a1");
var memoriesRouter = require("./routes/memories");
var { baseQueue, alertsQueue, uxQueue } = require("./services/queue");
var { upsertNote, getNote } = require("./logic/notes");

var {
    getUserFromToken,
    createLoginToken,
    createUser,
    setUserDetails,
} = require("./logic/user");
var db = require("./services/db");

// setting up base user for default mode
createUser({
    email: process.env.ADMIN_EMAIL,
    slug: process.env.ADMIN_SLUG,
});

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
app.use("/list", listRouter);
app.use("/files", filesRouter);
app.use("/whatsapp", whatsappRouter);
app.use("/telegram", telegramRouter);
app.use("/a1", a1Router);
app.use("/user", userRouter);
app.use("/jobs", jobsRouter);
app.use("/memories", memoriesRouter);

// Queue monitor
const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [
        new BullAdapter(baseQueue),
        new BullAdapter(alertsQueue),
        new BullAdapter(uxQueue),
    ],
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
    providerOptions: {
        s3: {
            key: process.env.S3_KEY,
            secret: process.env.S3_SECRET,
            bucket: process.env.S3_BUCKET,
            endpoint: process.env.S3_ENDPOINT,
            region: "us-east-1",
            acl: process.env.COMPANION_AWS_ACL || "public-read",
            object_url: { public: true },
            getKey: (req, fileName) => {
                return req.query.metadata?.fileName || fileName;
            },
        },
    },
    object_url: { public: true },
    corsOrigins: process.env.COMPANION_CLIENT_ORIGINS,
    uploadUrls: process.env.COMPANION_UPLOAD_URLS,
};
const companionApp = companion.app(UPPY_OPTIONS);

console.log("process.env.COMPANION_AWS_ACL", process.env.COMPANION_AWS_ACL);

app.use(
    "/companion",
    cors({
        origin: process.env.COMPANION_CLIENT_ORIGINS.split(","),
    }),
    companionApp
);

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
                                    // console.log("Found", rows.length);
                                    if (rows.length > 0) {
                                        if (rows[0].ydoc) {
                                            return rows[0]
                                                ? rows[0].ydoc
                                                : null;
                                        } else if (rows[0] && rows[0].html) {
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
                let usecase =
                    documentName.split("note.")[1].split(".").length > 2
                        ? documentName.split("note.")[1].split(".")[2]
                        : null;

                return new Promise((resolve, reject) => {
                    resolve(
                        db.getTasksDB().then((db) => {
                            return db.query(
                                `INSERT INTO btw.notes (id, user_id, ydoc, created_at, updated_at, tags) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT(id, user_id) DO UPDATE SET ydoc = $3, updated_at = CASE WHEN
                                notes.ydoc <> EXCLUDED.ydoc
                                OR FALSE THEN
                                EXCLUDED.updated_at
                                ELSE
                                notes.updated_at
                            END RETURNING ydoc`,
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
            },
        }),
    ],
});

yjsServer.listen();

module.exports = app;
