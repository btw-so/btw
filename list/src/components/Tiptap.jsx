/* eslint-disable */
import React from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockComponent from "./CodeBlockComponent";
import { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

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

let TipTapTeacher = null;

import UppyComponent from "../components/Uppy";
import Suggestion from "./TipTapSuggestion";

import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";

import { all, createLowlight } from "lowlight";

const lowlight = createLowlight(all);
lowlight.register("html", html);
lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("ts", ts);
// lowlight.registerLanguage("html", html);
// lowlight.registerLanguage("css", css);
// lowlight.registerLanguage("js", js);
// lowlight.registerLanguage("ts", ts);

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import genFingerprint from "../fingerprint";
import MenuBar from "./TipTapMenuBar";
import Embed from "./TipTapEmbed";
import toast from "react-hot-toast";

const limit = 1000000;

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
        name: `note.${props.userId}.${props.docId}${
          props.usecase ? `.${props.usecase}` : ""
        }`,
        document: ydoc,
        token: `${props.token}:::${genFingerprint()}`,
        onDisconnect: () => {
          if (!window.toastId) {
            window.toastId = toast.loading(`Trying to reconnect`);
          }
        },
        onConnect: () => {
          if (window.toastId) {
            toast.success(`Connected.`);
            toast.dismiss(window.toastId);
            window.toastId = null;
          }
        },
      });
    }

    this.editor = new Editor({
      // autofocus: true, // commenting this out since it's causing the editor to auto scroll to top when a below the fold checkbox is clicked
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
        ...(this.props.disallowH1 && !this.props.mandatoryH1
          ? [Heading.configure({ levels: [2, 3, 4, 5, 6] })]
          : [Heading]),
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
              return "What's the Title?";
            }

            return "Write something...";
          },
        }),
        Youtube.configure({
          controls: false,
        }),
        CodeBlockLowlight.extend({
          addNodeView() {
            return ReactNodeViewRenderer(CodeBlockComponent);
          },
        }).configure({
          lowlight,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: Suggestion([props.userName || "You"]),
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
        ...(TipTapTeacher ? [TipTapTeacher] : []),
      ],
      editorProps: {
        attributes: {
          class:
            "prose lg:prose-base prose-p:leading-normal focus:outline-none flex-grow !p-4 md:!p-2 mt-2 max-w-full",
        },
      },
      content: props.content || "",
    });

    this.editor.on("update", () => {
      this.props.onChange(this.editor.getHTML());
    });

    if (props.reviewerMode) {
      this.enableTeacherModeAndRun();
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.reviewerMode && this.props.reviewerMode) {
      this.enableTeacherModeAndRun();
    } else if (
      this.props.reviewerMode &&
      prevProps.docId !== this.props.docId
    ) {
      this.enableTeacherModeAndRun();
    }

    if (!this.props.reviewerMode) {
      this.disableTeacherMode();
    }
  }

  getTeacherResults() {
    if (
      TipTapTeacher &&
      this.editor &&
      this.editor.storage &&
      this.editor.storage.teacher
    ) {
      return this.editor.commands.getData();
    }
  }

  enableTeacherModeAndRun() {
    if (
      TipTapTeacher &&
      this.editor &&
      this.editor.storage &&
      this.editor.storage.teacher
    ) {
      this.editor.commands.enableTeacher();
      this.editor.chain().runTeacher().run();
    }
  }

  disableTeacherMode() {
    if (
      TipTapTeacher &&
      this.editor &&
      this.editor.storage &&
      this.editor.storage.teacher
    ) {
      this.editor.commands.disableTeacher();
      this.editor.chain().runTeacher().run();
    }
  }

  setContent(content) {
    this.editor.commands.setContent(content);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  moveTo(from, to) {
    const { node } = this.editor.view.domAtPos(from);
    node?.scrollIntoView?.(false);

    // set text selection
    this.editor.view.dispatch(
      this.editor.view.state.tr.setSelection(
        TextSelection.create(this.editor.view.state.doc, from, to)
      )
    );
  }

  fix(fn, issue) {
    if (fn) {
      this.moveTo(issue.from, issue.to);
      fn(this.editor.view, issue);
    }
  }

  render() {
    return (
      <div
        className="p-2 h-full flex flex-grow flex-col"
        style={{ minHeight: 0 }}
      >
        <MenuBar
          classes={this.props.menuBarClasses || ""}
          disallowH1={this.props.disallowH1}
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
        <div className="tiptap-editor flex flex-col flex-grow overflow-y-auto overflow-x-auto mt-4">
          <EditorContent
            editor={this.editor}
            className="flex-grow max-w-4xl overflow-x-hidden small-scrollbar"
            onClick={(e) => {
              // get the editor in focus
              this.editor.commands.focus();
            }}
          />
        </div>
        <div className="h-1 mb-4 block"></div>
        <div className="pl-4 md:pl-0 flex ">
          {this.props.hideCharacterCount ? null : (
            <div className="character-count text-xs text-gray-400">
              {/* {this.state.chars || "0"}/{limit} characters
            <br /> */}
              {this.state.words || "0"} words
            </div>
          )}
          {this.props.liveUrl ? (
            <div
              className="character-count text-xs text-gray-400 hover:text-gray-900 transition-colors duration-300 cursor-pointer"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(this.props.liveUrl);
                  toast.success("Live URL copied to clipboard.");
                } catch (err) {
                  toast.error("Failed to copy live URL.");
                }
              }}
            >
              <span className="ml-1 px-1 text-xxs py-0.5 bg-gray-200 rounded text-gray-400 text-[10px] align-middle">
                SHARE NOTE
              </span>
            </div>
          ) : null}
          
        </div>
        <div className="h-1 mt-10 md:mt-4 block md:hidden"></div>

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
              folder={`list/${this.props.userId}/notes/${this.props.docId}`}
              allowedFileTypes={[
                "image/png",
                "image/gif",
                "image/jpeg",
                "image/webp",
                "image/svg+xml",
              ]}
              onResults={async (res) => {
                if (this.editor) {
                  const images = res.urls.map((originalUrl) => {
                    let url = originalUrl;
                    if (process.env.REACT_APP_S3_ENDPOINT) {
                      url = url
                        .split(
                          `${process.env.REACT_APP_S3_ENDPOINT}/${process.env.REACT_APP_S3_ENDPOINT}`
                        )
                        .join(process.env.REACT_APP_S3_ENDPOINT);
                    }
                    return { type: "image", attrs: { src: url } };
                  });
                  this.editor.chain().focus().insertContent(images).run();
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
