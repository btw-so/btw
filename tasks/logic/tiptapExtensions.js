const { Node, mergeAttributes } = require("@tiptap/core");
const { Document } = require("@tiptap/extension-document");
const { Paragraph } = require("@tiptap/extension-paragraph");
const { Text } = require("@tiptap/extension-text");
const { Bold } = require("@tiptap/extension-bold");
const { Blockquote } = require("@tiptap/extension-blockquote");
const { OrderedList } = require("@tiptap/extension-ordered-list");
const { BulletList } = require("@tiptap/extension-bullet-list");
const { ListItem } = require("@tiptap/extension-list-item");
const { Code } = require("@tiptap/extension-code");
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
const { Image } = require("@tiptap/extension-image");
const { Youtube } = require("@tiptap/extension-youtube");
const { CodeBlockLowlight } = require("@tiptap/extension-code-block-lowlight");

const Embed = Node.create({
    name: "btw-embed",
    group: "block",
    selectable: true,
    draggable: true,
    atom: true,
    parseHTML() { return [{ tag: "btw-embed" }]; },
    addAttributes() { return { code: { default: null } }; },
    renderHTML({ HTMLAttributes }) { return ["btw-embed", mergeAttributes(HTMLAttributes)]; },
});

const Excalidraw = Node.create({
    name: "excalidraw",
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    
    addAttributes() {
        return {
            data: {
                default: null,
                parseHTML: element => element.getAttribute("data-excalidraw"),
                renderHTML: attributes => {
                    if (!attributes.data) {
                        return {};
                    }
                    return {
                        "data-excalidraw": attributes.data,
                    };
                },
            },
        };
    },
    
    parseHTML() {
        return [
            {
                tag: "div[data-type='excalidraw']",
            },
        ];
    },
    
    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes(HTMLAttributes, { "data-type": "excalidraw" })];
    },
});

const CustomDocument = Document.extend({ content: "heading block*" });

const tiptapExtensions = [
    Embed,
    Excalidraw,
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
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "What's the title?" : "Write something..." }),
    Youtube.configure({ controls: false }),
    CodeBlockLowlight,
    Mention.configure({ HTMLAttributes: { class: "mention" } }),
];

module.exports = {
    tiptapExtensions,
    Embed,
    Excalidraw,
    CustomDocument,
}; 