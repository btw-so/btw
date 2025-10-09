import React, {useState, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {StorageService} from '../utils/storage';
import {ApiService} from '../services/api';
import {useAuth} from '../contexts/AuthContext';

interface QuickNoteButtonProps {
  onNoteSaved?: () => void;
}

export const QuickNoteButton: React.FC<QuickNoteButtonProps> = ({onNoteSaved}) => {
  const {user} = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    loadQuickNote();
  }, []);

  const loadQuickNote = async () => {
    const quickNote = await StorageService.getQuickNote();
    if (quickNote) {
      setNoteContent(quickNote.content);
    }
  };

  const saveNote = async (content: string) => {
    setNoteContent(content);
    await StorageService.saveQuickNote(content);
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      Alert.alert('Not Logged In', 'Please log in to save notes to your account');
      return;
    }

    if (!noteContent.trim()) {
      Alert.alert('Empty Note', 'Please enter some content before saving');
      return;
    }

    setIsSaving(true);

    try {
      const result = await ApiService.createNote('Quick Note', noteContent, 'home');

      if (result.success) {
        // Clear the quick note on success
        setNoteContent('');
        await StorageService.saveQuickNote('');
        setShouldRefresh(true);

        // Show success message
        Alert.alert('Success', 'Your note has been saved to Home!', [
          {
            text: 'OK',
            onPress: () => {
              setIsModalVisible(false);
              // Trigger refresh after modal closes
              if (onNoteSaved) {
                onNoteSaved();
              }
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save note');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}>
        <Text style={styles.buttonText}>Quick Note</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quick Note</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={handleSaveToCloud}
                style={styles.saveButton}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.textInput}
              value={noteContent}
              onChangeText={saveNote}
              placeholder="Start typing your quick note..."
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </ScrollView>
          <Text style={styles.helperText}>
            This note is stored locally on your device
          </Text>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 32,
    color: '#6B7280',
    lineHeight: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  textInput: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    minHeight: 200,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 16,
    paddingHorizontal: 24,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
});
