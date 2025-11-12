# Web Project Keyboard Navigation Implementation Analysis

## Overview
The web project at `/Users/siddharthagunti/Documents/code/btw/locus` implements a hierarchical note-taking system with keyboard navigation. The keyboard handling is primarily implemented in the `ContentEditable` component within `ListContainer.jsx`.

---

## File Location
**Primary File:** `/Users/siddharthagunti/Documents/code/btw/locus/src/containers/ListContainer.jsx`

---

## 1. KEY EVENT HANDLERS

### 1.1 Main Event Handler: `handleKeyDown` (Lines 344-380)
Located in the `ContentEditable` component, this is the central keyboard event handler.

```javascript
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
```

---

## 2. KEYBOARD SHORTCUTS BEHAVIOR

### 2.1 Enter Key - Create New Sibling Node
**Trigger:** `event.key === "Enter"`
**Handler:** Calls `onEnter()` callback

**Actual Implementation (Lines 1280-1298 - H1 Level):**
```javascript
onEnter={() => {
  const id = Date.now().toString(16);
  upsertHelper({
    id,
    parent_id: selectedListId,  // New node becomes sibling
    pos: nodeUIMap[selectedListId] &&
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
```

**For Regular Nodes (Lines 703-737):**
```javascript
addNewSibling={() => {
  const hasChildren = nodeUIMap[id] && nodeUIMap[id].children && 
    nodeUIMap[id].children.length > 0;
  const parentsChildren = nodeUIMap[nodeDBMap[id].parent_id]
    ? nodeUIMap[nodeDBMap[id].parent_id].children || []
    : [];
  const isItLastChild = parentsChildren.indexOf(id) === parentsChildren.length - 1;
  const currentSibling = isItLastChild ? null : parentsChildren[parentsChildren.indexOf(id) + 1];
  const firstChild = hasChildren ? nodeUIMap[id].children[0] : null;
  const isCollapsed = hasChildren && !!nodeDBMap[id]?.collapsed;

  onNewNode({
    id: Date.now().toString(16),
    parent_id: hasChildren && !isCollapsed ? id : nodeDBMap[id].parent_id,
    pos: hasChildren && !isCollapsed
      ? (0 + nodeDBMap[firstChild].pos) / 2
      : isItLastChild
      ? nodeDBMap[id].pos + 1
      : (nodeDBMap[id].pos + nodeDBMap[currentSibling].pos) / 2,
    text: "",
    note_id: getUUID(),
    new: true,
  });
}}
```

**Key Logic:**
- If the current node has children and is NOT collapsed, new node becomes the first child
- Otherwise, new node becomes a sibling to the current node
- Position calculated using midpoint between adjacent nodes to preserve order

---

### 2.2 Tab Key - Indent (Make Child of Previous Sibling)
**Trigger:** `event.key === "Tab"` (without Shift)
**Handler:** Calls `onTab()` callback

**Actual Implementation - `changeParentToElderSibling` (Lines 739-770):**

```javascript
changeParentToElderSibling={() => {
  const parentsChildren = nodeUIMap[nodeDBMap[id].parent_id]
    ? nodeUIMap[nodeDBMap[id].parent_id].children || []
    : [];
  const isItFirstChild = parentsChildren.indexOf(id) === 0;
  const currentElderSister = isItFirstChild ? null : 
    parentsChildren[parentsChildren.indexOf(id) - 1];
  
  const currentElderSistersLastChild = 
    currentElderSister && nodeUIMap[currentElderSister] &&
    nodeUIMap[currentElderSister].children &&
    nodeUIMap[currentElderSister].children.length > 0
      ? nodeUIMap[currentElderSister].children[
          nodeUIMap[currentElderSister].children.length - 1
        ]
      : null;

  if (currentElderSister) {
    onNewNode({
      id: id,
      parent_id: currentElderSister,  // Parent becomes previous sibling
      pos: currentElderSistersLastChild
        ? nodeDBMap[currentElderSistersLastChild].pos + 1
        : 1,
      posChange: true,  // Signals this is a positional update
    });
  }
  // If first child, does nothing (already at top)
}}
```

