/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-dropcursor@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(o,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports,require("@tiptap/core"),require("@tiptap/pm/dropcursor")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core","@tiptap/pm/dropcursor"],e):e((o="undefined"!=typeof globalThis?globalThis:o||self)["@tiptap/extension-dropcursor"]={},o.core,o.dropcursor)}(this,(function(o,e,r){"use strict";const t=e.Extension.create({name:"dropCursor",addOptions:()=>({color:"currentColor",width:1,class:void 0}),addProseMirrorPlugins(){return[r.dropCursor(this.options)]}});o.Dropcursor=t,o.default=t,Object.defineProperty(o,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/fc844158daf569b69952a36ceae507e14d118c1408fcdebfda856f850079ad24.map