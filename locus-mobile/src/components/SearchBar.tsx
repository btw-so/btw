import React, {useState} from 'react';
import {
  View,
  TextInput,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import {ApiService} from '../services/api';
import type {Node} from '../types';

interface SearchBarProps {
  visible: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({visible, onClose, onSelectNode}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const response = await ApiService.searchNodes(searchQuery);
    setIsLoading(false);

    if (response.success && response.data) {
      setResults(response.data.nodes);
    } else {
      setResults([]);
    }
  };

  const handleSelectNode = (nodeId: string) => {
    setQuery('');
    setResults([]);
    onSelectNode(nodeId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.container}>
              <View style={styles.header}>
                <TextInput
                  style={styles.input}
                  placeholder="Search nodes..."
                  placeholderTextColor="#9CA3AF"
                  value={query}
                  onChangeText={handleSearch}
                  autoFocus
                />
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#111827" />
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.resultItem}
                      onPress={() => handleSelectNode(item.id)}>
                      <Text style={styles.resultText} numberOfLines={2}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    query.length >= 2 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No results found</Text>
                      </View>
                    ) : null
                  }
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 36,
    color: '#6B7280',
    lineHeight: 36,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultText: {
    fontSize: 16,
    color: '#111827',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
