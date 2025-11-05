import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert, Linking, Platform } from 'react-native';

interface UpdateRequiredModalProps {
  visible: boolean;
  requiredVersion: string;
  currentVersion: string;
  message?: string;
  onDismiss?: () => void;
}

export function UpdateRequiredModal({ 
  visible, 
  requiredVersion, 
  currentVersion,
  message,
  onDismiss 
}: UpdateRequiredModalProps) {
  const handleUpdate = () => {
    // Replace with your APK download link or Play Store URL
    // TODO: Update this URL with your actual download link
    const updateUrl = 'https://corex-tech.com/'; 
    // Or use Play Store: const updateUrl = `https://play.google.com/store/apps/details?id=com.anonymous.emailmarketingbobos`;
    
    Linking.openURL(updateUrl).catch(() => {
      Alert.alert('Error', 'Unable to open update link. Please download manually from the website.');
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing - force update
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            {message || `Your app version (${currentVersion}) is outdated. Please update to version ${requiredVersion} to continue using the app. Or contact thecorextech@gmail.com for assistance.`}
          </Text>
          <Text style={styles.subMessage}>
            Outdated version detected. Please get the new and updated version.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>
          </View>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#666',
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    marginTop: 12,
    padding: 8,
  },
  dismissText: {
    color: '#666',
    fontSize: 14,
  },
});

