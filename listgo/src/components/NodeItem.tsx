import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import type {Node} from '../types';

interface NodeItemProps {
  node: Node;
  onPress: () => void;
  onToggleCollapse?: () => void;
  hasChildren: boolean;
  isExpanded?: boolean;
  level?: number;
}

export const NodeItem: React.FC<NodeItemProps> = ({
  node,
  onPress,
  onToggleCollapse,
  hasChildren,
  isExpanded = false,
  level = 0,
}) => {
  return (
    <View style={[styles.container, {paddingLeft: 16 + level * 16}]}>
      <View style={styles.row}>
        {/* Arrow icon for nodes with children - always show container for alignment */}
        <TouchableOpacity
          onPress={hasChildren ? onToggleCollapse : undefined}
          style={styles.arrowButton}
          disabled={!hasChildren}>
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            size={9}
            color={hasChildren ? '#9CA3AF' : 'transparent'}
          />
        </TouchableOpacity>

        {/* Main content */}
        <TouchableOpacity onPress={onPress} style={styles.content}>
          <View style={styles.iconContainer}>
            {node.note_exists || node.scribble_exists ? (
              <Icon name="file-text-o" size={10} color="#111827" />
            ) : node.file_id ? (
              <Icon name="paperclip" size={10} color="#111827" />
            ) : (
              <Icon name="circle" size={6} color="#111827" />
            )}
          </View>
          <Text
            style={[styles.text, node.checked && styles.checkedText]}
            numberOfLines={2}>
            {node.text || '(empty)'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  arrowButton: {
    width: 20,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  arrow: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  arrowHidden: {
    opacity: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 20,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  icon: {
    fontSize: 14,
  },
  bullet: {
    fontSize: 20,
    color: '#111827',
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    lineHeight: 28,
  },
  checkedText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
});
