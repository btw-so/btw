import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import {ApiService} from '../services/api';
import {WidgetService} from '../services/widgetService';
import type {Node, NoteWidgetData, ChildWidgetData} from '../types';

interface WidgetConfigScreenProps {
  onBack: () => void;
}

type WidgetType = 'note' | 'child' | null;

export const WidgetConfigScreen: React.FC<WidgetConfigScreenProps> = ({
  onBack,
}) => {
  const [widgetType, setWidgetType] = useState<WidgetType>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentNoteWidget, setCurrentNoteWidget] =
    useState<NoteWidgetData | null>(null);
  const [currentChildWidget, setCurrentChildWidget] =
    useState<ChildWidgetData | null>(null);

  useEffect(() => {
    loadCurrentWidgetData();
  }, []);

  useEffect(() => {
    if (widgetType) {
      loadNodes();
      setSearchQuery(''); // Reset search when switching widget types
    }
  }, [widgetType]);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodes;
    }
    const query = searchQuery.toLowerCase();
    return nodes.filter(node =>
      node.text.toLowerCase().includes(query)
    );
  }, [nodes, searchQuery]);

  const loadCurrentWidgetData = async () => {
    try {
      const [noteData, childData] = await Promise.all([
        WidgetService.getNoteWidgetData(),
        WidgetService.getChildWidgetData(),
      ]);

      // Fetch fresh node details if widget data exists
      if (noteData?.nodeId) {
        const response = await ApiService.getNodeDetail(noteData.nodeId);
        if (response.success && response.data) {
          setCurrentNoteWidget({
            ...noteData,
            nodeText: response.data.node.text,
            noteContent: response.data.note?.md || response.data.note?.html || 'No note content',
          });
        } else {
          setCurrentNoteWidget(noteData);
        }
      } else {
        setCurrentNoteWidget(null);
      }

      if (childData?.parentNodeId) {
        const parentResponse = await ApiService.getNodeDetail(childData.parentNodeId);
        if (parentResponse.success && parentResponse.data) {
          setCurrentChildWidget({
            ...childData,
            parentNodeText: parentResponse.data.node.text,
          });
        } else {
          setCurrentChildWidget(childData);
        }
      } else {
        setCurrentChildWidget(null);
      }
    } catch (error) {
      console.error('Failed to load widget data:', error);
    }
  };

  const loadNodes = async () => {
    setIsLoading(true);
    const response = await ApiService.getList('home', 1, 200);
    setIsLoading(false);

    if (response.success && response.data) {
      setNodes(response.data.nodes);
    }
  };

  const handleSelectNode = async (node: Node) => {
    if (widgetType === 'note') {
      await configureNoteWidget(node);
    } else if (widgetType === 'child') {
      await configureChildWidget(node);
    }
  };

  const configureNoteWidget = async (node: Node) => {
    try {
      setIsLoading(true);

      // Fetch full node details including note content
      const response = await ApiService.getNodeDetail(node.id);

      if (!response.success || !response.data) {
        Alert.alert('Error', 'Failed to load node details');
        return;
      }

      const {node: nodeData, note} = response.data;
      const noteContent = note?.md || note?.html || 'No note content';

      await WidgetService.updateNoteWidget(
        nodeData.id,
        nodeData.text,
        noteContent,
      );

      Alert.alert(
        'Success',
        `Note widget configured for "${nodeData.text}"`,
        [{text: 'OK', onPress: () => setWidgetType(null)}],
      );

      loadCurrentWidgetData();
    } catch (error) {
      Alert.alert('Error', 'Failed to configure note widget');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const configureChildWidget = async (node: Node) => {
    try {
      setIsLoading(true);

      console.log('🔍 [WidgetConfig] Configuring child widget for parent:', node.text, 'ID:', node.id);
      console.log('🔍 [WidgetConfig] Parent node full details:', JSON.stringify(node, null, 2));

      // Get fingerprint from storage
      const fingerprint = await AsyncStorage.getItem('@listgo_user_fingerprint');
      console.log('🔍 [WidgetConfig] Fingerprint:', fingerprint);

      if (!fingerprint) {
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        return;
      }

      // Generate widget token from backend
      console.log('🔍 [WidgetConfig] Generating widget token...');
      const tokenResponse = await ApiService.generateWidgetToken(node.id);

      if (!tokenResponse.success || !tokenResponse.data?.widgetToken) {
        Alert.alert('Error', 'Failed to generate widget token: ' + (tokenResponse.error || 'Unknown error'));
        return;
      }

      const widgetToken = tokenResponse.data.widgetToken;
      console.log('✅ [WidgetConfig] Widget token generated:', widgetToken.substring(0, 10) + '...');

      // First clear old data to avoid cache issues
      await WidgetService.clearChildWidget();
      console.log('🔍 [WidgetConfig] Cleared old child widget data');

      // Save parent node with widget token
      await WidgetService.updateChildWidget(node.id, node.text, widgetToken);

      console.log('✅ [WidgetConfig] Child widget configured successfully');

      // Verify what was saved
      const savedData = await WidgetService.getChildWidgetData();
      console.log('🔍 [WidgetConfig] Saved child widget data:', JSON.stringify(savedData, null, 2));

      Alert.alert(
        'Success',
        `Child widget configured for "${node.text}". The widget will automatically show the most recent child.`,
        [{text: 'OK', onPress: () => setWidgetType(null)}],
      );

      loadCurrentWidgetData();
    } catch (error) {
      Alert.alert('Error', 'Failed to configure child widget');
      console.error('❌ [WidgetConfig] Error configuring child widget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearWidget = async (type: 'note' | 'child') => {
    Alert.alert(
      'Clear Widget',
      `Are you sure you want to clear the ${type} widget?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'note') {
                await WidgetService.clearNoteWidget();
              } else {
                await WidgetService.clearChildWidget();
              }
              loadCurrentWidgetData();
              Alert.alert('Success', `${type} widget cleared`);
            } catch (error) {
              Alert.alert('Error', `Failed to clear ${type} widget`);
            }
          },
        },
      ],
    );
  };

  if (widgetType === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Widget Configuration</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Configure Widgets</Text>
          <Text style={styles.description}>
            Select a widget type to configure. You can choose which nodes appear
            in your home screen widgets.
          </Text>

          {/* Note Widget Card */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetCardHeader}>
              <Icon name="file-text-o" size={24} color="#111827" />
              <View style={styles.widgetCardTitle}>
                <Text style={styles.widgetCardName}>Note Widget</Text>
                <Text style={styles.widgetCardDesc}>
                  Display a node's note content
                </Text>
              </View>
            </View>

            {currentNoteWidget && (
              <View style={styles.currentConfig}>
                <Text style={styles.currentConfigLabel}>Current:</Text>
                <Text style={styles.currentConfigText} numberOfLines={1}>
                  {currentNoteWidget.nodeText}
                </Text>
              </View>
            )}

            <View style={styles.widgetCardActions}>
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => setWidgetType('note')}>
                <Text style={styles.configureButtonText}>Configure</Text>
              </TouchableOpacity>

              {currentNoteWidget && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => handleClearWidget('note')}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Child Widget Card */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetCardHeader}>
              <Icon name="level-down" size={24} color="#111827" />
              <View style={styles.widgetCardTitle}>
                <Text style={styles.widgetCardName}>Child Widget</Text>
                <Text style={styles.widgetCardDesc}>
                  Display most recent child node
                </Text>
              </View>
            </View>

            {currentChildWidget && (
              <View style={styles.currentConfig}>
                <Text style={styles.currentConfigLabel}>Parent Node:</Text>
                <Text style={styles.currentConfigText} numberOfLines={1}>
                  {currentChildWidget.parentNodeText}
                </Text>
                <Text style={styles.currentConfigHint}>
                  Widget shows the most recent child automatically
                </Text>
              </View>
            )}

            <View style={styles.widgetCardActions}>
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => setWidgetType('child')}>
                <Text style={styles.configureButtonText}>Configure</Text>
              </TouchableOpacity>

              {currentChildWidget && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => handleClearWidget('child')}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Back Button at Bottom */}
        <TouchableOpacity style={styles.floatingBackButton} onPress={onBack}>
          <Icon name="angle-left" size={24} color="#FFFFFF" style={{marginLeft: -2, marginTop: -2}} />
        </TouchableOpacity>
      </View>
    );
  }

  // Node selection view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {widgetType === 'note' ? 'Select Node' : 'Select Parent Node'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={16} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search nodes..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                <Icon name="times-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content}>
            {filteredNodes.length > 0 ? (
              filteredNodes.map(node => (
                <TouchableOpacity
                  key={node.id}
                  style={styles.nodeItem}
                  onPress={() => handleSelectNode(node)}>
                  <Icon
                    name={node.note_exists ? 'file-text-o' : 'circle-o'}
                    size={16}
                    color="#6B7280"
                    style={styles.nodeIcon}
                  />
                  <Text style={styles.nodeText} numberOfLines={1}>
                    {node.text}
                  </Text>
                  {node.note_exists && (
                    <Icon name="sticky-note-o" size={12} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No nodes found</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Back Button at Bottom */}
      <TouchableOpacity style={styles.floatingBackButton} onPress={() => setWidgetType(null)}>
        <Icon name="angle-left" size={24} color="#FFFFFF" style={{marginLeft: -2, marginTop: -2}} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  contentContainer: {
    padding: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  widgetCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  widgetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetCardTitle: {
    marginLeft: 12,
    flex: 1,
  },
  widgetCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  widgetCardDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentConfig: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  currentConfigLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  currentConfigText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  currentConfigHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  widgetCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  configureButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  configureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  nodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nodeIcon: {
    marginRight: 12,
  },
  nodeText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  floatingBackButton: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
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
