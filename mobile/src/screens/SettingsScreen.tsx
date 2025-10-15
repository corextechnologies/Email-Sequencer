import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { COLORS } from '../constants/colors';

interface Props {
  navigation: any;
}

interface SavedApiKey {
  provider: string;
  hasKey: boolean;
  updatedAt: string;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editApiKey, setEditApiKey] = useState<string>('');
  const [editProvider, setEditProvider] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isProviderModalVisible, setProviderModalVisible] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<null | { valid: boolean; message: string }>(null);
  
  // New API key states
  const [isAddingNewKey, setIsAddingNewKey] = useState<boolean>(false);
  const [newProvider, setNewProvider] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const providers = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'claude', label: 'Anthropic Claude' },
    { id: 'gemini', label: 'Google Gemini' },
    { id: 'mistral', label: 'Mistral' },
    { id: 'groq', label: 'Groq' },
    { id: 'cohere', label: 'Cohere' },
    { id: 'perplexity', label: 'Perplexity' },
  ];

  useEffect(() => {
    loadSavedKeys();
  }, []);

  const loadSavedKeys = async () => {
    try {
      console.log('Loading saved keys...');
      setIsLoadingKeys(true);
      const keys = await ApiService.getSavedLlmKeys();
      console.log('Loaded keys:', keys);
      setSavedKeys(keys);
    } catch (error) {
      console.error('Failed to load saved keys:', error);
    } finally {
      setIsLoadingKeys(false);
    }
  };


  const handleEditKey = (provider: string) => {
    setEditingKey(provider);
    setEditApiKey('');
    setEditProvider(provider);
  };

  const handleTestEditKey = async () => {
    if (!editProvider || !editApiKey) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const result = await ApiService.testLlmKey(editProvider, editApiKey);
      if (result.valid) {
        setTestStatus({ valid: true, message: 'API key is valid.' });
      } else {
        setTestStatus({ valid: false, message: result.error || 'Invalid API key.' });
      }
    } catch (error: any) {
      setTestStatus({ valid: false, message: error?.response?.data?.error?.message || 'Validation failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey || !editApiKey || !editProvider) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    setIsUpdating(true);
    try {
      // If provider changed, we need to delete the old key and create a new one
      if (editProvider !== editingKey) {
        // Delete old key first
        await ApiService.deleteLlmKey(editingKey);
        // Create new key with new provider
        const res = await ApiService.saveLlmKey(editProvider, editApiKey);
        if (res.success) {
          Alert.alert('Success', 'API key updated successfully.');
          setEditingKey(null);
          setEditApiKey('');
          setEditProvider('');
          setTestStatus(null);
          await loadSavedKeys(); // Refresh the list
        } else {
          Alert.alert('Error', 'Failed to update API key.');
        }
      } else {
        // Just update the key for the same provider
        const res = await ApiService.updateLlmKey(editingKey, editApiKey);
        if (res.success) {
          Alert.alert('Success', 'API key updated successfully.');
          setEditingKey(null);
          setEditApiKey('');
          setEditProvider('');
          setTestStatus(null);
          await loadSavedKeys(); // Refresh the list
        } else {
          Alert.alert('Error', 'Failed to update API key.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to update API key.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditApiKey('');
    setEditProvider('');
    setTestStatus(null);
  };

  const handleSelectEditProvider = (id: string) => {
    setEditProvider(id);
    setProviderModalVisible(false);
    setTestStatus(null);
  };

  const handleAddNewKey = () => {
    setIsAddingNewKey(true);
    setNewProvider('');
    setNewApiKey('');
    setTestStatus(null);
  };

  const handleSelectNewProvider = (id: string) => {
    setNewProvider(id);
    setProviderModalVisible(false);
    setTestStatus(null);
  };

  const handleTestNewKey = async () => {
    if (!newProvider || !newApiKey) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const result = await ApiService.testLlmKey(newProvider, newApiKey);
      if (result.valid) {
        setTestStatus({ valid: true, message: 'API key is valid.' });
      } else {
        setTestStatus({ valid: false, message: result.error || 'Invalid API key.' });
      }
    } catch (error: any) {
      setTestStatus({ valid: false, message: error?.response?.data?.error?.message || 'Validation failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveNewKey = async () => {
    if (!newProvider || !newApiKey) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    console.log('Attempting to save new key:', { provider: newProvider, keyLength: newApiKey.length });
    setIsSaving(true);
    try {
      const res = await ApiService.saveLlmKey(newProvider, newApiKey);
      console.log('Save result:', res);
      if (res.success) {
        // Clear the form first
        setIsAddingNewKey(false);
        setNewProvider('');
        setNewApiKey('');
        setTestStatus(null);
        
        // Refresh the keys list to show the newly saved key
        await loadSavedKeys();
        
        // Show success message after UI has updated
        Alert.alert('Success', 'API key saved successfully.');
      } else {
        console.error('Save failed - success was false');
        Alert.alert('Error', 'Failed to save API key.');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAddNew = () => {
    setIsAddingNewKey(false);
    setNewProvider('');
    setNewApiKey('');
    setTestStatus(null);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Profile',
      icon: 'person-outline',
      onPress: () => {
        navigation.navigate('Profile');
      },
    },
    // {
    //   id: 'notifications',
    //   title: 'Notifications',
    //   icon: 'notifications-outline',
    //   onPress: () => {
    //     Alert.alert('Coming Soon', 'Notification settings will be available soon');
    //   },
    // },
    {
      id: 'about',
      title: 'About',
      icon: 'information-circle-outline',
      onPress: () => {
        Alert.alert(
          'Bobos Smart Email Sequencer',
          'Get to Know the Bobos.ai Team',
          [
            { text: 'OK', style: 'cancel' },
            { 
              text: 'Visit Website', 
              onPress: () => Linking.openURL('https://bobos.ai'),
              style: 'default'
            }
          ]
        );
      },
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => {
        Linking.openURL('https://bobos.ai');
      },
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Settings</Text>
          </View>
          <Image 
            source={require('../../assets/boboslogo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userJoined}>
              Member since {user ? new Date(user.created_at).getFullYear() : '2025'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>General</Text>
        {settingsOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.settingItem}
            onPress={option.onPress}
          >
            <View style={styles.settingContent}>
              <Ionicons name={option.icon as any} size={24} color="#666" />
              <Text style={styles.settingTitle}>{option.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>LLM Integration</Text>

        {/* Existing API Keys */}
        {isLoadingKeys ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading API keys...</Text>
          </View>
        ) : savedKeys.length > 0 ? (
          <View style={styles.existingKeysContainer}>
            <Text style={styles.subsectionTitle}>Saved API Keys</Text>
            {savedKeys.map((key) => (
              <View key={key.provider} style={styles.keyItem}>
                <View style={styles.keyInfo}>
                  <Text style={styles.keyProvider}>
                    {providers.find(p => p.id === key.provider)?.label || key.provider}
                  </Text>
                  <Text style={styles.keyDate}>
                    Updated: {new Date(key.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
                {editingKey === key.provider ? (
                  <View style={styles.editContainer}>
                    {/* Provider Selection */}
                    <Text style={styles.editLabel}>Provider</Text>
                    <TouchableOpacity
                      style={styles.editSelector}
                      onPress={() => setProviderModalVisible(true)}
                    >
                      <Text style={styles.editSelectorText}>
                        {editProvider ? (providers.find(p => p.id === editProvider)?.label || editProvider) : 'Select provider'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#666" />
                    </TouchableOpacity>

                    {/* API Key input */}
                    <Text style={styles.editLabel}>API Key</Text>
                    <TextInput
                      value={editApiKey}
                      onChangeText={setEditApiKey}
                      placeholder="Enter new API key"
                      placeholderTextColor="#999"
                      style={styles.editInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />

                    {/* Test button */}
                    <TouchableOpacity
                      style={[styles.testButton, (!editProvider || !editApiKey || isTesting) && styles.actionButtonDisabled]}
                      onPress={handleTestEditKey}
                      disabled={!editProvider || !editApiKey || isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <Text style={styles.testButtonText}>Test Key</Text>
                      )}
                    </TouchableOpacity>

                    {/* Test result */}
                    {testStatus && (
                      <View style={[styles.testResult, { backgroundColor: testStatus.valid ? '#E6F9EE' : '#FDE8EA', borderColor: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                        <Ionicons name={testStatus.valid ? 'checkmark-circle' : 'close-circle'} size={18} color={testStatus.valid ? COLORS.status.success : COLORS.status.error} />
                        <Text style={[styles.testResultText, { color: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                          {testStatus.message}
                        </Text>
                      </View>
                    )}

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.editButton, styles.cancelButton]}
                        onPress={handleCancelEdit}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButton, styles.updateButton, (!editApiKey || !editProvider || isUpdating) && styles.actionButtonDisabled]}
                        onPress={handleUpdateKey}
                        disabled={!editApiKey || !editProvider || isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator color={COLORS.text.white} size="small" />
                        ) : (
                          <Text style={styles.updateButtonText}>Update</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.editKeyButton}
                    onPress={() => handleEditKey(key.provider)}
                  >
                    <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.editKeyText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noKeysContainer}>
            <Ionicons name="key-outline" size={48} color={COLORS.icon.light} />
            <Text style={styles.noKeysTitle}>No API Keys Saved</Text>
            <Text style={styles.noKeysText}>
              You need to set up an API key to use AI features. Add your first API key below.
            </Text>
            
            {!isAddingNewKey ? (
              <TouchableOpacity style={styles.addFirstKeyButton} onPress={handleAddNewKey}>
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addFirstKeyText}>Add Your First API Key</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addNewKeyForm}>
                <Text style={styles.subsectionTitle}>Add New API Key</Text>
                
                {/* Provider Selection */}
                <Text style={styles.label}>Provider</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setProviderModalVisible(true)}
                >
                  <Text style={styles.selectorText}>
                    {newProvider ? (providers.find(p => p.id === newProvider)?.label || newProvider) : 'Select provider'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#666" />
                </TouchableOpacity>

                {/* API Key Input */}
                <Text style={[styles.label, { marginTop: 16 }]}>API Key</Text>
                <TextInput
                  value={newApiKey}
                  onChangeText={setNewApiKey}
                  placeholder="Enter your API key"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />

                {/* Test + Save buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary }, (!newProvider || !newApiKey || isTesting) && styles.actionButtonDisabled]}
                    onPress={handleTestNewKey}
                    disabled={!newProvider || !newApiKey || isTesting}
                  >
                    {isTesting ? (
                      <ActivityIndicator color={COLORS.text.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>Test Key</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.status.success }, (!newProvider || !newApiKey || isSaving) && styles.actionButtonDisabled]}
                    onPress={handleSaveNewKey}
                    disabled={!newProvider || !newApiKey || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={COLORS.text.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Test result */}
                {testStatus && (
                  <View style={[styles.testResult, { backgroundColor: testStatus.valid ? '#E6F9EE' : '#FDE8EA', borderColor: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                    <Ionicons name={testStatus.valid ? 'checkmark-circle' : 'close-circle'} size={18} color={testStatus.valid ? COLORS.status.success : COLORS.status.error} />
                    <Text style={[styles.testResultText, { color: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                      {testStatus.message}
                    </Text>
                  </View>
                )}

                {/* Cancel button */}
                <TouchableOpacity style={styles.cancelAddButton} onPress={handleCancelAddNew}>
                  <Text style={styles.cancelAddText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </View>

      {/* Provider selection modal */}
      <Modal visible={isProviderModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Provider</Text>
            {providers.map(p => (
              <TouchableOpacity key={p.id} style={styles.modalOption} onPress={() => {
                if (isAddingNewKey) {
                  handleSelectNewProvider(p.id);
                } else {
                  handleSelectEditProvider(p.id);
                }
              }}>
                <Text style={styles.modalOptionText}>{p.label}</Text>
                {((isAddingNewKey && newProvider === p.id) || (!isAddingNewKey && editProvider === p.id)) && 
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                }
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setProviderModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.dangerSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.status.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Developed by The CorexTech
        </Text>
        <Text style={styles.footerSubtext}>
          © 2025 Bobos.ai. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  header: {
    backgroundColor: COLORS.background.primary,
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  logo: {
    width: 150,
    height: 40,
    marginLeft: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  userSection: {
    backgroundColor: COLORS.background.primary,
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  userJoined: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  settingsSection: {
    backgroundColor: COLORS.background.primary,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  selector: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    color: COLORS.text.primary,
    fontSize: 16,
  },
  input: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    color: COLORS.text.primary,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  testResult: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testResultText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.background.primary,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: COLORS.text.primary,
  },
  modalOption: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  modalCancel: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 15,
    fontWeight: '500',
  },
  dangerSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: COLORS.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.status.error,
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.text.light,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  existingKeysContainer: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  keyItem: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyInfo: {
    flex: 1,
  },
  keyProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  keyDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  editKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  editKeyText: {
    marginLeft: 4,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  editContainer: {
    flex: 1,
    marginLeft: 10,
  },
  editInput: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    color: COLORS.text.primary,
    fontSize: 14,
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  cancelButtonText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  updateButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '500',
  },
  addNewSection: {
    marginTop: 10,
  },
  editLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  editSelector: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editSelectorText: {
    color: COLORS.text.primary,
    fontSize: 14,
  },
  testButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  noKeysContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noKeysTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noKeysText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  addFirstKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  addFirstKeyText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addNewKeyForm: {
    marginTop: 20,
    padding: 20,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 10,
  },
  cancelAddButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  cancelAddText: {
    color: COLORS.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SettingsScreen;
