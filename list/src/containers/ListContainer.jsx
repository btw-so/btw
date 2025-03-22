import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppSelector } from "modules/hooks";
import CryptoJS from "crypto-js";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import useCookie from "../hooks/useCookie";
import UppyComponent from "../components/Uppy";
import useLocalStorage from "../hooks/useLocalStorage";
import { selectUser, selectList, selectNotes, selectFiles } from "../selectors";
import {
  updateUser,
  upsertListNode,
  changeSelectedNode,
  getList,
  batchPushNodes,
  getFile,
  addFile,
} from "../actions";
import useTreeChanges from "tree-changes-hook";
import Tiptap from "../components/Tiptap";
import { Switch } from "@headlessui/react";
import { debounce } from "lodash";

const MAX_POS = 10000;
const MAX_LEVEL = 10;
const MAX_ITEMS_IN_LEVEL2 = 100;

// Define drag states outside component to avoid re-renders
let draggedNodeId = null;
let dragOverNodeId = null;
let dropPosition = null;

function getRandomNonce() {
  return Math.floor(Math.random() * 10000) / 10000;
}

function getUUID() {
  // create random uuid manually
  const random = crypto.randomUUID();
  return random;
}

function shortHash(x, key, length = 5) {
  const hmac = CryptoJS.HmacSHA256(x, key);
  const base64 = CryptoJS.enc.Base64.stringify(hmac);

  // Make it URL-safe and trim padding
  const safe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return safe.slice(0, length).toLowerCase();
}

function getCursorDetails() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null; // No selection available

  const range = selection.getRangeAt(0);
  const startContainer = range.startContainer;

  // Create a range that starts at the beginning of the content and ends at the start of the selection
  const preCaretRange = document.createRange();
  preCaretRange.selectNodeContents(startContainer);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preCaretRange.toString().length;

  // Calculate the end offset of the selection within the text content
  const endOffset = startOffset + range.toString().length;

  return {
    totalRange: (startContainer.textContent || "").length,
    cursorStart: startOffset,
    cursorEnd: endOffset,
  };
}

function getTotalRangeOfFirstTextNodeOfElem(elem) {
  function findTextNode(node) {
    if (node.nodeType === 3) {
      return node;
    } else if (node.nodeType === 1 && node.childNodes.length > 0) {
      for (let child of node.childNodes) {
        const found = findTextNode(child);
        if (found) return found;
      }
    }
    return null;
  }

  const node = findTextNode(elem);

  if (node) {
    return (node.textContent || "").length;
  }

  return 0;
}

