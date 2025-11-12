/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/@tiptap/extension-gapcursor@2.0.0-beta.220/dist/index.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(e,o){"object"==typeof exports&&"undefined"!=typeof module?o(exports,require("@tiptap/core"),require("@tiptap/pm/gapcursor")):"function"==typeof define&&define.amd?define(["exports","@tiptap/core","@tiptap/pm/gapcursor"],o):o((e="undefined"!=typeof globalThis?globalThis:e||self)["@tiptap/extension-gapcursor"]={},e.core,e.gapcursor)}(this,(function(e,o,r){"use strict";const t=o.Extension.create({name:"gapCursor",addProseMirrorPlugins:()=>[r.gapCursor()],extendNodeSchema(e){var r;const t={name:e.name,options:e.options,storage:e.storage};return{allowGapCursor:null!==(r=o.callOrReturn(o.getExtensionField(e,"allowGapCursor",t)))&&void 0!==r?r:null}}});e.Gapcursor=t,e.default=t,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=/sm/8455cfda46aed2c6876a3e44704218e6a0e7d0fcea2ee1544b6c5a7816bca9f1.map