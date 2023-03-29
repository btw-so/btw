import { Node, mergeAttributes } from "@tiptap/core";

const Embed = Node.create({
  name: "btw-embed", // unique name for the Node
  group: "block", // belongs to the 'block' group of extensions
  selectable: true, // so we can select the video
  draggable: true, // so we can drag the video
  atom: true, // is a single unit

  //...
  parseHTML() {
    return [
      {
        tag: "btw-embed",
      },
    ];
  },
  addAttributes() {
    return {
      html: {
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
    return ({ editor, node }) => {
      const embed = document.createElement("btw-embed");
      const div = document.createElement("div");
      const iframe = document.createElement("iframe");
      // convert the html string to a DOM node
      // &quot; to "
      let html = (node.attrs.html || "").replace(/&quot;/g, '"');

      // create unique id for iframe
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

      // insert html into iframe
      iframe.srcdoc = html;
      iframe.frameborder = "0";
      iframe.allowfullscreen = "";
      iframe.scrolling = "no";
      iframe.className = "w-full ";
      iframe.id = iframeId;

      div.appendChild(iframe);
      div.className = "w-full";
      embed.appendChild(div);
      // iframe.src = node.attrs.src;
      return {
        dom: embed,
      };
    };
  },
});

export default Embed;