**Key Logic:**
- Gets the previous sibling (elder sister)
- Moves current node to be a child of that previous sibling
- Position is calculated after the last child of the new parent
- If node is already the first child, nothing happens

---

### 2.3 Shift+Tab - Outdent (Make Sibling of Parent)
**Trigger:** `event.key === "Tab"` AND `event.shiftKey`
**Handler:** Calls `onShiftTab()` callback

**Actual Implementation - `makeSiblingToParent` (Lines 771-802):**

```javascript
makeSiblingToParent={() => {
  const parent = nodeDBMap[id].parent_id;
  if (parent === selectedListId) {
    // Already at root level, ignore
  } else {
    const parentsParent = nodeDBMap[parent].parent_id;
    const parentsParentsChildren = (nodeUIMap[parentsParent] || {}).children || [];
    const elderSister = parent;
    
    const elderSistersNextSister = 
      parentsParentsChildren.indexOf(elderSister) !== -1 &&
      parentsParentsChildren.indexOf(elderSister) !== parentsParentsChildren.length - 1
        ? parentsParentsChildren[
            parentsParentsChildren.indexOf(elderSister) + 1
          ]
        : null;

    onNewNode({
      id: id,
      parent_id: parentsParent,  // Parent becomes the grandparent
      pos: elderSistersNextSister
        ? (nodeDBMap[elderSister].pos + nodeDBMap[elderSistersNextSister].pos) / 2
        : nodeDBMap[elderSister].pos + 1,
      posChange: true,
    });
  }
}}
```

**Key Logic:**
- Gets the parent's parent (grandparent)
- Moves current node to be a sibling of its parent
- Position calculated between parent and parent's next sibling
- If already at root level, action is ignored
- Cannot outdent beyond the root (H1) level

---

### 2.4 Arrow Up - Focus Previous Node
**Trigger:** `event.key === "ArrowUp"`
**Handler:** Calls `onUpArrow()` with optional `{ moveToEnd: true }` if cursor at start

**Actual Implementation - `focusOnPreviousNode` (Lines 803-845):**

```javascript
focusOnPreviousNode=(
  { moveToEnd = false } = { moveToEnd: false }
) => {
  const parent = nodeDBMap[id].parent_id;
  const parentsChildren = nodeUIMap[parent] && nodeUIMap[parent].children
    ? nodeUIMap[parent].children || []
    : [];
  const isItFirstChild = parentsChildren.indexOf(id) <= 0;

  if (isItFirstChild) {
    // Focus on parent
    focusOnNode({ id: parent, moveToEnd: !!moveToEnd });
  } else {
    // Focus on previous sibling's last descendant
    const elderSibling = parentsChildren[parentsChildren.indexOf(id) - 1];
    
    const getLastNode = (c) => {
      if (!nodeUIMap[c] || !nodeUIMap[c].children ||
          nodeUIMap[c].children.length === 0 ||
          nodeDBMap[c].collapsed) {
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
}
```

**Navigation Pattern:**
```
If at first child:
  → Focus on parent (moving to end of parent's text)

If not first child:
  → Focus on last visible descendant of previous sibling
  → If previous sibling is collapsed, focus on sibling itself
  → Otherwise recursively find deepest child
```

---

### 2.5 Arrow Down - Focus Next Node
**Trigger:** `event.key === "ArrowDown"`
**Handler:** Calls `onDownArrow()` with optional `{ moveToStart: true }` if cursor at end

**Actual Implementation - `focusOnNextNode` (Lines 846-886):**

```javascript
focusOnNextNode={({ moveToStart = false }) => {
  const currentNodesChildren = nodeUIMap[id]?.children;

  if (currentNodesChildren && currentNodesChildren.length > 0 &&
      !nodeDBMap[id].collapsed) {
    // If has open children, focus on first child
    focusOnNode({
      id: currentNodesChildren[0],
      moveToStart: !!moveToStart,
    });
    return;
  }

  // Otherwise find next sibling in depth-first traversal
  const getNext = (c) => {
    const parent = nodeDBMap[c].parent_id;
    if (parent) {
      const parentsChildren = nodeUIMap[parent] && 
        nodeUIMap[parent].children
        ? nodeUIMap[parent].children || []
        : [];

      if (parentsChildren.indexOf(c) > -1 &&
          parentsChildren.indexOf(c) < parentsChildren.length - 1) {
        return parentsChildren[parentsChildren.indexOf(c) + 1];
      }
      return getNext(parent);  // Recursively search up the tree
    }
  };

  const next = getNext(id);
  if (next) {
    focusOnNode({ id: next, moveToStart: !!moveToStart });
  }
}}
```

