import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { postsAPI } from '../services/api';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

/**
 * Modal component for creating a new community post
 */
export default function CreatePostModal({ visible, onClose, onPostCreated }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setDescription('');
      setLocation('');
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle) {
      Alert.alert('Error', 'Please enter a title for your post');
      return;
    }

    if (!trimmedDescription) {
      Alert.alert('Error', 'Please enter a description for your post');
      return;
    }

    setIsSubmitting(true);
    try {
      await postsAPI.createPost({
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation || undefined,
      });

      setTitle('');
      setDescription('');
      setLocation('');
      onClose();
      onPostCreated();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to create post. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Make a Post</Text>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="title"
              placeholderTextColor="#949494"
              editable={!isSubmitting}
              maxLength={150}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="enter text"
              placeholderTextColor="#949494"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={5000}
            />

            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="location (optional)"
              placeholderTextColor="#949494"
              editable={!isSubmitting}
            />

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.postButton, isSubmitting && styles.postButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    color: '#0E5B37',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 150,
    paddingTop: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#666',
  },
  postButton: {
    backgroundColor: '#0E5B37',
  },
  postButtonDisabled: {
    backgroundColor: '#7FA593',
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
  },
});

