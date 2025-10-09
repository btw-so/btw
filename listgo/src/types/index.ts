export interface Node {
  id: string;
  user_id?: string;
  text: string;
  checked: boolean;
  collapsed: boolean;
  checked_date: string | null;
  parent_id: string;
  pos: number;
  updated_at: string;
  note_id: string | null;
  file_id: string | null;
  pinned_pos: number | null;
  note_exists: boolean;
  scribble_exists: boolean;
}

export interface Note {
  id: string;
  title: string;
  md: string;
  html: string;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: string;
  url: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface NodeDetail {
  node: Node;
  note: Note | null;
  file: File | null;
}

export interface QuickNote {
  content: string;
  updatedAt: number;
}

export interface User {
  email: string;
  fingerprint: string;
  isLoggedIn: boolean;
}

export interface NoteWidgetData {
  nodeId: string;
  nodeText: string;
  noteContent: string;
  lastUpdated: number;
}

export interface ChildWidgetData {
  parentNodeId: string;
  parentNodeText: string;
  widgetToken: string;
  lastUpdated: number;
}
