/* eslint-disable */
import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Editor } from "@tiptap/core";

import Youtube from "@tiptap/extension-youtube";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Blockquote from "@tiptap/extension-blockquote";
import OrderedList from "@tiptap/extension-ordered-list";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import CharacterCount from "@tiptap/extension-character-count";
import Code from "@tiptap/extension-code";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
const CustomDocument = Document.extend({
  content: "heading block*",
});

import UppyComponent from "../components/Uppy";
import Suggestion from "./TipTapSuggestion";

import { lowlight } from "lowlight";
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";
lowlight.registerLanguage("html", html);
lowlight.registerLanguage("css", css);
lowlight.registerLanguage("js", js);
lowlight.registerLanguage("ts", ts);

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import genFingerprint from "../fingerprint";
import MenuBar from "./TipTapMenuBar";
import Embed from "./TipTapEmbed";

const limit = 100000;

class Tiptap extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showImageUpload: false,
      embed: "",
    };

    this.setupEditor(props);

    this.interval = setInterval(() => {
      if (this.editor && this.editor.storage) {
        this.setState({
          chars: this.editor.storage.characterCount.characters(),
          words: this.editor.storage.characterCount.words(),
        });
      }
    }, 300);
  }

  base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  setupEditor(props) {
    const ydoc = new Y.Doc();

    if (props.enableServerSync) {
      if (props.note?.ydoc?.data) {
        Y.applyUpdate(ydoc, Uint8Array.from(props.note?.ydoc?.data));
      }

      this.provider = new HocuspocusProvider({
        url: process.env.REACT_APP_YJS_DOMAIN,
        name: `note.${props.userId}.${props.docId}`,
        document: ydoc,
        token: `${props.token}:::${genFingerprint()}`,
      });
    }

    this.editor = new Editor({
      autofocus: true,
      extensions: [
        Embed,
        ...(this.props.mandatoryH1 ? [CustomDocument] : [Document]),
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
              return "What’s the Title?";
            }

            return "Write something...";
          },
        }),
        Youtube.configure({
          controls: false,
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: Suggestion([props.userName]),
        }),
        CharacterCount.configure({
          limit,
        }),
        ...(props.enableServerSync
          ? [
              Collaboration.configure({
                document: ydoc,
              }),
              CollaborationCursor.configure({
                provider: this.provider,
                user: {
                  name: props.name || props.email || "You",
                  color: "#ffcc00",
                },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-sm lg:prose-lg focus:outline-none flex-grow p-2 mt-2 max-w-full",
        },
      },
      content: props.content || "",
    });

    this.editor.on("update", () => {
      this.props.onChange(this.editor.getHTML());
    });
  }

  setContent(content) {
    this.editor.commands.setContent(content);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <div
        className="p-2 h-full flex flex-grow flex-col"
        style={{ minHeight: 0 }}
      >
        <MenuBar
          customMenu={this.props.customMenu}
          editor={this.editor}
          showImageUploader={() => {
            this.setState({ showImageUpload: !this.state.showImageUpload });
          }}
          showEmbedUploader={() => {
            this.editor
              .chain()
              .focus()
              .insertContent(
                `<btw-embed code="${(this.state.embed || "").replace(
                  /"/g,
                  "&quot;"
                )}"></btw-embed>`
              )
              .run(); // add a new embed element
          }}
        />
        <div className="tiptap-editor flex flex-col flex-grow overflow-y-scroll">
          <EditorContent
            editor={this.editor}
            className="flex-grow max-w-4xl"
            onClick={(e) => {
              // get the editor in focus
              this.editor.commands.focus();
            }}
          />
        </div>
        {this.props.hideCharacterCount ? null : (
          <div className="character-count text-xs text-gray-400">
            {/* {this.state.chars || "0"}/{limit} characters
            <br /> */}
            {this.state.words || "0"} words
          </div>
        )}
        <div
          className={`w-full h-full backdrop-blur-sm bg-white/30 top-0 left-0 flex flex-col items-center justify-center ${
            this.state.showImageUpload ? "absolute" : "absolute hidden"
          }`}
          onClick={() => {
            this.setState({ showImageUpload: false });
          }}
        >
          <div
            className=""
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <UppyComponent
              allowedFileTypes={[
                "image/png",
                "image/gif",
                "image/jpeg",
                "image/webp",
                "image/svg+xml",
              ]}
              onResults={(res) => {
                // dispatch an action to backend for this now
                if (this.editor) {
                  res.urls.map((url) => {
                    // HACK. for some reason DO us adding S3 endpoint twice in its urls
                    // so we need to remove the first one
                    // If the URL has process.env.S3_ENDPOINT + "/" +  process.env.S3_ENDPOINT, remove the first one
                    if (process.env.REACT_APP_S3_ENDPOINT) {
                      url = url
                        .split(
                          `${process.env.REACT_APP_S3_ENDPOINT}/${process.env.REACT_APP_S3_ENDPOINT}`
                        )
                        .join(process.env.REACT_APP_S3_ENDPOINT);
                    }

                    // this.editor.commands.setImage({ src: url });
                    this.editor.chain().focus().setImage({ src: url }).run();
                  });
                }

                this.setState({ showImageUpload: false });
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Tiptap;
