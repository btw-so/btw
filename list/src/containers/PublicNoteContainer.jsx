import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useUpdateEffect } from "react-use";
import { useParams } from "react-router-dom";
import { selectList } from "../selectors";
import useTreeChanges from "tree-changes-hook";
import parse, { domToReact } from "html-react-parser";

import { useAppSelector } from "modules/hooks";

import { STATUS } from "../literals";

import { getPublicNote } from "../actions";
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
  if (!Array.isArray(nodes)) return ""; // Defensive: avoid .map on undefined
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
        // Don't highlight CSS, return as is
        return match;
      }
      // Decode HTML entities
      const decodedCode = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      try {
        const result = lowlight.highlight(lang, decodedCode);
        // Defensive: check if result.children is an array
        if (!result || !Array.isArray(result.children)) {
          console.log("Lowlight result is not as expected:", result);
          return match;
        }
        const highlighted = astToHtml(result.children);
        return `<div class=\"tiptap-code-block\"><pre><code class=\"hljs language-${lang}\">${highlighted}</code></pre></div>`;
      } catch (e) {
        console.log("AM I HERE", e);
        // If highlighting fails, return the original block
        return match;
      }
    }
  );
}

function PublicNoteContainer() {
  const dispatch = useDispatch();
  const list = useAppSelector(selectList);

  const { id, hash } = useParams();

  useEffect(() => {
    dispatch(getPublicNote({ id, hash }));
  }, [id, hash]);

  return (
    <div key="PublicNote" data-testid="PublicNote" className="min-h-full flex flex-col shrink-0 grow">
        <div
          className="w-full h-0.5 border-b border-gray-100 h-6 md:h-12 flex"
        >
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-5xl w-full"></div>
        </div>
        <div 
          className="container mx-6 w-auto md:w-full md:mx-auto px-6 md:px-12 pt-6 md:pt-12 border-solid border-gray-100 border-x max-w-5xl tiptap-editor flex-grow flex-shrink-0"
        >
          <div className="text-3xl font-bold mb-3 leading-tight tracking-tight">
            {list.publicNote?.data?.heading}
          </div>
          <div className="text-sm w-full text-gray-500">
            <div className="prose md:prose-lg w-full min-w-full pb-12">
              {list.publicNote?.data?.html ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: highlightCodeBlocks(list.publicNote.data.html),
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div
          className="w-full h-0.5 border-t border-gray-100 h-6 md:h-12 flex"
        >
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-5xl w-full"></div>
        </div>
    </div>
  );
}

export default PublicNoteContainer;
