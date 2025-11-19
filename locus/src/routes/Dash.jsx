import React, { useEffect, useCallback, useState } from "react";
import { useAppSelector } from "modules/hooks";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import useCookie from "../hooks/useCookie";
import { getPinnedNodes, changeSelectedNode, upsertListNode, batchPushNodes } from "../actions";
import { selectNotes } from "../selectors";
import AppWrapper from "../containers/AppWraper";
import Tiptap from "../components/Tiptap";

function Dash(props) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pinnedNodes = useAppSelector((state) => state.list.pinnedNodes);
  const notesState = useAppSelector(selectNotes);
  const [token] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return `Good Morning`;
    } else if (hour < 18) {
      return `Good Afternoon`;
    } else {
      return `Good Night`;
    }
  };

  useEffect(() => {
    if (props.userId) {
      dispatch(getPinnedNodes({ user_id: props.userId }));
    }

    // Set up periodic refresh every 10 seconds
    const intervalId = setInterval(() => {
      if (props.userId) {
        dispatch(getPinnedNodes({ user_id: props.userId }));
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [props.userId, dispatch]);

  // Update localStorage when pinned nodes change
  useEffect(() => {
    if (pinnedNodes?.data) {
      const hasPinned = pinnedNodes.data.length > 0;
      localStorage.setItem('hasPinnedNodes', hasPinned ? 'true' : 'false');
    }
  }, [pinnedNodes]);

  // Filter pinned nodes that have note content
  const pinnedNotesWithContent = pinnedNodes.data.filter(node => {
    return node.note_exists && node.note_id;
  });

  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleCardClick = (nodeId) => {
    dispatch(changeSelectedNode({ id: nodeId }));
    navigate("/list");
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Visual feedback
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragLeave = (e) => {
    e.currentTarget.style.opacity = "1";
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    e.currentTarget.style.opacity = "1";

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reorder the nodes
    const reorderedNodes = [...pinnedNotesWithContent];
    const [draggedNode] = reorderedNodes.splice(draggedIndex, 1);
    reorderedNodes.splice(dropIndex, 0, draggedNode);

    // Update pinned_pos for all affected nodes
    const updates = reorderedNodes.map((node, index) => ({
      ...node,
      pinned_pos: index + 1, // Start from 1
    }));

    // Update local Redux state immediately for all affected nodes
    for (const node of updates) {
      dispatch(upsertListNode({
        id: node.id,
        text: node.text,
        checked: node.checked,
        collapsed: node.collapsed,
        parent_id: node.parent_id,
        pos: node.pos,
        pinned_pos: node.pinned_pos,
        note_id: node.note_id,
        file_id: node.file_id,
      }));
    }

    // Push all updated nodes to backend immediately
    dispatch(batchPushNodes({
      nodes: updates
    }));

    setDraggedIndex(null);

    // Refresh after a short delay to ensure backend has processed the updates
    setTimeout(() => {
      dispatch(getPinnedNodes({ user_id: props.userId }));
    }, 500);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <AppWrapper
      userId={props.userId}
      name={props.name}
      email={props.email}
      isDashPage={true}
      isSidebarOpen={props.isSidebarOpen}
      toggleSidebar={props.toggleSidebar}
      hideSidebar={props.hideSidebar}
      showSidebar={props.showSidebar}
    >
      <div className="flex-grow overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">{getGreeting()}</h1>

          {pinnedNotesWithContent.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No pinned notes with content yet.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Pin a note with content to see it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedNotesWithContent.map((node, index) => (
                <div
                  key={node.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden aspect-square flex flex-col"
                >
                  {/* Card Header - Draggable */}
                  <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0 cursor-move flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
                    </svg>
                    <h2 className="text-md font-semibold text-gray-900 line-clamp-2 leading-tight flex-grow">
                      {node.text || "Untitled Note"}
                    </h2>
                  </div>

                  {/* Card Content - Read-only Tiptap view */}
                  <div
                    className="flex-grow overflow-hidden pointer-events-none cursor-pointer"
                    onClick={() => handleCardClick(node.id)}
                  >
                    <Tiptap
                      key={node.note_id}
                      showMenuBar={false}
                      hideCharacterCount={true}
                      note={notesState.notesMap[node.note_id]}
                      token={token}
                      userId={props.userId}
                      email={props.email}
                      name={props.name}
                      docId={node.note_id}
                      savedContent={notesState.notesMap[node.note_id]?.content || ""}
                      enableServerSync={true}
                      mandatoryH1={false}
                      disallowH1={true}
                      onChange={() => {}}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppWrapper>
  );
}

export default Dash;
