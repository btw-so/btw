/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-paragraph@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("@tiptap/core")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self)["@tiptap/extension-paragraph"]={},e.core)}(this,(function(e,t){"use strict";const r=t.Node.create({name:"paragraph",priority:1e3,addOptions:()=>({HTMLAttributes:{}}),group:"block",content:"inline*",parseHTML:()=>[{tag:"p"}],renderHTML({HTMLAttributes:e}){return["p",t.mergeAttributes(this.options.HTMLAttributes,e),0]},addCommands(){return{setParagraph:()=>({commands:e})=>e.setNode(this.name)}},addKeyboardShortcuts(){return{"Mod-Alt-0":()=>this.editor.commands.setParagraph()}}});e.Paragraph=r,e.default=r,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/c63af97d534a280984d326d7f9c9ce38ff5ac6f3e77b76c95cad67b3c895c5f6.map