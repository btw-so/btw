import React, { useEffect, useState } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { STATUS } from "../literals";
import useLocalStorage from "../hooks/useLocalStorage";
import {
  changeSelectedNode,
  getPinnedNodes,
  upsertListNode,
  batchPushNodes,
  searchNodes,
} from "../actions";
import MobileTabBar from "./MobileTabBar";

function Sidebar(props) {
  const location = useLocation();
  const is4000Page = !!props.is4000Page;
  const isListPage = !!props.isListPage;
  const isIntelligencePage = !!props.isIntelligencePage;
  const showSelectedNode = !is4000Page && !isIntelligencePage && !props.settingsPage;
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const pinnedNodes = useAppSelector((state) => state.list.pinnedNodes);
  const selectedListId = useAppSelector((state) => state.list.selectedListId);
  const nodeDBMap = useAppSelector((state) => state.list.nodeDBMap);
  const [updatedNodeIds, setUpdatedNodeIds] = useState({});
  const searchResults = useAppSelector((state) => state.list.searchNodes);

  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOverNodeId, setDragOverNodeId] = useState(null);

  const handleDragStart = (e, node) => {
    // Check if this is the first node in the sorted list
    const sortedNodes = [...pinnedNodes.data].sort(
      (a, b) => a.pinned_pos - b.pinned_pos
    );
    if (sortedNodes.length > 0 && sortedNodes[0].id === node.id) {
      // Prevent dragging the first node
      e.preventDefault();
      return;
    }

    setDraggedNode(node);
    e.dataTransfer.setData("text/plain", node.id);
    // Add a ghost image effect
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, nodeId) => {
    e.preventDefault();
    setDragOverNodeId(nodeId);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDragOverNodeId(null);
  };

  const upsertHelper = (d) => {
    setUpdatedNodeIds({
      ...updatedNodeIds,
      [d.id]: true,
    });

    dispatch(upsertListNode(d));
  };

  const handleDrop = (e, targetNode) => {
    e.preventDefault();
    if (!draggedNode || draggedNode.id === targetNode.id) return;

    const sortedNodes = [...pinnedNodes.data].sort(
      (a, b) => a.pinned_pos - b.pinned_pos
    );
    const sourceIndex = sortedNodes.findIndex(
      (node) => node.id === draggedNode.id
    );
    const targetIndex = sortedNodes.findIndex(
      (node) => node.id === targetNode.id
    );

    // Calculate new position
    let newPosition;

    if (targetIndex === sortedNodes.length - 1) {
      // If dropped on the last item
      newPosition = sortedNodes[targetIndex].pinned_pos + 1;
    } else {
      // If dropped between two items
      const nextNode = sortedNodes[targetIndex + 1];
      newPosition =
        (sortedNodes[targetIndex].pinned_pos + nextNode.pinned_pos) / 2;
    }

    // Update the dragged node with new position
    const updatedNode = {
      ...draggedNode,
      pinned_pos: newPosition,
    };

    // Update in Redux store
    const updatedNodes = pinnedNodes.data.map((node) =>
      node.id === draggedNode.id ? updatedNode : node
    );

    // If the node exists in nodeDBMap, update it in the database
    if (nodeDBMap && nodeDBMap[draggedNode.id]) {
      const nodeToUpdate = {
        ...nodeDBMap[draggedNode.id],
        pinned_pos: newPosition,
      };
      upsertHelper(nodeToUpdate);
    }

    // Reset drag state
    setDraggedNode(null);
    setDragOverNodeId(null);
  };

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
            ].filter((x) => x),
          })
        );
        setUpdatedNodeIds({});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [updatedNodeIds, nodeDBMap, selectedListId]);

  // every 1 minute, get the pinned nodes
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(getPinnedNodes({ user_id: props.userId }));
    }, 60000);
    return () => clearInterval(interval);
  }, [props.userId]);

  useEffect(() => {
    dispatch(getPinnedNodes({ user_id: props.userId }));
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      const handler = setTimeout(() => {
        dispatch(
          searchNodes({
            user_id: props.userId,
            query: searchTerm,
          })
        );
      }, 400); // 400ms debounce
      return () => clearTimeout(handler);
    }
    // Optionally, you can clear search results if searchTerm is less than 3
    // else do nothing
  }, [searchTerm, props.userId, dispatch]);

  const searchResultsNodes =
    searchResults.status === STATUS.SUCCESS ? searchResults.data?.nodes : [];

  if (token) {
    return (
      <>
        <div className="space-x-2 w-full mb-2 border-gray-100 sidebar-toolkit flex items-center">
          <div className="flex-grow">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <div>
                  <div className="">
                    <div
                      className={`flex justify-center items-center text-gray-400`}
                    >
                      <i
                        className={`remix ri-search-line`}
                        style={{ fontSize: "0.75em" }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full bg-transparent border-0 py-1 pl-6 text-gray-900 shadow-none placeholder:text-gray-400 ring-0 outline-none focus:ring-0"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                style={{
                  boxShadow: "none",
                  ringShadow: "none",
                  border: "none",
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {/* Only show Pinned and Pages sections if not searching */}
          {searchTerm.length < 3 ? (
            <>
              {/* Pinned Section */}
              <div className="mt-4 mb-1 px-2">
                <span className="text-xs text-gray-400 font-bold">Pinned</span>
              </div>
              <div className="space-y-0.5">
                {pinnedNodes.data.map((node) => {
                  const sortedNodes = [...pinnedNodes.data].sort(
                    (a, b) => a.pinned_pos - b.pinned_pos
                  );
                  const isFirstNode =
                    sortedNodes.length > 0 && sortedNodes[0].id === node.id;

                  return (
                    <button
                      key={node.id}
                      className={`w-full py-1 px-2 transition-colors duration-200 rounded-md flex items-center hover:bg-gray-200 ${
                        node.id === selectedListId && showSelectedNode
                          ? "text-gray-900 bg-gray-200"
                          : "text-gray-900"
                      }`}
                      onClick={() => {
                        // make sure we are on /list page
                        if (!isListPage) {
                          navigate("/list");
                        }

                        dispatch(
                          changeSelectedNode({
                            id: node.id,
                          })
                        );

                        props.hideSidebar();
                      }}
                      draggable={!isFirstNode && searchTerm.length < 3}
                      onDragStart={(e) => handleDragStart(e, node)}
                      onDragOver={(e) => handleDragOver(e, node.id)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, node)}
                    >
                      <span className="mr-2">
                        <i className="ri-checkbox-blank-circle-fill ri-xxs text-gray-400"></i>
                      </span>
                      <span
                        className={`overflow-hidden text-ellipsis truncate leading-[1.2] text-black`}
                      >
                        {node.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pages Section */}
              <div className="mt-2 mb-1 px-2">
                <span className="text-xs text-gray-400 font-bold">
                  Artifacts
                </span>
              </div>
              <div
                className={`w-full cursor-pointer py-0.5 px-2 transition-colors duration-200 rounded-md flex items-center hover:bg-gray-200 ${
                  is4000Page ? "text-gray-900 bg-gray-200" : "text-gray-900"
                }`}
                onClick={() => {
                  props.hideSidebar();
                  navigate("/4000");
                }}
              >
                <span className="mr-2">
                  <i className="ri-checkbox-blank-circle-fill ri-xxs text-gray-400"></i>
                </span>
                <span
                  className={`overflow-hidden text-ellipsis truncate text-black`}
                >
                  4000 Weeks
                </span>
              </div>
              <div
                className={`w-full cursor-pointer py-0.5 px-2 transition-colors duration-200 rounded-md flex items-center hover:bg-gray-200 ${
                  isIntelligencePage ? "text-gray-900 bg-gray-200" : "text-gray-900"
                }`}
                onClick={() => {
                  props.hideSidebar();
                  navigate("/intelligence");
                }}
              >
                <span className="mr-2">
                  <i className="ri-checkbox-blank-circle-fill ri-xxs text-gray-400"></i>
                </span>
                <span
                  className={`overflow-hidden text-ellipsis truncate text-black`}
                >
                  Intelligence
                </span>
              </div>
            </>
          ) : (
            // Show search results only when searching
            <div className="space-y-0.5">
              {(searchResultsNodes || []).map((node) => {
                return (
                  <div key={node.id}>
                    <button
                      className={`flex w-full items-center cursor-pointer px-2 py-0.5 rounded-md transition-colors duration-200 hover:bg-gray-200 ${
                        node.id === selectedListId && showSelectedNode
                          ? "text-gray-900 bg-gray-200"
                          : "text-gray-900"
                      }`}
                      onClick={() => {
                        // make sure we are on /list page
                        if (!isListPage) {
                          navigate("/list");
                        }

                        dispatch(
                          changeSelectedNode({
                            id: node.id,
                          })
                        );

                        props.hideSidebar();
                      }}
                    >
                      <span className="mr-2 pt-0.5 mb-1">
                        <i className="ri-checkbox-blank-circle-fill ri-xxs text-gray-400"></i>
                      </span>
                      <span
                        className={`overflow-hidden text-ellipsis truncate leading-[1.2]`}
                      >
                        {node.text}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="hidden md:block w-full sidebar-toolkit">
          <button
            className={`w-full py-1.5 px-2 transition-colors duration-200 rounded-md flex items-center hover:bg-gray-200 ${
              props.settingsPage ? "text-gray-900 bg-gray-200" : "text-black"
            }`}
            onClick={() => {
              props.toggleSidebar();
              navigate("/settings");
            }}
          >
            <i
              className={`ri-xxs ri-checkbox-blank-circle-fill mr-2 text-gray-400`}
            ></i>
            <span className="">Settings</span>
          </button>
        </div>
        {props.isSidebarOpen && (
          <MobileTabBar
            showHomeOption={true}
            showSearchOption={true}
            showSettingsOption={true}
            isSearchSelected={true}
            onSelect={(tabName) => {
              if (tabName === "search") {
                props.showSidebar();
              } else if (tabName === "home") {
                props.hideSidebar();
                navigate("/list");
                dispatch(
                  changeSelectedNode({
                    id: "home",
                  })
                );
              } else if (tabName === "settings") {
                props.hideSidebar();
                navigate("/settings");
              }
            }}
          />
        )}
      </>
    );
  }
}

export default Sidebar;
