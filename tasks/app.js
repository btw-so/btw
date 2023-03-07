var createError = require("http-errors");
var debounce = require("debounce");
require("newrelic");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { Youtube } = require("@tiptap/extension-youtube");
const { Document } = require("@tiptap/extension-document");
const { Paragraph } = require("@tiptap/extension-paragraph");
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

const CustomDocument = Document.extend({
    content: "heading block*",
});
var { Server } = require("@hocuspocus/server");
var { TiptapTransformer } = require("@hocuspocus/transformer");
var MyTipTapTransformer = TiptapTransformer.extensions([
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
]);

var indexRouter = require("./routes/index");
var otpRouter = require("./routes/otp");
var { baseQueue } = require("./services/queue");

var {
    getUserFromToken,
    createLoginToken,
    createUser,
    setUserDetails,
} = require("./logic/user");

var app = express();

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
app.use("/user", require("./routes/user"));

// Queue monitor
const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullAdapter(baseQueue)],
    serverAdapter: serverAdapter,
});
serverAdapter.setBasePath("/admin/queues");
app.use("/admin/queues", serverAdapter.getRouter());

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

        const ownerOfDoc = documentName.split("note.")[1].split(".")[0];

        console.log(documentName, ownerOfDoc, user.id);

        // We might have shareable docs later on. For now we only allow the owner
        if ("" + user.id !== ownerOfDoc) {
            throw new Error("Not authorized!");
        }

        // You can set contextual data to use it in other hooks
        return {
            user,
        };
    },
    async onLoadDocument(data) {
        // The Tiptap collaboration extension uses shared types of a single y-doc
        // to store different fields in the same document.
        // The default field in Tiptap is simply called "default"
        const fieldName = "default";

        // Check if the given field already exists in the given y-doc.
        // Important: Only import a document if it doesn't exist in the primary data storage!
        if (!data.document.isEmpty(fieldName)) {
            return;
        }

        // Get the document from somwhere. In a real world application this would
        // probably be a database query or an API call
        // const prosemirrorJSON = JSON.parse(
        //     readFileSync(`/path/to/your/documents/${data.documentName}.json`) ||
        //         "{}"
        // );

        // Convert the editor format to a y-doc. The TiptapTransformer requires you to pass the list
        // of extensions you use in the frontend to create a valid document
        // return MyTipTapTransformer.toYdoc(prosemirrorJSON, fieldName);
    },
    async onChange(data) {
        const save = () => {
            // Convert the y-doc to something you can actually use in your views.
            // In this example we use the TiptapTransformer to get JSON from the given
            // ydoc.
            const prosemirrorJSON = MyTipTapTransformer.fromYdoc(data.document);

            console.log(prosemirrorJSON);

            // Save your document. In a real-world app this could be a database query
            // a webhook or something else
            // writeFile(
            //     `/path/to/your/documents/${data.documentName}.json`,
            //     prosemirrorJSON
            // );

            // Maybe you want to store the user who changed the document?
            // Guess what, you have access to your custom context from the
            // onAuthenticate hook here. See authorization & authentication for more
            // details
            console.log(
                `Document ${data.documentName} changed by ${data.context.user.id}`
            );
        };

        debounced[data.documentName] && debounced[data.documentName].clear();
        debounced[data.documentName] = debounce(() => save(), 4000);
        debounced[data.documentName]();
    },
    port: Number(process.env.YJS_PORT),
});

yjsServer.listen();

module.exports = app;
