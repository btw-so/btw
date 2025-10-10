import React from "react";
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

function astToHtml(nodes) {
  if (!Array.isArray(nodes)) return "";
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return node.value;
      }
      if (node.type === "element") {
        const classAttr = node.properties.className
          ? ` class=\"${node.properties.className.join(" ")}"`
          : "";
        return `<${node.tagName}${classAttr}>${astToHtml(node.children)}</${node.tagName}>`;
      }
      return "";
    })
    .join("");
}

function highlightCodeBlocks(html) {
  return html.replace(
    /<pre><code class=\"language-([\w-]+)\">([\s\S]*?)<\/code><\/pre>/g,
    (match, lang, code) => {
      if (lang === "css") {
        return match;
      }
      const decodedCode = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      try {
        const result = lowlight.highlight(lang, decodedCode);
        if (!result || !Array.isArray(result.children)) {
          return match;
        }
        const highlighted = astToHtml(result.children);
        return `<div class=\"tiptap-code-block\"><pre><code class=\"hljs language-${lang}\">${highlighted}</code></pre></div>`;
      } catch (e) {
        return match;
      }
    }
  );
}

function PublicTextNote({ heading, html }) {
  return (
    <div className="container w-auto md:w-full max-w-5xl tiptap-editor flex-grow flex-shrink-0">
      <div className="text-3xl font-bold mb-3 leading-tight text-black">
        {heading}
      </div>
      <div className="text-sm w-full text-gray-500">
        <div className="prose md:prose-lg w-full min-w-full pb-12">
          {html ? (
            <div
              dangerouslySetInnerHTML={{
                __html: highlightCodeBlocks(html),
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PublicTextNote; 