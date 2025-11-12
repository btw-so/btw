/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-blockquote@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("@tiptap/core")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self)["@tiptap/extension-blockquote"]={},e.core)}(this,(function(e,t){"use strict";const o=/^\s*>\s$/,n=t.Node.create({name:"blockquote",addOptions:()=>({HTMLAttributes:{}}),content:"block+",group:"block",defining:!0,parseHTML:()=>[{tag:"blockquote"}],renderHTML({HTMLAttributes:e}){return["blockquote",t.mergeAttributes(this.options.HTMLAttributes,e),0]},addCommands(){return{setBlockquote:()=>({commands:e})=>e.wrapIn(this.name),toggleBlockquote:()=>({commands:e})=>e.toggleWrap(this.name),unsetBlockquote:()=>({commands:e})=>e.lift(this.name)}},addKeyboardShortcuts(){return{"Mod-Shift-b":()=>this.editor.commands.toggleBlockquote()}},addInputRules(){return[t.wrappingInputRule({find:o,type:this.type})]}});e.Blockquote=n,e.default=n,e.inputRegex=o,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/7768c839756383617c3788950d4cae1b3bdafdcb216be68854a59e25a022c257.map