function setCursorPositionInElem(elem, position) {
  requestAnimationFrame(() => {
    try {
      function findTextNode(node) {
        if (node.nodeType === 3) {
          return node;
        } else if (node.nodeType === 1 && node.childNodes.length > 0) {
          for (let child of node.childNodes) {
            const found = findTextNode(child);
            if (found) return found;
          }
        }
        return null;
      }
      const textNode = findTextNode(elem);
      var range = document.createRange();
      var selection = window.getSelection();
      range.setStart(textNode, position);
      range.setEnd(textNode, position);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {}
  });
}

const focusOnNode = ({
  id,
  moveToEnd,
  moveToStart,
  preferNaturalMovement = true,
}) => {
  const elem = document.getElementById(`node-${id}`);

  if (elem) {
    // console.log(elem);

    if (moveToEnd) {
      elem.focus();

      const deets = getCursorDetails();
      if (deets && deets.totalRange) {
        setCursorPositionInElem(elem, deets.totalRange);
      }
    } else if (moveToStart) {
      elem.focus();
    } else if (preferNaturalMovement) {
      const deets = getCursorDetails();

      if (deets) {
        const { totalRange, cursorStart, cursorEnd } = deets;

        if (cursorStart === 0) {
          setCursorPositionInElem(elem, 0);
        } else if (cursorStart === totalRange) {
          const ndeets = getTotalRangeOfFirstTextNodeOfElem(elem);

          if (ndeets) {
            setCursorPositionInElem(elem, ndeets);
          } else {
            elem.focus();
          }
        } else {
          const ndeets = getTotalRangeOfFirstTextNodeOfElem(elem);
          if (ndeets) {
            setCursorPositionInElem(elem, Math.min(ndeets, cursorStart));
          } else {
            elem.focus();
          }
        }
      } else {
        elem.focus();
      }
    }
  }
};

const ContentEditable = ({
  id,
  val,
  setVal,
  classes,
  styles,
  onEnter,
  onTab,
  onShiftTab,
  onUpArrow,
  onDownArrow,
  onDeleteNode,
}) => {
  const contentEditableRef = useRef(null);
  const cursorPositionRef = useRef(null);
  const lastFormattedTextRef = useRef("");
  const formatTimeoutRef = useRef(null);

  // Simple function to get cursor position as a number
  const getCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentEditableRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Simple function to set cursor position
  const setCursorPosition = (pos) => {
    const el = contentEditableRef.current;
    let currentPos = 0;
    const selection = window.getSelection();
    const range = document.createRange();

    function processNode(node) {
      if (node.nodeType === 3) {
        const nextPos = currentPos + node.length;
        if (currentPos <= pos && nextPos >= pos) {
          range.setStart(node, pos - currentPos);
          range.setEnd(node, pos - currentPos);
          return true;
        }
        currentPos = nextPos;
      } else {
        for (let child of node.childNodes) {
          if (processNode(child)) return true;
        }
      }
      return false;
    }

    processNode(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Check if text needs formatting (contains **)
  const needsFormatting = (text) => {
    return text.includes("**");
  };

  // Format text with bold sections
  const formatDisplayText = useCallback((text) => {
    if (!text) return document.createTextNode("");

    // If no formatting needed, just return text node
    if (!needsFormatting(text)) {
      return document.createTextNode(text);
    }

    const fragment = document.createDocumentFragment();
    const parts = text.split(/(\*\*.*?\*\*)/g);

    parts.forEach((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        fragment.appendChild(document.createTextNode("**"));
        fragment.appendChild(strong);
        fragment.appendChild(document.createTextNode("**"));
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    return fragment;
  }, []);

  // Handle input changes
  const handleInput = (event) => {
    const newText = event.target.textContent;
    setVal(newText);

    // Only schedule formatting if text contains **
    if (needsFormatting(newText)) {
      if (formatTimeoutRef.current) {
        clearTimeout(formatTimeoutRef.current);
      }

      formatTimeoutRef.current = setTimeout(() => {
        if (!contentEditableRef.current) return;

        if (newText !== lastFormattedTextRef.current) {
          cursorPositionRef.current = getCursorPosition();

          contentEditableRef.current.innerHTML = "";
          contentEditableRef.current.appendChild(formatDisplayText(newText));

          requestAnimationFrame(() => {
            setCursorPosition(cursorPositionRef.current);
            cursorPositionRef.current = null;
          });

          lastFormattedTextRef.current = newText;
        }
      }, 100);
    }
  };

  useEffect(() => {
    const el = contentEditableRef.current;
    if (!el) return;

    // Skip if content is already correct
    if (el.textContent === val) return;

    cursorPositionRef.current = getCursorPosition();

    el.innerHTML = "";
    el.appendChild(formatDisplayText(val));

    requestAnimationFrame(() => {
      setCursorPosition(cursorPositionRef.current);
      cursorPositionRef.current = null;
    });

    lastFormattedTextRef.current = val;
  }, [val, formatDisplayText]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (formatTimeoutRef.current) {
        clearTimeout(formatTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter?.();
    } else if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        onShiftTab?.();
      } else {
        onTab?.();
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onUpArrow?.();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onDownArrow?.();
    } else if (event.key === "ArrowLeft") {
      if (getCursorPosition() === 0) {
        event.preventDefault();
        onUpArrow?.({ moveToEnd: true });
      }
    } else if (event.key === "ArrowRight") {
      if (
        getCursorPosition() === contentEditableRef.current?.textContent.length
      ) {
        event.preventDefault();
        onDownArrow?.({ moveToStart: true });
      }
    } else if (
      (event.key === "Backspace" || event.key === "Delete") &&
      (!val || val === "")
    ) {
      event.preventDefault();
      onDeleteNode?.();
    }
  };

  return (
    <div
      id={`node-${id}`}
      className={classes}
      contentEditable="true"
      ref={contentEditableRef}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      style={{
        wordBreak: "break-all",
        userSelect: "text",
        WebkitUserModify: "read-write-plaintext-only",
        ...styles,
      }}
      onBeforeInput={(event) => {
        if (event?.inputType?.startsWith("format")) {
          event.preventDefault();
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      tabIndex="-1"
    />
  );
};

// const ContentEditable = ({
//   id,
//   val,
//   setVal,
//   classes,
//   styles,
//   onEnter,
//   onTab,
//   onShiftTab,
//   onUpArrow,
//   onDownArrow,
//   onDeleteNode,
// }) => {
//   const contentEditableRef = useRef(null);
//   const lastCursorPosition = useRef(null);

//   // useEffect(() => {
//   //   if (contentEditableRef.current.textContent !== val) {
//   //     contentEditableRef.current.textContent = val;
//   //   }
//   // });

//   useEffect(() => {
//     const currentText = contentEditableRef.current.textContent;
//     if (currentText !== val) {
//       contentEditableRef.current.innerHTML = '';
//       const formattedContent = formatDisplayText(val);
//       contentEditableRef.current.appendChild(formattedContent);
//     }
//   }, [val]);

//   const handleKeyDown = (event) => {
//     if (event.key === "Enter") {
//       event.preventDefault();
//       if (onEnter) {
//         onEnter();
//       }
//     } else if (event.key === "Tab") {
//       event.preventDefault();
//       if (event.shiftKey) {
//         if (onShiftTab) {
//           onShiftTab();
//         }
//       } else {
//         if (onTab) {
//           onTab();
//         }
//       }
//     } else if (event.key === "ArrowUp") {
//       event.preventDefault();
//       if (onUpArrow) {
//         onUpArrow();
//       }
//     } else if (event.key === "ArrowDown") {
//       event.preventDefault();
//       if (onDownArrow) {
//         onDownArrow();
//       }
//     } else if (event.key === "ArrowLeft") {
//       const deets = getCursorDetails();

//       if (deets && deets.cursorStart === 0) {
//         event.preventDefault();

//         if (onUpArrow) {
//           onUpArrow({
//             moveToEnd: true,
//           });
//         }
//       }
//     } else if (event.key === "ArrowRight") {
//       const deets = getCursorDetails();

//       if (deets && deets.cursorStart === deets.totalRange) {
//         event.preventDefault();

//         if (onDownArrow) {
//           onDownArrow({
//             moveToStart: true,
//           });
//         }
//       }
//     } else if (event.key === "Backspace" || event.key === "Delete") {
//       if (val === "" || !val) {
//         event.preventDefault();
//         if (onDeleteNode) {
//           onDeleteNode();
//         }
//       }
//     }
//   };

//   // Format the display text while keeping original value intact
//   const formatDisplayText = (text) => {
//     const container = document.createDocumentFragment();
//     // Updated regex to capture the ** markers as well
//     const parts = text.split(/(\*\*.*?\*\*)/g);

//     parts.forEach((part) => {
//       if (part.startsWith('**') && part.endsWith('**')) {
//         // Keep the ** markers in text but make middle part bold
//         const textNode1 = document.createTextNode('**');
//         const strongElement = document.createElement('strong');
//         strongElement.textContent = part.slice(2, -2);
//         const textNode2 = document.createTextNode('**');

//         container.appendChild(textNode1);
//         container.appendChild(strongElement);
//         container.appendChild(textNode2);
//       } else {
//         container.appendChild(document.createTextNode(part));
//       }
//     });

//     return container;
//   };

//   // Function to get current cursor position
//   const getCursorPosition = () => {
//     const selection = window.getSelection();
//     if (selection.rangeCount === 0) return 0;

//     const range = selection.getRangeAt(0);
//     const preCaretRange = range.cloneRange();
//     preCaretRange.selectNodeContents(contentEditableRef.current);
//     preCaretRange.setEnd(range.endContainer, range.endOffset);
//     return preCaretRange.toString().length;
//   };

//    // Function to set cursor position
//    const setCursorPosition = (position) => {
//     const sel = window.getSelection();
//     const range = document.createRange();

//     let currentPos = 0;
//     let targetNode = null;
//     let targetOffset = 0;

//     const findPosition = (node) => {
//       if (targetNode) return;

//       if (node.nodeType === Node.TEXT_NODE) {
//         const nextPos = currentPos + node.length;
//         if (nextPos >= position) {
//           targetNode = node;
//           targetOffset = position - currentPos;
//         }
//         currentPos = nextPos;
//       } else {
//         Array.from(node.childNodes).forEach(findPosition);
//       }
//     };

//     findPosition(contentEditableRef.current);

//     if (targetNode) {
//       range.setStart(targetNode, targetOffset);
//       range.setEnd(targetNode, targetOffset);
//       sel.removeAllRanges();
//       sel.addRange(range);
//     }
//   };

//   return (
//     <div
//       id={`node-${id}`}
//       className={`${classes}`}
//       contentEditable="true"
//       ref={contentEditableRef}
//       onInput={(event) => {
//          // Get the cursor position before modifying the content
//   const cursorPosition = getCursorPosition();

//   // Capture the text content
//   const newText = event.target.textContent;

//   // Update the value in the parent component
//   setVal(newText);

//   // Avoid using innerHTML or completely clearing the content
//   // Instead, selectively format only the changed part
//   while (contentEditableRef.current.firstChild) {
//     contentEditableRef.current.removeChild(contentEditableRef.current.firstChild);
//   }

//   const formattedContent = formatDisplayText(newText);
//   contentEditableRef.current.appendChild(formattedContent);

//   // Restore the cursor position after content formatting
//   setCursorPosition(cursorPosition);
//       }}
//       onKeyDown={handleKeyDown}
//       style={{
//         wordBreak: "break-all",
//         userSelect: "text",
//         WebkitUserModify: "read-write-plaintext-only",
//       }}
//       onBeforeInput={(event) => {
//         if (event && event.inputType && event.inputType.startsWith('format')) {
//           event.preventDefault();
//         }
//       }}
//       onPaste={(event) => {
//         // Prevent formatted paste
//         event.preventDefault();
//         const text = event.clipboardData.getData('text/plain');
//         document.execCommand('insertText', false, text);
//       }}
//       tabIndex="-1"
//     />
//   );
// };

import AppWrapper from "./AppWraper";

const Node = ({
  node,
  onTextChange,
  addNewSibling,
  changeParentToElderSibling,
  makeSiblingToParent,
  focusOnPreviousNode,
  focusOnNextNode,
  level,
  toggleChecked,
  deleteThisNode,
  toggleCollapsed,
  hasChildren,
  keepCollapsed,
  zoomIntoNode,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      style={{
        display: "flex",
      }}
      draggable
      onDragStart={(e) => onDragStart(e, node.id)}
      onDragOver={(e) => onDragOver(e, node.id)}
      onDrop={(e) => onDrop(e, node.id)}
    >
      <div className="flex group relative">
        <div
          className="w-4 h-4 absolute -top-0 -left-4"
          onDragStart={(e) => onDragStart(e, node.id)}
        >
          {hasChildren ? (
            <a
              className={"w-4 mt-1 h-4 flex items-center cursor-pointer"}
              onClick={() => {
                if (keepCollapsed) {
                  // When node clicking is allowed. consider this equivalent to clicking on a node.
                  // Which node should be clicked? can be the most recent from parent or this node itself.
                  if (zoomIntoNode) {
                    zoomIntoNode();
                  }
                } else {
                  toggleCollapsed();
                }
              }}
            >
              {(node && node.collapsed) || keepCollapsed ? (
                <i
                  className={`ri-arrow-right-s-line text-gray-400 group-hover:text-gray-600 transition-colors duration-300`}
                ></i>
              ) : (
                <i
                  className={`ri-arrow-down-s-line text-gray-400 group-hover:text-gray-600 transition-colors duration-300`}
                ></i>
              )}
            </a>
          ) : null}
        </div>
        <div className="w-4 h-4 ">
          <a
            className="w-4 mt-1 h-4 flex group items-center cursor-pointer relative"
            onClick={() => {
              if (zoomIntoNode) {
                zoomIntoNode();
              }
            }}
          >
            <i
              className={`ri-checkbox-blank-circle-fill ${
                node.note_exists || node.file_id ? "hidden" : ""
              } ${node.checked ? "text-gray-500" : "text-gray-900"} ri-xxs`}
            ></i>

            <i
              className={`ri-quill-pen-fill ${
                node.note_exists ? "" : "hidden"
              } ${
                node.checked ? "text-gray-500" : "text-gray-900"
              } ri-sm absolute`}
              style={{
                left: "-0.185rem",
              }}
            ></i>

            <i
              className={`ri-attachment-2 ${node.file_id ? "" : "hidden"} ${
                node.checked ? "text-gray-500" : "text-gray-900"
              } ri-sm absolute`}
              style={{
                left: "-0.185rem",
              }}
            ></i>

            <i
              className={`ri-checkbox-blank-circle-fill ri-1x text-gray-300 -z-50 -inset-x-1/4 absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            ></i>
          </a>
        </div>
        {node.checked ? (
          <div className="w-4 h-4">
            <a
              className="w-4 mt-1 h-4 flex items-center cursor-pointer"
              onClick={() => {
                toggleChecked();
              }}
            >
              <i className={`ri-checkbox-fill text-blue-500 ri-xss`}></i>
            </a>
          </div>
        ) : (
          <div className="w-0 group-hover:w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out overflow-hidden group-hover:overflow-visible">
            <a
              className="w-4 mt-1 h-4 flex items-center cursor-pointer"
              onClick={() => {
                toggleChecked();
              }}
            >
              <i className="ri-checkbox-blank-line text-gray-500 hover:text-gray-900 ri-xss"></i>
            </a>
          </div>
        )}
      </div>
      <div
        className="grow ml-1"
        key={node.id}
        style={{
          height: "auto",
          minHeight: "28px",
        }}
      >
        <ContentEditable
          classes={`leading-6 max-w-2xl font-medium ${
            node.checked ? "text-gray-500 " : ""
          }`}
          id={node.id}
          val={node.text}
          setVal={(val) => {
            onTextChange(val);
          }}
          onEnter={() => {
            console.log("enter is pressed");
            addNewSibling();
          }}
          onTab={() => {
            console.log("tab is pressed");
            changeParentToElderSibling();
          }}
          onShiftTab={() => {
            makeSiblingToParent();
          }}
          onUpArrow={(
            d = {
              moveToEnd: false,
            }
          ) => {
            focusOnPreviousNode(d);
          }}
          onDownArrow={(
            d = {
              moveToStart: false,
            }
          ) => {
            focusOnNextNode(d);
          }}
          onDeleteNode={() => {
            focusOnPreviousNode({
              moveToEnd: true,
            });
            deleteThisNode();
          }}
        />
      </div>
    </div>
  );
};

const Parent = ({
  nodeDBMap,
  nodeUIMap,
  id,
  onTextChange,
  onlyRenderChildren,
  onNewNode,
  selectedListId,
  focusOnNode,
  level,
  toggleChecked,
  toggleCollapsed,
  deleteNode,
  zoomIntoNode,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div key={id}>
      {!onlyRenderChildren ? (
        <Node
          level={level}
          node={nodeDBMap[id]}
          onTextChange={(d) => onTextChange({ id, text: d })}
          addNewSibling={() => {
            const hasChildren =
              nodeUIMap[id] &&
              nodeUIMap[id].children &&
              nodeUIMap[id].children.length > 0;

            const parentsChildren = nodeUIMap[nodeDBMap[id].parent_id]
              ? nodeUIMap[nodeDBMap[id].parent_id].children || []
              : [];

            const isItLastChild =
              parentsChildren.indexOf(id) === parentsChildren.length - 1;

            const currentSibling = isItLastChild
              ? null
              : parentsChildren[parentsChildren.indexOf(id) + 1];

            const firstChild = hasChildren ? nodeUIMap[id].children[0] : null;

            const isCollapsed = hasChildren && !!nodeDBMap[id]?.collapsed;

            onNewNode({
              id: Date.now().toString(16),
              parent_id:
                hasChildren && !isCollapsed ? id : nodeDBMap[id].parent_id,
              pos:
                hasChildren && !isCollapsed
                  ? (0 + nodeDBMap[firstChild].pos) / 2
                  : isItLastChild
                  ? nodeDBMap[id].pos + 1
                  : (nodeDBMap[id].pos + nodeDBMap[currentSibling].pos) / 2,
              text: "",
              note_id: getUUID(),
              new: true,
            });
          }}
          changeParentToElderSibling={() => {
            const parentsChildren = nodeUIMap[nodeDBMap[id].parent_id]
              ? nodeUIMap[nodeDBMap[id].parent_id].children || []
              : [];

            const isItFirstChild = parentsChildren.indexOf(id) === 0;

            const currentElderSister = isItFirstChild
              ? null
              : parentsChildren[parentsChildren.indexOf(id) - 1];

            const currentElderSistersLastChild =
              currentElderSister &&
              nodeUIMap[currentElderSister] &&
              nodeUIMap[currentElderSister].children &&
              nodeUIMap[currentElderSister].children.length > 0
                ? nodeUIMap[currentElderSister].children[
                    nodeUIMap[currentElderSister].children.length - 1
                  ]
                : null;

            if (currentElderSister) {
              onNewNode({
                id: id,
                parent_id: currentElderSister,
                pos: currentElderSistersLastChild
                  ? nodeDBMap[currentElderSistersLastChild].pos + 1
                  : 1,
                posChange: true,
              });
            }
          }}
          makeSiblingToParent={() => {
            const parent = nodeDBMap[id].parent_id;
            if (parent === selectedListId) {
              // already at the most root. ignore
            } else {
              const parentsParent = nodeDBMap[parent].parent_id;
              const parentsParentsChildren =
                (nodeUIMap[parentsParent] || {}).children || [];

              const elderSister = parent;

              const elderSistersNextSister =
                parentsParentsChildren.indexOf(elderSister) !== -1 &&
                parentsParentsChildren.indexOf(elderSister) !==
                  parentsParentsChildren.length - 1
                  ? parentsParentsChildren[
                      parentsParentsChildren.indexOf(elderSister) + 1
                    ]
                  : null;

              onNewNode({
                id: id,
                parent_id: parentsParent,
                pos: elderSistersNextSister
                  ? (nodeDBMap[elderSister].pos +
                      nodeDBMap[elderSistersNextSister].pos) /
                    2
                  : nodeDBMap[elderSister].pos + 1,
                posChange: true,
              });
            }
          }}
          focusOnPreviousNode={(
            { moveToEnd = false } = {
              moveToEnd: false,
            }
          ) => {
            const parent = nodeDBMap[id].parent_id;

            const parentsChildren =
              nodeUIMap[parent] && nodeUIMap[parent].children
                ? nodeUIMap[parent].children || []
                : [];

            const isItFirstChild = parentsChildren.indexOf(id) <= 0;

            if (isItFirstChild) {
              focusOnNode({ id: parent, moveToEnd: !!moveToEnd });
            } else {
              const elderSibling =
                parentsChildren[parentsChildren.indexOf(id) - 1];

              const getLastNode = (c) => {
                if (
                  !nodeUIMap[c] ||
                  !nodeUIMap[c].children ||
                  nodeUIMap[c].children.length === 0 ||
                  nodeDBMap[c].collapsed
                ) {
                  return c;
                } else {
                  return getLastNode(
                    nodeUIMap[c].children[nodeUIMap[c].children.length - 1]
                  );
                }
              };

              focusOnNode({
                id: nodeDBMap[elderSibling].collapsed
                  ? elderSibling
                  : getLastNode(elderSibling),
                moveToEnd: !!moveToEnd,
              });
            }
          }}
          focusOnNextNode={({ moveToStart = false }) => {
            const currentNodesChildren = nodeUIMap[id]?.children;

            if (
              currentNodesChildren &&
              currentNodesChildren.length > 0 &&
              !nodeDBMap[id].collapsed
            ) {
              focusOnNode({
                id: currentNodesChildren[0],
                moveToStart: !!moveToStart,
              });
              return;
            }

            const getNext = (c) => {
              const parent = nodeDBMap[c].parent_id;

              if (parent) {
                const parentsChildren =
                  nodeUIMap[parent] && nodeUIMap[parent].children
                    ? nodeUIMap[parent].children || []
                    : [];

                if (
                  parentsChildren.indexOf(c) > -1 &&
                  parentsChildren.indexOf(c) < parentsChildren.length - 1
                ) {
                  return parentsChildren[parentsChildren.indexOf(c) + 1];
                }

                return getNext(parent);
              }
            };

            const next = getNext(id);

            if (next) {
              focusOnNode({ id: next, moveToStart: !!moveToStart });
            }
          }}
          toggleChecked={() => {
            toggleChecked({
              id,
              checked: !nodeDBMap[id].checked,
              checked_date: Date.now(),
            });
          }}
          toggleCollapsed={() => {
            toggleCollapsed({
              id,
              collapsed: !nodeDBMap[id].collapsed,
            });
          }}
          deleteThisNode={() => {
            deleteNode({
              id,
            });
          }}
          hasChildren={
            nodeUIMap[id] &&
            nodeUIMap[id].children &&
            nodeUIMap[id].children.length > 0
          }
          keepCollapsed={
            (level < MAX_LEVEL &&
              level >= 2 &&
              nodeUIMap[id] &&
              nodeUIMap[id].children &&
              nodeUIMap[id].children.length >= MAX_ITEMS_IN_LEVEL2) ||
            level >= MAX_LEVEL
          }
          zoomIntoNode={() =>
            zoomIntoNode({
              id,
            })
          }
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ) : null}
      {(!nodeDBMap[id].collapsed || id === selectedListId) &&
      nodeUIMap[id] &&
      nodeUIMap[id].children &&
      nodeUIMap[id].children.length > 0 &&
      (level < 2 ||
        (level < MAX_LEVEL &&
          level >= 2 &&
          nodeUIMap[id].children.length < MAX_ITEMS_IN_LEVEL2)) ? (
        <div className={onlyRenderChildren ? "pl-0" : "pl-4"}>
          {nodeUIMap[id].children.map((childId) => {
            return (
              <Parent
                key={childId}
                nodeDBMap={nodeDBMap}
                nodeUIMap={nodeUIMap}
                id={childId}
                onTextChange={(d) => onTextChange(d)}
                onNewNode={(d) => onNewNode(d)}
                changeParentToElderSibling={(d) => onNewParentToElderSibling(d)}
                selectedListId={selectedListId}
                focusOnNode={(d) => focusOnNode(d)}
                level={level + 1}
                toggleChecked={(d) => toggleChecked(d)}
                toggleCollapsed={(d) => toggleCollapsed(d)}
                deleteNode={(d) => deleteNode(d)}
                zoomIntoNode={(d) => zoomIntoNode(d)}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

function FileWrapper({ fileLoading, fileSuccess, fileError, fileUrl }) {
  if (fileLoading) {
    return (
      <div className="animate-spin">
        <i className="ri-reset-right-line"></i>
      </div>
    );
  } else if (fileError) {
    return (
      <div className="">
        <div className="p-4">
          <div className="flex items-start">
            <div className="shrink-0">
              <i className="ri-error-warning-line"></i>
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900">
                Error loading file
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (fileSuccess) {
    const ErrorComponent = () => {
      return (
        <div>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            Download the file directly
          </a>
        </div>
      );
    };

    if (
      fileUrl.endsWith(".png") ||
      fileUrl.endsWith(".jpg") ||
      fileUrl.endsWith(".jpeg")
    ) {
      return <img src={fileUrl} />;
    } else if (fileUrl.endsWith(".pdf")) {
      return (
        <iframe
          src={`https://docs.google.com/gview?url=${fileUrl}&embedded=true`}
          width="100%"
          height="100%"
          frameBorder="0"
        />
      );
    } else if (
      fileUrl.endsWith(".mp4") ||
      fileUrl.endsWith(".mov") ||
      fileUrl.endsWith(".avi") ||
      fileUrl.endsWith(".wmv") ||
      fileUrl.endsWith(".flv") ||
      fileUrl.endsWith(".webm")
    ) {
      return <video src={fileUrl} controls />;
    } else if (
      fileUrl.endsWith(".mp3") ||
      fileUrl.endsWith(".wav") ||
      fileUrl.endsWith(".ogg") ||
      fileUrl.endsWith(".flac") ||
      fileUrl.endsWith(".aac")
    ) {
      return <audio src={fileUrl} controls />;
    } else {
      return <ErrorComponent />;
    }
  } else {
    return null;
  }
}

function ListContainer(props) {
  const dispatch = useDispatch();
  const userState = useAppSelector(selectUser);
  const { user } = userState;
  const listState = useAppSelector(selectList);
  const { nodeDBMap, nodeUIMap, selectedListId, lastSuccessfulCallTime } =
    listState;
  const [updatedNodeIds, setUpdatedNodeIds] = useState({});

  const notesState = useAppSelector(selectNotes);
  const filesState = useAppSelector(selectFiles);
  const { changed } = useTreeChanges(userState);

  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

  const fileLoading =
    filesState.filesMap[nodeDBMap[selectedListId]?.file_id]?.status ===
    STATUS.RUNNING;
  const fileError =
    filesState.filesMap[nodeDBMap[selectedListId]?.file_id]?.status ===
    STATUS.ERROR;
  const fileSuccess =
    filesState.filesMap[nodeDBMap[selectedListId]?.file_id]?.status ===
    STATUS.SUCCESS;

  const tiptapRef = useRef(null);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (Object.keys(updatedNodeIds).length > 0) {
        // Most modern browsers ignore custom messages and just display a standard warning message
        // However, you still need to set returnValue to something
        event.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
      }
    };

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [updatedNodeIds]); // Dependency array ensures the effect runs only when hasUnsavedChanges changes

  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(updatedNodeIds || {}).length > 0) {
        const keys = { ...updatedNodeIds };

        dispatch(
          batchPushNodes({
            nodes: [
              ...[...Object.keys(keys), selectedListId].map(
                (key) => nodeDBMap[key]
              ),
              ...[...Object.keys(keys), selectedListId].map(
                (key) => nodeDBMap[nodeDBMap[key].parent_id]
              ),
            ].filter((x) => x),
          })
        );
        setUpdatedNodeIds({});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [updatedNodeIds, nodeDBMap, selectedListId]);

  const lastSuccessfulCallTimeRef = useRef(lastSuccessfulCallTime);

  // Update ref whenever lastSuccessfulCallTime changes
  useEffect(() => {
    lastSuccessfulCallTimeRef.current = lastSuccessfulCallTime;
  }, [lastSuccessfulCallTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(
        getList({
          id: selectedListId,
          after: lastSuccessfulCallTimeRef.current || 0,
        })
      );

      // if this node has a file_id and if that file_id is not in the filesState, then get the file
      if (
        nodeDBMap[selectedListId]?.file_id &&
        !filesState.filesMap[nodeDBMap[selectedListId]?.file_id]
      ) {
        dispatch(
          getFile({
            file_id: nodeDBMap[selectedListId]?.file_id,
            user_id: props.userId,
          })
        );
      }
    }, 10000);

    // Clean up the interval
    return () => clearInterval(interval);
  }, [selectedListId]); // Notice that lastSuccessfulCallTime is not in the dependency array here

  useEffect(() => {
    dispatch(
      getList({
        id: selectedListId,
        after: 0,
      })
    );
    // if this node has a file_id and if that file_id is not in the filesState, then get the file
    if (
      nodeDBMap[selectedListId]?.file_id &&
      !filesState.filesMap[nodeDBMap[selectedListId]?.file_id]
    ) {
      dispatch(
        getFile({
          file_id: nodeDBMap[selectedListId]?.file_id,
          user_id: props.userId,
        })
      );
    }
  }, [selectedListId]);

  const isUserPro = !!(user.data || {}).pro;

  useEffect(() => {
    setTimeout(() => {
      focusOnNode({ id: selectedListId, moveToEnd: true });
    }, 200);
  }, []);

  const firstParentOfCurrentSelection =
    nodeDBMap[selectedListId] && nodeDBMap[nodeDBMap[selectedListId].parent_id]
      ? nodeDBMap[selectedListId].parent_id
      : null;
  const secondParentOfCurrentSelection =
    firstParentOfCurrentSelection &&
    nodeDBMap[nodeDBMap[firstParentOfCurrentSelection].parent_id]
      ? nodeDBMap[firstParentOfCurrentSelection].parent_id
      : null;
  const thirdParentOfCurrentSelection =
    secondParentOfCurrentSelection &&
    nodeDBMap[nodeDBMap[secondParentOfCurrentSelection].parent_id]
      ? nodeDBMap[secondParentOfCurrentSelection].parent_id
      : null;

  const upsertHelper = (d) => {
    setUpdatedNodeIds({
      ...updatedNodeIds,
      [d.id]: true,
    });

    dispatch(upsertListNode(d));
  };

  // Drag handlers
  const handleDragStart = (e, id) => {
    draggedNodeId = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetNodeId) => {
    e.preventDefault(); // Needed to allow drop
    if (targetNodeId !== draggedNodeId) {
      dragOverNodeId = targetNodeId;

      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;

      // Identify if the drop is above or below
      dropPosition = offsetY < rect.height / 2 ? "above" : "below";
    }
  };

  const handleDrop = (e, targetNodeId) => {
    e.preventDefault();
    if (!draggedNodeId || !targetNodeId || draggedNodeId === targetNodeId) {
      return;
    }

    // Find the relevant node positions
    const draggedNode = nodeDBMap[draggedNodeId];
    const targetNode = nodeDBMap[targetNodeId];
    const targetParentId = targetNode.parent_id;

    // Calculate new position
    const targetIndex =
      nodeUIMap[targetParentId].children.indexOf(targetNodeId);
    const beforeNode =
      dropPosition === "above"
        ? nodeUIMap[targetParentId].children[targetIndex - 1]
        : targetNodeId;
    const afterNode =
      dropPosition === "below"
        ? nodeUIMap[targetParentId].children[targetIndex + 1]
        : targetNodeId;
    const newPos = calculateNewPosition(draggedNode, beforeNode, afterNode);

    // Dispatch changes
    upsertHelper({
      id: draggedNodeId,
      parent_id: targetParentId,
      pos: newPos,
      posChange: true,
    });

    draggedNodeId = null;
    dragOverNodeId = null;
    dropPosition = null;
  };

  const calculateNewPosition = (draggedNode, beforeNode, afterNode) => {
    const beforePos = beforeNode ? nodeDBMap[beforeNode].pos : 0;
    const afterPos = afterNode ? nodeDBMap[afterNode].pos : MAX_POS;
    return (beforePos + afterPos) / 2;
  };

  return (
    <AppWrapper {...props} listPage={true}>
      {token && props.userId ? (
        <div className="pt-6 pb-6 md:pb-0 h-full flex flex-col list-canvas">
          <nav className="flex px-6" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-1">
              {thirdParentOfCurrentSelection ? (
                <li>
                  <div className="flex items-center">
                    <a
                      onClick={() => {
                        dispatch(
                          changeSelectedNode({
                            id: thirdParentOfCurrentSelection,
                          })
                        );
                      }}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {nodeDBMap[thirdParentOfCurrentSelection].text}
                    </a>
                    <div className="flex flex-col justify-center mt-0.5">
                      <i className="ri-arrow-right-s-line text-gray-500"></i>
                    </div>
                  </div>
                </li>
              ) : null}
              {secondParentOfCurrentSelection ? (
                <li>
                  <div className="flex items-center">
                    <a
                      onClick={() => {
                        dispatch(
                          changeSelectedNode({
                            id: secondParentOfCurrentSelection,
                          })
                        );
                      }}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {nodeDBMap[secondParentOfCurrentSelection].text}
                    </a>
                    <div className="flex flex-col justify-center mt-0.5">
                      <i className="ri-arrow-right-s-line text-gray-500"></i>
                    </div>
                  </div>
                </li>
              ) : null}
              {firstParentOfCurrentSelection ? (
                <li>
                  <div className="flex items-center">
                    <a
                      onClick={() => {
                        dispatch(
                          changeSelectedNode({
                            id: firstParentOfCurrentSelection,
                          })
                        );
                      }}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {nodeDBMap[firstParentOfCurrentSelection].text}
                    </a>
                    <div className="flex flex-col justify-center mt-0.5">
                      <i className="ri-arrow-right-s-line text-gray-500"></i>
                    </div>
                  </div>
                </li>
              ) : null}
            </ol>
          </nav>

          <div className="flex items-center">
            <ContentEditable
              id={selectedListId}
              classes={"text-xl font-bold mb-2 pl-6 pr-2 w-fit"}
              val={nodeDBMap[selectedListId]?.text || ""}
              setVal={(val) => {
                upsertHelper({
                  id: selectedListId,
                  text: val,
                });
              }}
              onEnter={() => {
                const id = Date.now().toString(16);
                upsertHelper({
                  id,
                  parent_id: selectedListId,
                  pos:
                    nodeUIMap[selectedListId] &&
                    nodeUIMap[selectedListId].children &&
                    nodeUIMap[selectedListId].children.length > 0
                      ? (nodeDBMap[selectedListId].pos + 0) / 2
                      : 1,
                  text: "",
                  new: true,
                  note_id: getUUID(),
                });

                setTimeout(() => {
                  focusOnNode({ id });
                }, 200);
              }}
              onDownArrow={() => {
                if (
                  nodeUIMap[selectedListId] &&
                  nodeUIMap[selectedListId].children &&
                  nodeUIMap[selectedListId].children.length > 0
                ) {
                  focusOnNode({
                    id: nodeUIMap[selectedListId].children[0],
                  });
                }
              }}
            />
            <div
              className={`flex flex-col mb-1.5 cursor-pointer ${
                selectedListId === "home" ? "hidden" : ""
              }`}
              onClick={() => {
                upsertHelper({
                  id: selectedListId,
                  pinned_pos: nodeDBMap[selectedListId]?.pinned_pos
                    ? null
                    : Date.now(),
                });
              }}
            >
              {nodeDBMap[selectedListId]?.pinned_pos ? (
                <div className="flex items-center hover:text-gray-700">
                  <i className="ri-star-fill text-gray-500"></i>
                </div>
              ) : (
                <div className="flex items-center hover:text-gray-700">
                  <i className="ri-star-line text-gray-500"></i>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-grow overflow-y-hidden flex-col md:flex-row border-t-2 border-gray-200">
            <div className="flex flex-col h-full overflow-y-hidden md:w-1/3 md:min-w-96 border-b-2 border-gray-200 md:border-b-0 md:border-r-2 md:border-gray-200 ">
              <div
                className="pl-6 list-parent pt-6 md:pr-6 overflow-y-auto pb-6"
                style={{ height: "calc(100% - 64px)" }}
              >
                <Parent
                  nodeUIMap={nodeUIMap}
                  nodeDBMap={nodeDBMap}
                  id={selectedListId}
                  onTextChange={({ id, text }) => {
                    upsertHelper({
                      id,
                      text,
                    });
                  }}
                  onlyRenderChildren={true}
                  onNewNode={(d) => {
                    upsertHelper(d);
                    setTimeout(() => {
                      focusOnNode({ id: d.id });
                    }, 50);
                  }}
                  selectedListId={selectedListId}
                  focusOnNode={(d) => {
                    focusOnNode(d);
                  }}
                  level={0}
                  toggleChecked={(d) => {
                    upsertHelper(d);
                  }}
                  toggleCollapsed={(d) => {
                    upsertHelper(d);
                  }}
                  deleteNode={(d) => {
                    upsertHelper({
                      id: d.id,
                      parent_id: "limbo",
                      posChange: true,
                    });
                  }}
                  zoomIntoNode={(d) => {
                    dispatch(
                      changeSelectedNode({
                        id: d.id,
                      })
                    );
                  }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              </div>
              <div
                className="h-16 overflow-y-hidden max-h-16 opacity-50 uppy-parent"
                style={{
                  fontFamily: "Satoshi !important",
                }}
              >
                <UppyComponent
                  maxFileSize={20 * 1024 * 1024}
                  autoReset={true}
                  autoProceed={true}
                  maxNumberOfFiles={5}
                  folder={`list/${props.userId}/files`}
                  allowedFileTypes={[
                    "image/*", // Allow all image types (e.g., .jpg, .png, .gif)
                    "application/pdf", // PDF files
                    "text/plain", // Text files (.txt)
                    "application/vnd.ms-excel", // Old Excel format (.xls)
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // New Excel format (.xlsx)
                  ]}
                  onResults={(res) => {
                    console.log("res", res);
                    for (var i = 0; i < res.urls.length; i++) {
                      const url = res.urls[i];
                      const name = res.names[i];
                      const id = Date.now().toString(16);
                      const file_id = getUUID();

                      const hasChildren =
                        nodeUIMap[selectedListId] &&
                        nodeUIMap[selectedListId].children &&
                        nodeUIMap[selectedListId].children.length > 0;

                      const pos = hasChildren
                        ? (nodeDBMap[
                            nodeUIMap[selectedListId].children[
                              nodeUIMap[selectedListId].children.length - 1
                            ]
                          ]?.pos || 0) + 1
                        : 1;

                      // add a new file node.
                      upsertHelper({
                        id,
                        parent_id: selectedListId,
                        pos,
                        text: name,
                        new: true,
                        note_id: getUUID(),
                        file_id,
                      });

                      // add the file to the files state.
                      dispatch(
                        addFile({
                          id: file_id,
                          url,
                          name,
                          user_id: props.userId,
                        })
                      );

                      setTimeout(() => {
                        focusOnNode({ id });
                      }, 200);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col h-full overflow-y-auto md:flex-grow text-black font-medium md:p-4">
              {nodeDBMap[selectedListId]?.file_id ? (
                <FileWrapper
                  fileLoading={fileLoading}
                  fileSuccess={fileSuccess}
                  fileError={fileError}
                  fileUrl={
                    filesState.filesMap[nodeDBMap[selectedListId]?.file_id]
                      ?.file?.url
                  }
                />
              ) : (
                <Tiptap
                  ref={tiptapRef}
                  liveUrl={
                    window.location.origin +
                    "/public/note/" +
                    nodeDBMap[selectedListId]?.note_id +
                    "/" +
                    shortHash(
                      nodeDBMap[selectedListId]?.note_id,
                      process.env.REACT_APP_ENCRYPTION_KEY
                    )
                  }
                  reviewerMode={false}
                  usecase="list"
                  className="h-full flex-grow p-6"
                  note={
                    notesState.notesMap[
                      nodeDBMap[selectedListId]?.note_id || ""
                    ]
                  }
                  key={nodeDBMap[selectedListId]?.note_id}
                  token={token}
                  userId={props.userId}
                  email={props.email}
                  name={props.name}
                  docId={nodeDBMap[selectedListId]?.note_id}
                  savedContent={
                    notesState.notesMap[nodeDBMap[selectedListId]?.note_id]
                      ?.content || ""
                  }
                  enableServerSync={true}
                  mandatoryH1={false}
                  disallowH1={true}
                  onChange={(html) => {
                    const isEmpty = (content) =>
                      !content || content == "<h1></h1>";
                    if (
                      (isEmpty(html) &&
                        isEmpty(
                          notesState.notesMap[
                            nodeDBMap[selectedListId]?.note_id
                          ]?.content || ""
                        )) ||
                      html ===
                        notesState.notesMap[nodeDBMap[selectedListId]?.note_id]
                          ?.content ||
                      ""
                    ) {
                      return;
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppWrapper>
  );
}

export default ListContainer;
