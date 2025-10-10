import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Linking,
  Share,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Markdown from 'react-native-markdown-display';
import {ApiService} from '../services/api';
import {NodeItem} from '../components/NodeItem';
import type {Node, NodeDetail} from '../types';

interface NodeDetailScreenProps {
  nodeId: string;
  onNavigateToNode: (nodeId: string) => void;
  onBack: () => void;
}

type TabType = 'list' | 'note' | 'file';

export const NodeDetailScreen: React.FC<NodeDetailScreenProps> = ({
  nodeId,
  onNavigateToNode,
  onBack,
}) => {
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [childNodes, setChildNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveTab(null);
    setNodeDetail(null);
    setChildNodes([]);
    loadNodeData();
  }, [nodeId]);

  useEffect(() => {
    // Auto-select appropriate tab based on content - run every time data changes
    if (nodeDetail && !isLoading) {
      const hasChildrenForThisNode = childNodes.some(n => n.parent_id === nodeId);
      const hasNote = !!(nodeDetail.note && nodeDetail.note.md && nodeDetail.note.md.trim().length > 0);
      const hasFile = !!(nodeDetail.file && nodeDetail.file.url);

      console.log('Tab selection:', { hasChildrenForThisNode, hasNote, hasFile, nodeId, childNodes: childNodes.map(n => n.parent_id) });

      if (hasChildrenForThisNode) {
        setActiveTab('list');
      } else if (hasNote) {
        setActiveTab('note');
      } else if (hasFile) {
        setActiveTab('file');
      } else {
        // No content at all, stay on list
        setActiveTab('list');
      }
    }
  }, [nodeDetail, childNodes, isLoading, nodeId]);

  const loadNodeData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    // Fetch node details and children in parallel
    const [detailResponse, childrenResponse] = await Promise.all([
      ApiService.getNodeDetail(nodeId),
      ApiService.getList(nodeId),
    ]);

    if (refresh) {
      setIsRefreshing(false);
    } else {
      setIsLoading(false);
    }

    if (detailResponse.success && detailResponse.data) {
      setNodeDetail(detailResponse.data);
    }

    if (childrenResponse.success && childrenResponse.data) {
      setChildNodes(childrenResponse.data.nodes);
    }
  };

  const toggleCollapse = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const hasChildren = useCallback(
    (nodeId: string) => {
      return childNodes.some(n => n.parent_id === nodeId);
    },
    [childNodes],
  );

  const getVisibleNodes = useCallback(() => {
    const buildTree = (parentId: string, level: number = 0): Array<{node: Node; level: number}> => {
      const children = childNodes
        .filter(n => n.parent_id === parentId)
        .sort((a, b) => a.pos - b.pos);

      let result: Array<{node: Node; level: number}> = [];

      for (const child of children) {
        result.push({node: child, level});
        if (expandedNodes.has(child.id) && hasChildren(child.id)) {
          result = result.concat(buildTree(child.id, level + 1));
        }
      }

      return result;
    };

    return buildTree(nodeId);
  }, [childNodes, expandedNodes, hasChildren, nodeId]);

  const visibleNodes = getVisibleNodes();

  const hasNoteContent = !!(nodeDetail?.note && nodeDetail.note.md && nodeDetail.note.md.trim().length > 0);
  const hasFileContent = !!(nodeDetail?.file && nodeDetail.file.url);
  const hasListContent = childNodes.some(n => n.parent_id === nodeId);

  const shareFile = async () => {
    if (!nodeDetail?.file?.url) return;

    try {
      await Share.share({
        url: nodeDetail.file.url,
        message: `Download: ${nodeDetail.file.name || 'file'}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getFileType = (url: string | undefined, name: string | undefined): string => {
    const fileName = name || url || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    const pdfExtensions = ['pdf'];

    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
    if (pdfExtensions.includes(extension)) return 'pdf';

    return 'other';
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!nodeDetail) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Node not found</Text>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {nodeDetail.node.text || '(empty)'}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'list' && (
          <FlatList
            data={visibleNodes}
            keyExtractor={item => item.node.id}
            renderItem={({item}) => (
              <NodeItem
                node={item.node}
                onPress={() => onNavigateToNode(item.node.id)}
                onToggleCollapse={() => toggleCollapse(item.node.id)}
                hasChildren={hasChildren(item.node.id)}
                isExpanded={expandedNodes.has(item.node.id)}
                level={item.level}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadNodeData(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No child nodes</Text>
              </View>
            }
          />
        )}

        {activeTab === 'note' && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadNodeData(true)} />
            }>
            {hasNoteContent ? (
              <Markdown style={markdownStyles}>{nodeDetail.note?.md || ''}</Markdown>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No note content</Text>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'file' && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadNodeData(true)} />
            }>
            {hasFileContent ? (
              <View style={styles.fileContainer}>
                {getFileType(nodeDetail.file?.url, nodeDetail.file?.name) === 'image' && (
                  <Image
                    source={{uri: nodeDetail.file?.url}}
                    style={styles.filePreview}
                    resizeMode="contain"
                  />
                )}

                {getFileType(nodeDetail.file?.url, nodeDetail.file?.name) === 'pdf' && (
                  <TouchableOpacity
                    style={styles.openFileButton}
                    onPress={() => nodeDetail.file?.url && Linking.openURL(nodeDetail.file.url)}>
                    <Icon name="file-pdf-o" size={48} color="#EF4444" />
                    <Text style={styles.openFileText}>Tap to open PDF</Text>
                  </TouchableOpacity>
                )}

                {getFileType(nodeDetail.file?.url, nodeDetail.file?.name) === 'other' && (
                  <TouchableOpacity
                    style={styles.openFileButton}
                    onPress={() => nodeDetail.file?.url && Linking.openURL(nodeDetail.file.url)}>
                    <Icon name="file-o" size={48} color="#6B7280" />
                    <Text style={styles.openFileText}>Tap to open file</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.fileUrl}>{nodeDetail.file?.url}</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No file attached</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Footer with back button and tabs */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="angle-left" size={24} color="#FFFFFF" style={{marginLeft: -2, marginTop: -2}} />
        </TouchableOpacity>

        {hasFileContent && (
          <TouchableOpacity style={styles.downloadButton} onPress={shareFile}>
            <Icon name="share" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Only show tabs if more than one tab is available */}
        {((hasListContent && (hasNoteContent || hasFileContent)) ||
         (hasNoteContent && hasFileContent)) && (
          <>
            {hasListContent && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'list' && styles.activeTab]}
                onPress={() => setActiveTab('list')}>
                <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
                  List
                </Text>
              </TouchableOpacity>
            )}
            {hasNoteContent && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'note' && styles.activeTab]}
                onPress={() => setActiveTab('note')}>
                <Text style={[styles.tabText, activeTab === 'note' && styles.activeTabText]}>
                  Note
                </Text>
              </TouchableOpacity>
            )}
            {hasFileContent && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'file' && styles.activeTab]}
                onPress={() => setActiveTab('file')}>
                <Text style={[styles.tabText, activeTab === 'file' && styles.activeTabText]}>
                  File
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  backIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#111827',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 24,
    paddingRight: 20,
    paddingLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  noteText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  fileContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  fileUrl: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  filePreview: {
    width: '100%',
    height: 300,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  openFileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 12,
    marginBottom: 12,
  },
  openFileText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: -12,
    left: 24,
    right: 180,
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#111827',
    borderWidth: 2,
  },
  activeTab: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 24,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 24,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  strong: {
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  code_inline: {
    backgroundColor: '#F3F4F6',
    color: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  fence: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  blockquote: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 8,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 8,
  },
  list_item: {
    marginTop: 4,
    marginBottom: 4,
  },
  hr: {
    backgroundColor: '#E5E7EB',
    height: 1,
    marginTop: 16,
    marginBottom: 16,
  },
});
