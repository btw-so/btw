import React from "react";

function PublicNode({ node, nodes }) {
  return (
    <div>
      <div className={`flex items-center ${node.note_exists || node.file_id ? "cursor-pointer" : ""}`} onClick={() => {
        if (node.note_exists || node.file_id) {
          window.open(node.shareUrl, "_blank");
        }
      }}>
        <div
          className={`w-4 h-4 flex items-center justify-center ${
            node.note_exists || node.file_id ? "" : "mb-1.5"
          }`}
        >
          {node.note_exists ? (
            <span>
              <i className="ri-quill-pen-fill text-gray-900 ri-sm"></i>
            </span>
          ) : node.file_id ? (
            <span>
              <i className="ri-attachment-2 text-gray-900 ri-sm"></i>
            </span>
          ) : (
            <span className="">
              <i className="ri-checkbox-blank-circle-fill text-gray-900 ri-xxs"></i>
            </span>
          )}
        </div>
        <div className="overflow-hidden text-ellipsis truncate" style={{ minHeight: "28px", height: "auto", overflowWrap: "anywhere" }}>
          <span className="ml-2 leading-6">{node.text}</span>
        </div>
      </div>
      <PublicChildTree nodes={nodes} rootId={node.id} />
    </div>
  );
}

function PublicChildTree({ nodes, rootId, first }) {
  const children = nodes
    .filter((node) => node.parent_id === rootId)
    .sort((a, b) => a.pos - b.pos);

  return (
    <div className={`${first ? "" : "ml-5"}`}>
      {children.map((child) => (
        <PublicNode key={child.id} node={child} nodes={nodes} />
      ))}
    </div>
  );
}

export default PublicChildTree;