**Navigation Pattern:**
```
If node has open children:
  → Focus on first child

If node has no children or is collapsed:
  → Find next sibling at current level
  → If no next sibling, recursively check parent's next sibling
  → Continue up the tree until finding next available node
```

---

### 2.6 Arrow Left - Move to Previous Node (At Cursor Start)
**Trigger:** `event.key === "ArrowLeft"` AND `getCursorPosition() === 0`
**Handler:** Calls `onUpArrow({ moveToEnd: true })`
**Behavior:** When cursor is at the beginning of text, left arrow navigates to the previous node with cursor at the end of its text

---

### 2.7 Arrow Right - Move to Next Node (At Cursor End)
**Trigger:** `event.key === "ArrowRight"` AND cursor is at end of text
**Handler:** Calls `onDownArrow({ moveToStart: true })`
**Behavior:** When cursor is at the end of text, right arrow navigates to the next node with cursor at the start of its text

---

### 2.8 Backspace/Delete - Delete Empty Node
**Trigger:** `(event.key === "Backspace" || event.key === "Delete")` AND node text is empty
**Handler:** Calls `onDeleteNode()`

**Actual Implementation (Lines 597-602):**

```javascript
onDeleteNode={() => {
  focusOnPreviousNode({
    moveToEnd: true,  // Move to end of previous node's text
  });
  deleteThisNode();  // Move node to "limbo" parent
}
```

**Key Logic:**
- Only works when node text is completely empty
- Focus moves to previous node (end of text)
- Node is moved to "limbo" parent (soft delete)

---

## 3. FOCUS MANAGEMENT

### 3.1 Focus Helper Function - `focusOnNode` (Lines 142-191)
```javascript
const focusOnNode = ({
  id,
  moveToEnd,
  moveToStart,
  preferNaturalMovement = true,
}) => {
  const elem = document.getElementById(`node-${id}`);
  
  if (elem) {
    if (moveToEnd) {
      elem.focus();
      const deets = getCursorDetails();
      if (deets && deets.totalRange) {
        setCursorPositionInElem(elem, deets.totalRange);
      }
    } else if (moveToStart) {
      elem.focus();
    } else if (preferNaturalMovement) {
      // Try to maintain cursor position percentage
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
```

**Modes:**
1. **moveToEnd**: Position cursor at end of new node's text
2. **moveToStart**: Position cursor at start of new node's text
3. **preferNaturalMovement** (default): Try to maintain relative cursor position

---

## 4. CURSOR POSITION HELPERS

### 4.1 Get Cursor Position
```javascript
const getCursorPosition = () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(contentEditableRef.current);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
};
```

### 4.2 Set Cursor Position
```javascript
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
```

---

## 5. NODE DATA STRUCTURE

### 5.1 Node Properties
```javascript
{
  id: string,                    // Unique identifier (timestamp.toString(16))
  text: string,                  // Node display text
  parent_id: string,            // ID of parent node
  pos: number,                  // Position for ordering (0-10000)
  collapsed: boolean,           // Whether children are hidden
  checked: boolean,             // Checkbox state
  checked_date: number,         // Timestamp of when checked
  note_id: string,              // UUID for associated note
  file_id?: string,             // Optional file reference
  note_exists: boolean,         // Has associated note content
  scribble_exists: boolean,     // Has sketch/drawing content
  pinned_pos?: number,          // Position in pinned list
}
```

### 5.2 Position System
- **Fractional Positioning**: New nodes positioned at midpoint between siblings
- **Formula**: `newPos = (prevNodePos + nextNodePos) / 2`
- **Root Level**: `selectedListId` (the H1 node)
- **Max Position**: 10000
- **Max Nesting**: 10 levels

---

