/**
 * Minified by jsDelivr using Terser v5.37.0.
 * Original file: /npm/@tiptap/extension-underline@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("@tiptap/core")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self)["@tiptap/extension-underline"]={},e.core)}(this,(function(e,t){"use strict";const n=t.Mark.create({name:"underline",addOptions:()=>({HTMLAttributes:{}}),parseHTML:()=>[{tag:"u"},{style:"text-decoration",consuming:!1,getAttrs:e=>!!e.includes("underline")&&{}}],renderHTML({HTMLAttributes:e}){return["u",t.mergeAttributes(this.options.HTMLAttributes,e),0]},addCommands(){return{setUnderline:()=>({commands:e})=>e.setMark(this.name),toggleUnderline:()=>({commands:e})=>e.toggleMark(this.name),unsetUnderline:()=>({commands:e})=>e.unsetMark(this.name)}},addKeyboardShortcuts(){return{"Mod-u":()=>this.editor.commands.toggleUnderline(),"Mod-U":()=>this.editor.commands.toggleUnderline()}}});e.Underline=n,e.default=n,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/f5da3d77fa6eaf7549391a796ab56549c3cb89a8250df9088e16ce73598bfef0.map