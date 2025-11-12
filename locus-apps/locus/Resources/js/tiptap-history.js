/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-history@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(t,o){"object"==typeof exports&&"undefined"!=typeof module?o(exports,require("@tiptap/core"),require("@tiptap/pm/history")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core","@tiptap/pm/history"],o):o((t="undefined"!=typeof globalThis?globalThis:t||self)["@tiptap/extension-history"]={},t.core,t.history)}(this,(function(t,o,e){"use strict";const d=o.Extension.create({name:"history",addOptions:()=>({depth:100,newGroupDelay:500}),addCommands:()=>({undo:()=>({state:t,dispatch:o})=>e.undo(t,o),redo:()=>({state:t,dispatch:o})=>e.redo(t,o)}),addProseMirrorPlugins(){return[e.history(this.options)]},addKeyboardShortcuts(){return{"Mod-z":()=>this.editor.commands.undo(),"Mod-y":()=>this.editor.commands.redo(),"Shift-Mod-z":()=>this.editor.commands.redo(),"Mod-я":()=>this.editor.commands.undo(),"Shift-Mod-я":()=>this.editor.commands.redo()}}});t.History=d,t.default=d,Object.defineProperty(t,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/932145c034f1093e230ef39c5c74d484f394202b461c0b2c46860197fcaa8f65.map