## 6. STATE MANAGEMENT

### 6.1 Redux State Used
- `nodeDBMap`: Map of all nodes (id → node data)
- `nodeUIMap`: Map of node UI structure (id → { children: [childIds] })
- `selectedListId`: Currently selected H1 node ID
- `nodeUIMap[id].children`: Array of child node IDs in order

### 6.2 Upsert Operations
```javascript
upsertHelper(d) → dispatch(upsertListNode(d))
```
Used for:
- Text changes
- Position changes (indent/outdent)
- Parent changes
- Creating new nodes

---

## 7. SPECIAL BEHAVIORS

### 7.1 Collapsed Nodes
- When parent is collapsed, arrow down does NOT drill into children
- Only shows the parent node itself
- Collapsing is toggled by clicking the expand/collapse icon

### 7.2 H1 (Root) Level Behavior
- Has special ContentEditable component (Lines 1268-1311)
- Supports Enter (create first child)
- Supports Down Arrow (focus first child)
- Cannot use Tab/Shift+Tab (already at root)

### 7.3 Empty Node Deletion
- Only works when node text is completely empty
- Backspace or Delete key
- Automatically moves focus to previous node

### 7.4 New Node Creation Timing
```javascript
onNewNode((d) => {
  upsertHelper(d);
  setTimeout(() => {
    focusOnNode({ id: d.id });  // Focus after 50ms
  }, 50);
});
```
Uses `setTimeout` to allow state update before focusing

---

## 8. KEYBOARD NAVIGATION SUMMARY TABLE

| Key | Condition | Action | Focus Movement |
|-----|-----------|--------|-----------------|
| Enter | Anywhere | Create new sibling/child | Focus new node (start) |
| Tab | Not first child | Indent: make child of previous sibling | Focus stays on node |
| Shift+Tab | Not at root | Outdent: make sibling of parent | Focus stays on node |
| ArrowUp | Anywhere | Focus previous node | Previous sibling or parent |
| ArrowDown | Anywhere | Focus next node | First child or next sibling |
| ArrowLeft | Cursor at start | Navigate to previous node | Previous node (end) |
| ArrowRight | Cursor at end | Navigate to next node | Next node (start) |
| Backspace/Delete | Node empty | Delete node | Previous node (end) |

---

## 9. IMPLEMENTATION NOTES FOR SWIFTUI

### Key Concepts to Implement:
1. **Cursor Position Tracking**: Use NSRange for text position
2. **Tree Traversal**: Implement recursive functions for up/down navigation
3. **Focus Management**: UIResponder or FocusEngine
4. **Fractional Positioning**: Use Double for pos values
5. **Debouncing**: Timer for focus operations (50ms delay)
6. **State Persistence**: Core Data or similar for nodeDBMap/nodeUIMap

### Critical Differences from Web:
- No contentEditable, use UITextView or similar
- Manual cursor position management
- Different keyboard event handling API
- Focus model differs significantly

---

## 10. QUICK REFERENCE - EXACT CODE SNIPPETS

### Enter Key Creates New Node
Source: ListContainer.jsx lines 703-737

When user presses Enter on a node:
1. Check if current node has children and is NOT collapsed
2. If yes: new node becomes first child of current node
3. If no: new node becomes sibling at position calculated between current node and next sibling
4. Focus moves to new node after 50ms delay

### Tab Indents Node
Source: ListContainer.jsx lines 739-770

When user presses Tab:
1. Check if node is first child
2. If yes: do nothing (cannot indent first child)
3. If no: move node to be child of previous sibling, positioned after its last child

### Shift+Tab Outdents Node
Source: ListContainer.jsx lines 771-802

When user presses Shift+Tab:
1. Check if at root level (parent_id === selectedListId)
2. If yes: do nothing (cannot outdent beyond root)
3. If no: move node to be sibling of parent

### Arrow Navigation
Source: ListContainer.jsx lines 803-886

**Up Arrow**: Depth-first traversal upward
- If first child: focus parent
- If not first child: focus last descendant of previous sibling

**Down Arrow**: Depth-first traversal downward
- If has children and not collapsed: focus first child
- If no children or collapsed: find next sibling by going up tree

