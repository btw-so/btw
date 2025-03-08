import React, { useEffect, useState } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { STATUS } from "../literals";
import useLocalStorage from "../hooks/useLocalStorage";
import { changeSelectedNode, getPinnedNodes, upsertListNode, batchPushNodes } from "../actions";

function Sidebar(props) {
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

  const [sidebarIsOpen, setSidebarIsOpen] = useLocalStorage(
    "sidebarIsOpen",
    false
  );

  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOverNodeId, setDragOverNodeId] = useState(null);


  const handleDragStart = (e, node) => {
    // Check if this is the first node in the sorted list
    const sortedNodes = [...pinnedNodes.data].sort((a, b) => a.pinned_pos - b.pinned_pos);
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

    const sortedNodes = [...pinnedNodes.data].sort((a, b) => a.pinned_pos - b.pinned_pos);
    const sourceIndex = sortedNodes.findIndex(node => node.id === draggedNode.id);
    const targetIndex = sortedNodes.findIndex(node => node.id === targetNode.id);
    
    // Calculate new position
    let newPosition;
    
    if (targetIndex === sortedNodes.length - 1) {
      // If dropped on the last item
      newPosition = sortedNodes[targetIndex].pinned_pos + 1;
    } else {
      // If dropped between two items
      const nextNode = sortedNodes[targetIndex + 1];
      newPosition = (sortedNodes[targetIndex].pinned_pos + nextNode.pinned_pos) / 2;
    }
    
    // Update the dragged node with new position
    const updatedNode = {
      ...draggedNode,
      pinned_pos: newPosition
    };
    
    // Update in Redux store
    const updatedNodes = pinnedNodes.data.map(node => 
      node.id === draggedNode.id ? updatedNode : node
    );
    
    // If the node exists in nodeDBMap, update it in the database
    if (nodeDBMap && nodeDBMap[draggedNode.id]) {
      const nodeToUpdate = {
        ...nodeDBMap[draggedNode.id],
        pinned_pos: newPosition
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

  if (token) {
    return (
      <>
        <div className="space-x-2 w-full mb-8 border-gray-200 sidebar-toolkit flex items-center">
          <div className="flex-grow">
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <div>
                  <div className="mr-1">
                    <div className={`flex justify-center items-center`}>
                      <i className={`remix ri-search-line`}></i>
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full rounded-md border-0 py-1 pl-8 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // dispatch(
                  //   searchNotes({
                  //     query: e.target.value,
                  //   })
                  // );
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {pinnedNodes.data.map((node) => {
            // Check if this is the first node in the sorted list
            const sortedNodes = [...pinnedNodes.data].sort((a, b) => a.pinned_pos - b.pinned_pos);
            const isFirstNode = sortedNodes.length > 0 && sortedNodes[0].id === node.id;
            
            return (
              <div
                key={node.id}
                className="flex items-center cursor-pointer"
                onClick={() => {
                  dispatch(
                    changeSelectedNode({
                      id: node.id,
                    })
                  );
                }}
                draggable={!isFirstNode}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragOver={(e) => handleDragOver(e, node.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, node)}
              >
                <span className="mr-2 pt-0.5 mb-1">
                  <i className="ri-checkbox-blank-circle-fill ri-xxs"></i>
                </span>
                <span
                  className={`overflow-hidden text-ellipsis truncate ${
                    node.id === selectedListId
                      ? "font-black text-blue-500"
                      : "font-bold"
                  }`}
                >
                  {node.text}
                </span>
              </div>
            );
          })}
        </div>
        <div className="w-full border-t-2 border-gray-200 sidebar-toolkit">
          <button
            className={`w-full pb-2 pt-4 flex items-center hover:font-extrabold hover:text-blue-500 ${
              props.settingsPage ? "text-blue-500" : ""
            }`}
            onClick={() => {
              setSidebarIsOpen(false);
              navigate("/settings");
            }}
          >
            <i className={`ri-1x ri-settings-4-line mr-1`}></i>
            <span className="font-extrabold">Settings</span>
          </button>
        </div>
      </>
    );
  }
}

export default Sidebar;
