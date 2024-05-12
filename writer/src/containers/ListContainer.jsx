import React, { useEffect, useState, useRef } from "react";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import useCookie from "../hooks/useCookie";
import UppyComponent from "../components/Uppy";
import useLocalStorage from "../hooks/useLocalStorage";
import { selectUser, selectList } from "../selectors";
import {
  addCustomDomain,
  updateUser,
  upsertListNode,
  changeSelectedNode,
  getList,
  batchPushNodes,
} from "../actions";
import useTreeChanges from "tree-changes-hook";
import Tiptap from "../components/Tiptap";
import { Switch } from "@headlessui/react";
import { debounce } from "lodash";

const MAX_POS = 10000;
const MAX_LEVEL = 10;
const MAX_ITEMS_IN_LEVEL2 = 100;

function getRandomNonce() {
  return Math.floor(Math.random() * 10000) / 10000;
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

  useEffect(() => {
    if (contentEditableRef.current.textContent !== val) {
      contentEditableRef.current.textContent = val;
    }
  });

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (onEnter) {
        onEnter();
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        if (onShiftTab) {
          onShiftTab();
        }
      } else {
        if (onTab) {
          onTab();
        }
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (onUpArrow) {
        onUpArrow();
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (onDownArrow) {
        onDownArrow();
      }
    } else if (event.key === "ArrowLeft") {
      const deets = getCursorDetails();

      if (deets && deets.cursorStart === 0) {
        event.preventDefault();

        if (onUpArrow) {
          onUpArrow({
            moveToEnd: true,
          });
        }
      }
    } else if (event.key === "ArrowRight") {
      const deets = getCursorDetails();

      if (deets && deets.cursorStart === deets.totalRange) {
        event.preventDefault();

        if (onDownArrow) {
          onDownArrow({
            moveToStart: true,
          });
        }
      }
    } else if (event.key === "Backspace" || event.key === "Delete") {
      if (val === "" || !val) {
        event.preventDefault();
        if (onDeleteNode) {
          onDeleteNode();
        }
      }
    }
  };

  return (
    <div
      id={`node-${id}`}
      className={`${classes}`}
      contentEditable="true"
      ref={contentEditableRef}
      onInput={(event) => {
        setVal(event.target.textContent);
      }}
      onKeyDown={handleKeyDown}
      style={{
        wordBreak: "break-all",
      }}
      tabIndex="-1"
    />
  );
};

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
}) => {
  return (
    <div
      style={{
        display: "flex",
      }}
    >
      <div className="flex group relative">
        <div className="w-4 h-4 absolute -top-0 -left-4">
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
              {node.collapsed || keepCollapsed ? (
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
                node.checked ? "text-gray-500" : "text-gray-900"
              } ri-xxs`}
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
          minHeight: "20px",
        }}
      >
        <ContentEditable
          classes={`leading-6 ${node.checked ? "text-gray-500 " : ""}`}
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

            const isCollapsed = hasChildren && !!nodeDBMap[id].collapsed;

            onNewNode({
              id: Date.now().toString(16),
              parent_id:
                hasChildren && !isCollapsed ? id : nodeDBMap[id].parent_id,
              pos:
                hasChildren && !isCollapsed
                  ? (0 + nodeDBMap[firstChild].pos) / 2 + getRandomNonce()
                  : isItLastChild
                  ? (nodeDBMap[id].pos + MAX_POS) / 2 + getRandomNonce()
                  : (nodeDBMap[id].pos + nodeDBMap[currentSibling].pos) / 2 +
                    getRandomNonce(),
              text: "",
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
                  ? (nodeDBMap[currentElderSistersLastChild].pos + MAX_POS) /
                      2 +
                    getRandomNonce()
                  : 1 + getRandomNonce(),
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
                      2 +
                    getRandomNonce()
                  : (nodeDBMap[elderSister].pos + MAX_POS) / 2 +
                    getRandomNonce(),
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
        />
      ) : null}
      {!nodeDBMap[id].collapsed &&
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
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

function ListContainer(props) {
  const dispatch = useDispatch();
  const userState = useAppSelector(selectUser);
  const { user } = userState;
  const listState = useAppSelector(selectList);
  const { nodeDBMap, nodeUIMap, selectedListId, lastSuccessfulCallTime } =
    listState;
  const [updatedNodeIds, setUpdatedNodeIds] = useState({});

  const { changed } = useTreeChanges(userState);

  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

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
  }, [updatedNodeIds]);

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
  }, [selectedListId]);

  const isUserPro = !!(user.data || {}).pro;

  useEffect(() => {
    setTimeout(() => {
      focusOnNode({ id: selectedListId, moveToEnd: true });
    }, 200);
  }, []);

  const firstParentOfCurrentSelection = nodeDBMap[
    nodeDBMap[selectedListId].parent_id
  ]
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

  return (
    <AppWrapper {...props} listPage={true}>
      {token && props.userId ? (
        <div className="p-6 h-full overflow-y-auto">
          <nav className="flex" aria-label="Breadcrumb">
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

          <ContentEditable
            id={selectedListId}
            classes={"text-xl font-bold"}
            val={nodeDBMap[selectedListId].text}
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
                    ? (nodeDBMap[selectedListId].pos + 0) / 2 + getRandomNonce()
                    : 1 + getRandomNonce(),
                text: "",
                new: true,
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
          />
        </div>
      ) : null}
    </AppWrapper>
  );
}

export default ListContainer;
