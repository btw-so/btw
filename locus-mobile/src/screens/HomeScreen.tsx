import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {ApiService} from '../services/api';
import {NodeItem} from '../components/NodeItem';
import {SearchBar} from '../components/SearchBar';
import type {Node} from '../types';

interface HomeScreenProps {
  onNavigateToNode: (nodeId: string) => void;
  onNavigateToWidgetConfig?: () => void;
  refreshTrigger?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({onNavigateToNode, onNavigateToWidgetConfig, refreshTrigger}) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNodes();
  }, []);

  useEffect(() => {
    // Refresh when trigger changes (from Quick Note save)
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadNodes();
    }
  }, [refreshTrigger]);

  const loadNodes = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const response = await ApiService.getList('home');

    if (refresh) {
      setIsRefreshing(false);
    } else {
      setIsLoading(false);
    }

    if (response.success && response.data) {
      setNodes(response.data.nodes);
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
      return nodes.some(n => n.parent_id === nodeId);
    },
    [nodes],
  );

  const getVisibleNodes = useCallback(() => {
    const buildTree = (parentId: string, level: number = 0): Array<{node: Node; level: number}> => {
      const children = nodes
        .filter(n => n.parent_id === parentId)
        .sort((a, b) => a.pos - b.pos);

      let result: Array<{node: Node; level: number}> = [];

      for (const child of children) {
        result.push({node: child, level});
        // Show children only if node is expanded (not collapsed by default)
        if (expandedNodes.has(child.id) && hasChildren(child.id)) {
          result = result.concat(buildTree(child.id, level + 1));
        }
      }

      return result;
    };

    return buildTree('home');
  }, [nodes, expandedNodes, hasChildren]);

  const visibleNodes = getVisibleNodes();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
      </View>

      {/* Nodes List */}
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
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadNodes(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No nodes yet</Text>
          </View>
        }
      />

      {/* Search Button */}
      <TouchableOpacity onPress={() => setIsSearchVisible(true)} style={styles.searchButton}>
        <Icon name="search" size={18} color="#FFFFFF" style={{marginLeft: -1}} />
      </TouchableOpacity>

      {/* Widget Settings Button */}
      {onNavigateToWidgetConfig && (
        <TouchableOpacity onPress={onNavigateToWidgetConfig} style={styles.widgetButton}>
          <Icon name="cog" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Search Modal */}
      <SearchBar
        visible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        onSelectNode={onNavigateToNode}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  searchButton: {
    position: 'absolute',
    bottom: -11,
    left: 24,
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
  widgetButton: {
    position: 'absolute',
    bottom: -11,
    left: 80,
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
  searchIcon: {
    fontSize: 20,
  },
  listContent: {
    paddingVertical: 24,
    paddingRight: 20,
    paddingLeft: 8,
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
});
