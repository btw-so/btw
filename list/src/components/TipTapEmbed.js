import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const BtwEmbedNodeView = ({ node, updateAttributes, editor }) => {
  const [isEditing, setEditing] = useState(node.attrs.code ? false : true);
  const [blurRemoval, setBlurRemoval] = useState(false);
  const textareaRef = useRef(null);

  const setIsEditing = (val) => {
    if (!val) {
      // if there is no content in the textarea, delete the node
      if (textareaRef.current && textareaRef.current.value === "") {
        editor.commands.deleteSelection();
        return;
      }
    }
    setEditing(val);
  };

  // whenever editing changes to true, set focus on textarea
  useEffect(() => {
    if (isEditing) {
      // set focus on textarea's ending
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  useEffect(() => {
    if (!node.attrs.code) {
      setIsEditing(true);
      setTimeout(() => {
        textareaRef.current.focus();
        setBlurRemoval(true);
      }, 200);
    } else {
      setBlurRemoval(true);
    }
  }, []);

  const getIframe = () => {
    let html = (node.attrs.code || "").replace(/&quot;/g, '"');
    const iframeId = "iframe-" + Math.random().toString(36).substr(2, 16);

    const jsCode = `
  <script>
function sendHeightToParent() {
    var height = document.body.scrollHeight;
    var origin = window.location.origin;
    if (origin === "null" || !origin) {
      origin = "*";
    }
    window.parent.postMessage({
        type: 'setIframeHeight',
        iframeId: '${iframeId}',
        height: height
    }, origin);
}

window.addEventListener('load', sendHeightToParent, false);
window.addEventListener('resize', sendHeightToParent, false);

// there is a delay sometimes. 
// so we need to send height again after 1 second
setTimeout(sendHeightToParent, 1000);
</script>`;
    // if html contains body tag, then add jscode to body tag of html. else append to html directly
    if (html.includes("<body>")) {
      html = html.replace("<body>", `<body>${jsCode}`);
    } else {
      html = html + jsCode;
    }

    return (
      <iframe
        srcDoc={html}
        frameBorder="0"
        allowFullScreen={false}
        scrolling="no"
        id={iframeId}
        selectable="false"
        className="w-full"
      />
    );
  };

  const handleOnChange = (event) => {
    updateAttributes({ code: event.target.value });
  };

  return (
    <NodeViewWrapper
      onClick={() => {
        setIsEditing(true);
      }}
      onBlur={() => {
        if (blurRemoval) {
          setIsEditing(false);
        }
      }}
      className="relative"
    >
      <NodeViewContent
        as="btw-embed"
        code={node.attrs.code}
        onClick={() => {
          setIsEditing(true);
        }}
      >
        {isEditing ? (
          <textarea
            className="w-full"
            value={node.attrs.code}
            onChange={handleOnChange}
            onBlur={() => {
              if (blurRemoval) {
                setIsEditing(false);
              }
            }}
            ref={textareaRef}
          />
        ) : (
          <div>
            <div className="absolute top-0 left-0 right-0 bottom-0"></div>
            {getIframe()}
          </div>
        )}
      </NodeViewContent>
    </NodeViewWrapper>
  );
};

const Embed = Node.create({
  name: "btw-embed",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  parseHTML() {
    return [
      {
        tag: "btw-embed",
        contentElement: "textarea",
      },
    ];
  },
  addAttributes() {
    return {
      code: {
        default: null,
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["btw-embed", mergeAttributes(HTMLAttributes)];
  },
  parseHTML() {
    return [
      {
        tag: "btw-embed",
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props) => <BtwEmbedNodeView {...props} />);
  },
});

export default Embed;
