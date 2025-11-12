/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-task-list@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports,require("@tiptap/core")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self)["@tiptap/extension-task-list"]={},t.core)}(this,(function(t,e){"use strict";const i=e.Node.create({name:"taskList",addOptions:()=>({itemTypeName:"taskItem",HTMLAttributes:{}}),group:"block list",content(){return`${this.options.itemTypeName}+`},parseHTML(){return[{tag:`ul[data-type="${this.name}"]`,priority:51}]},renderHTML({HTMLAttributes:t}){return["ul",e.mergeAttributes(this.options.HTMLAttributes,t,{"data-type":this.name}),0]},addCommands(){return{toggleTaskList:()=>({commands:t})=>t.toggleList(this.name,this.options.itemTypeName)}},addKeyboardShortcuts(){return{"Mod-Shift-9":()=>this.editor.commands.toggleTaskList()}}});t.TaskList=i,t.default=i,Object.defineProperty(t,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/61804383b5a11be0734385f74326e63f392da0d5c469641f7f56b7d884c54204.map