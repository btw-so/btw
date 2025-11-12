/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-list-item@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports,require("@tiptap/core")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self)["@tiptap/extension-list-item"]={},t.core)}(this,(function(t,e){"use strict";const i=e.Node.create({name:"listItem",addOptions:()=>({HTMLAttributes:{}}),content:"paragraph block*",defining:!0,parseHTML:()=>[{tag:"li"}],renderHTML({HTMLAttributes:t}){return["li",e.mergeAttributes(this.options.HTMLAttributes,t),0]},addKeyboardShortcuts(){return{Enter:()=>this.editor.commands.splitListItem(this.name),Tab:()=>this.editor.commands.sinkListItem(this.name),"Shift-Tab":()=>this.editor.commands.liftListItem(this.name)}}});t.ListItem=i,t.default=i,Object.defineProperty(t,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/71f58cd0187835dba02115d1d2a965de6b9f8cb953555f48c95532adc639283b.map