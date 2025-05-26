import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useUpdateEffect } from "react-use";
import { useParams } from "react-router-dom";
import { selectList } from "../selectors";
import useTreeChanges from "tree-changes-hook";
import parse, { domToReact } from "html-react-parser";

import { useAppSelector } from "modules/hooks";

import { STATUS } from "../literals";

import { getPublicList } from "../actions";

import PublicTextNote from "../components/PublicTextNote";
import FileWrapper from "../components/FileWrapper";
import PublicChildTree from "../components/PublicChildTree";

function PublicListContainer() {
  const dispatch = useDispatch();
  const { id, hash } = useParams();
  const list = useAppSelector(selectList);
  const publicList = list.publicList?.data;
  const nodes = publicList?.nodes || [];
  const note = publicList?.note;
  const file = publicList?.file;

  // FIX: Move useState to top level
  const [mobileView, setMobileView] = useState("list"); // "list" or "note"

  useEffect(() => {
    dispatch(getPublicList({ id, hash }));
  }, [id, hash]);

  // The root node is the one whose parent_id is null or undefined
  const rootNode = id;
  // Child nodes are those whose parent_id === rootNode.id
  const childNodes = rootNode
    ? nodes.filter((n) => n.parent_id === rootNode)
    : [];

  // Determine if there is text (note with html or heading)
  const hasText = note && note.html;
  // Determine if there is a file
  const hasFile = !!file;
  // Determine if there are child nodes
  const hasChildren = childNodes.length > 0;

  console.log(file, hasChildren, hasText, hasFile);

  // Case 1 & 3: No child nodes -- tested
  if (!hasChildren) {
    return (
      <div
        key="PublicList"
        data-testid="PublicList"
        className="min-h-full flex flex-col shrink-0 grow"
      >
        <div className="w-full h-0.5 border-b border-gray-100 h-6 md:h-12 flex">
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
        <div className="container mx-6 w-auto md:w-full md:mx-auto px-6 md:px-12 pt-6 md:pt-12 border-solid border-gray-100 border-x max-w-5xl tiptap-editor flex-grow flex-shrink-0 flex">
          {hasText ? (
            <div className="w-full">
              <PublicTextNote heading={note?.heading} html={note?.html} />
            </div>
          ) : hasFile ? (
            <div className="w-full">
              <FileWrapper
                fileSuccess={true}
                fileError={false}
                fileLoading={false}
                fileUrl={file?.url}
              />
            </div>
          ) : (
            <PublicTextNote heading={note?.heading} html={note?.html} />
          )}
        </div>
        <div className="w-full h-0.5 border-t border-gray-100 h-6 md:h-12 flex">
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
      </div>
    );
  }

  // Case 2: Child nodes exist, but no file and text is empty
  if (hasChildren && !hasFile && !hasText) {
    return (
      <div
        key="PublicList"
        data-testid="PublicList"
        className="min-h-full flex flex-col shrink-0 grow"
      >
        <div className="w-full h-0.5 border-b border-gray-100 h-6 md:h-12 flex">
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
        <div className="container mx-6 w-auto md:w-full md:mx-auto px-6 md:px-12 pt-6 md:pt-12 border-solid border-gray-100 border-x max-w-5xl tiptap-editor flex-grow flex-shrink-0 flex flex-col">
          <div>
            <h1 className="text-3xl font-bold mb-3 leading-tight tracking-tight text-black">
              {note?.heading}
            </h1>
          </div>
          <PublicChildTree nodes={nodes} rootId={rootNode} first={true} />
        </div>
        <div className="w-full h-0.5 border-t border-gray-100 h-6 md:h-12 flex">
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
      </div>
    );
  }

  // Case 4: Child nodes + either text or file (never both)
  if (hasChildren && (hasText || hasFile)) {
    // --- ICONS ---
    const noteIcon = <i className="ri-quill-pen-fill"></i>;
    const fileIcon = <i className="ri-attachment-2"></i>;
    const listIcon = <i className="ri-list-check"></i>;

    // --- MOBILE ONLY ---
    const mobileDock = (
      <div className="fixed bottom-4 left-0 w-full flex justify-center z-50 md:hidden">
        <div className="bg-white/90 shadow-lg rounded-full flex px-4 py-2 gap-6 border border-gray-200 backdrop-blur-md">
          <button
            className={`flex flex-col items-center px-3 py-1 focus:outline-none ${mobileView === "list" ? "text-gray-900 font-bold" : "text-gray-400"}`}
            onClick={() => setMobileView("list")}
            aria-label="Show List"
          >
            {listIcon}
            <span className="text-xs mt-0.5">List</span>
          </button>
          <button
            className={`flex flex-col items-center px-3 py-1 focus:outline-none ${mobileView === "note" ? "text-gray-900 font-bold" : "text-gray-400"}`}
            onClick={() => setMobileView("note")}
            aria-label={hasFile ? "Show File" : "Show Note"}
          >
            {hasFile ? fileIcon : noteIcon}
            <span className="text-xs mt-0.5">{hasFile ? "File" : "Note"}</span>
          </button>
        </div>
      </div>
    );

    // --- MOBILE VIEW ---
    const mobileContent = (
      <div className="min-h-full flex flex-col shrink-0 grow relative md:hidden">
        <div className="w-full h-0.5 border-b border-gray-100 h-6 flex">
          <div className="container mx-4 px-2 pt-0 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
        <div className="flex-grow flex-shrink-0 flex flex-col pt-6 pb-24"> {/* pb-24 for dock space */}
          {mobileView === "list" ? (
            <div className="px-4">
              <PublicChildTree nodes={nodes} rootId={rootNode} first={true} />
            </div>
          ) : (
            <div className="px-4">
              {hasFile ? (
                <FileWrapper fileUrl={file.url} />
              ) : (
                <PublicTextNote heading={note?.heading} html={note?.html} />
              )}
            </div>
          )}
        </div>
        <div className="w-full h-0.5 border-t border-gray-100 h-6 flex">
          <div className="container mx-4 px-2 pt-0 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
        {mobileDock}
      </div>
    );

    // --- DESKTOP VIEW ---
    const desktopContent = (
      <div
        key="PublicList"
        data-testid="PublicList"
        className="min-h-full flex flex-col shrink-0 grow md:flex"
      >
        <div className="w-full h-0.5 border-b border-gray-100 h-6 md:h-12 flex">
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
        <div className="container mx-4 w-auto md:w-full md:mx-auto px-2 md:px-12 border-solid border-gray-100 border-x max-w-7xl flex-grow flex-shrink-0 flex md:flex">
          <div className="max-w-96 w-96 flex-shrink-0 pr-10 border-r border-gray-200 pt-10 md:block hidden">
            <PublicChildTree nodes={nodes} rootId={rootNode} first={true} />
          </div>
          <div className="w-full pl-10 flex pt-10 md:block hidden">
            {hasFile ? (
              <FileWrapper fileUrl={file.url} />
            ) : (
              <PublicTextNote heading={note?.heading} html={note?.html} />
            )}
          </div>
        </div>
        <div className="w-full h-0.5 border-t border-gray-100 h-6 md:h-12 flex">
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-7xl w-full"></div>
        </div>
      </div>
    );

    // --- RENDER ---
    return (
      <>
        {/* Mobile: show only one view at a time, dock at bottom */}
        <div className="md:hidden">{mobileContent}</div>
        {/* Desktop: show both views side by side */}
        <div className="hidden md:flex">{desktopContent}</div>
      </>
    );
  }

  // fallback (should not happen)
  return null;
}

export default PublicListContainer;
