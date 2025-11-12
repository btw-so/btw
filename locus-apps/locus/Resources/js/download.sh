#!/bin/bash

# TipTap Core & Extensions
curl -o tiptap-core.js "https://cdn.jsdelivr.net/npm/@tiptap/core@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-pm.js "https://cdn.jsdelivr.net/npm/@tiptap/pm@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-document.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-document@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-paragraph.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-paragraph@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-text.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-text@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-bold.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-bold@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-italic.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-italic@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-strike.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-strike@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-underline.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-underline@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-code.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-code@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-code-block.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-code-block@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-code-block-lowlight.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-code-block-lowlight@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-blockquote.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-blockquote@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-history.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-history@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-heading.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-heading@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-horizontal-rule.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-horizontal-rule@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-bullet-list.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-bullet-list@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-ordered-list.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-ordered-list@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-list-item.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-list-item@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-task-list.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-task-list@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-task-item.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-task-item@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-link.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-link@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-image.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-image@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-mention.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-mention@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-placeholder.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-placeholder@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-highlight.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-highlight@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-typography.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-typography@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-youtube.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-youtube@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-dropcursor.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-dropcursor@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-gapcursor.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-gapcursor@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-hard-break.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-hard-break@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-character-count.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-character-count@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-collaboration.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-collaboration@2.0.0-beta.220/dist/index.umd.min.js"
curl -o tiptap-collaboration-cursor.js "https://cdn.jsdelivr.net/npm/@tiptap/extension-collaboration-cursor@2.0.0-beta.220/dist/index.umd.min.js"

# Y.js and Hocuspocus
curl -o yjs.js "https://cdn.jsdelivr.net/npm/yjs@13.5.48/dist/yjs.js"
curl -o y-prosemirror.js "https://cdn.jsdelivr.net/npm/y-prosemirror@1.3.7/dist/y-prosemirror.js"
curl -o hocuspocus-provider.js "https://cdn.jsdelivr.net/npm/@hocuspocus/provider@1.1.1/dist/hocuspocus-provider.umd.min.js"

# Syntax highlighting
curl -o highlight.js "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/highlight.min.js"
curl -o lowlight.js "https://cdn.jsdelivr.net/npm/lowlight@2.9.0/lib/all.js"

# RemixIcon CSS
curl -o remixicon.css "https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css"

# Uppy
curl -o uppy.min.css "https://releases.transloadit.com/uppy/v3.25.0/uppy.min.css"
curl -o uppy.min.js "https://releases.transloadit.com/uppy/v3.25.0/uppy.min.js"

echo "All libraries downloaded!"
