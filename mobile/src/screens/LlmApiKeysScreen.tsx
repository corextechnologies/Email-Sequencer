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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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

const LlmApiKeysScreen: React.FC<Props> = ({ navigation }) => {
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editApiKey, setEditApiKey] = useState<string>('');
  const [editApiKeyActual, setEditApiKeyActual] = useState<string>('');
  const [editProvider, setEditProvider] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isProviderModalVisible, setProviderModalVisible] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<null | { valid: boolean; message: string }>(null);
  const [isApiKeyInfoModalVisible, setIsApiKeyInfoModalVisible] = useState<boolean>(false);
  
  // New API key states
  const [isAddingNewKey, setIsAddingNewKey] = useState<boolean>(false);
  const [newProvider, setNewProvider] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [newApiKeyActual, setNewApiKeyActual] = useState<string>('');
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

  // Reload keys when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSavedKeys();
    }, [])
  );

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
    // Show masked asterisks for existing key (using typical API key length of 48 characters)
    setEditApiKey('*'.repeat(48));
    setEditApiKeyActual('');
    setEditProvider(provider);
  };

  const handleTestEditKey = async () => {
    if (!editProvider || !editApiKeyActual) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const result = await ApiService.testLlmKey(editProvider, editApiKeyActual);
      if (result.valid) {
        setTestStatus({ valid: true, message: 'API key is valid.' });
        setEditApiKey('*'.repeat(editApiKeyActual.length));
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
    if (!editingKey || !editApiKeyActual || !editProvider) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    setIsUpdating(true);
    try {
      if (editProvider !== editingKey) {
        await ApiService.deleteLlmKey(editingKey);
        const res = await ApiService.saveLlmKey(editProvider, editApiKeyActual);
        if (res.success) {
          Alert.alert('Success', 'API key updated successfully.');
          setEditingKey(null);
          setEditApiKey('');
          setEditApiKeyActual('');
          setEditProvider('');
          setTestStatus(null);
          await loadSavedKeys();
        } else {
          Alert.alert('Error', 'Failed to update API key.');
        }
      } else {
        const res = await ApiService.updateLlmKey(editingKey, editApiKeyActual);
        if (res.success) {
          Alert.alert('Success', 'API key updated successfully.');
          setEditingKey(null);
          setEditApiKey('');
          setEditApiKeyActual('');
          setEditProvider('');
          setTestStatus(null);
          await loadSavedKeys();
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
    setEditApiKeyActual('');
    setEditProvider('');
    setTestStatus(null);
  };

  const handleDeleteKey = async (provider: string) => {
    const providerLabel = providers.find(p => p.id === provider)?.label || provider;
    
    Alert.alert(
      'Delete API Key',
      `Are you sure you want to delete the ${providerLabel} API key? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ApiService.deleteLlmKey(provider);
              if (result.success) {
                Alert.alert('Success', 'API key deleted successfully.');
                await loadSavedKeys();
                if (editingKey === provider) {
                  setEditingKey(null);
                  setEditApiKey('');
                  setEditProvider('');
                }
              } else {
                Alert.alert('Error', 'Failed to delete API key.');
              }
            } catch (error: any) {
              console.error('Delete key error:', error);
              Alert.alert(
                'Error',
                error?.response?.data?.error?.message || 'Failed to delete API key. Please try again.'
              );
            }
          }
        }
      ]
    );
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
    setNewApiKeyActual('');
    setTestStatus(null);
  };

  const handleSelectNewProvider = (id: string) => {
    setNewProvider(id);
    setProviderModalVisible(false);
    setTestStatus(null);
  };

  const handleTestNewKey = async () => {
    if (!newProvider || !newApiKeyActual) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const result = await ApiService.testLlmKey(newProvider, newApiKeyActual);
      if (result.valid) {
        setTestStatus({ valid: true, message: 'API key is valid.' });
        setNewApiKey('*'.repeat(newApiKeyActual.length));
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
    if (!newProvider || !newApiKeyActual) {
      Alert.alert('Validation', 'Please select a provider and enter an API key.');
      return;
    }
    console.log('Attempting to save new key:', { provider: newProvider, keyLength: newApiKeyActual.length });
    setIsSaving(true);
    try {
      const res = await ApiService.saveLlmKey(newProvider, newApiKeyActual);
      console.log('Save result:', res);
      if (res.success) {
        setIsAddingNewKey(false);
        setNewProvider('');
        setNewApiKey('');
        setNewApiKeyActual('');
        setTestStatus(null);
        await loadSavedKeys();
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
    setNewApiKeyActual('');
    setTestStatus(null);
  };

  const handleEditApiKeyChange = (text: string) => {
    setEditApiKeyActual(text);
    setEditApiKey(text);
  };

  const handleNewApiKeyChange = (text: string) => {
    setNewApiKeyActual(text);
    setNewApiKey(text);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>LLM API Keys</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
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

                    <Text style={styles.editLabel}>API Key</Text>
                    <TextInput
                      value={editApiKey}
                      onChangeText={handleEditApiKeyChange}
                      onFocus={() => setIsApiKeyInfoModalVisible(true)}
                      placeholder="Enter new API key"
                      placeholderTextColor="#999"
                      style={styles.editInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!!editApiKey && editApiKey === '*'.repeat(editApiKeyActual.length)}
                    />

                    <TouchableOpacity
                      style={[styles.testButton, (!editProvider || !editApiKeyActual || isTesting) && styles.actionButtonDisabled]}
                      onPress={handleTestEditKey}
                      disabled={!editProvider || !editApiKeyActual || isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <Text style={styles.testButtonText}>Test Key</Text>
                      )}
                    </TouchableOpacity>

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
                        style={[styles.editButton, styles.updateButton, (!editApiKeyActual || !editProvider || isUpdating) && styles.actionButtonDisabled]}
                        onPress={handleUpdateKey}
                        disabled={!editApiKeyActual || !editProvider || isUpdating}
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
                  <View style={styles.keyActions}>
                    <TouchableOpacity
                      style={styles.editKeyButton}
                      onPress={() => handleEditKey(key.provider)}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.editKeyText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteKeyButton}
                      onPress={() => handleDeleteKey(key.provider)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.status.error} />
                      <Text style={styles.deleteKeyText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {!isAddingNewKey && (
              <TouchableOpacity style={styles.addKeyButton} onPress={handleAddNewKey}>
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addKeyText}>Add New API Key</Text>
              </TouchableOpacity>
            )}
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

                <Text style={[styles.label, { marginTop: 16 }]}>API Key</Text>
                <TextInput
                  value={newApiKey}
                  onChangeText={handleNewApiKeyChange}
                  onFocus={() => setIsApiKeyInfoModalVisible(true)}
                  placeholder="Enter your API key"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!!newApiKey && newApiKey === '*'.repeat(newApiKeyActual.length)}
                />

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary }, (!newProvider || !newApiKeyActual || isTesting) && styles.actionButtonDisabled]}
                    onPress={handleTestNewKey}
                    disabled={!newProvider || !newApiKeyActual || isTesting}
                  >
                    {isTesting ? (
                      <ActivityIndicator color={COLORS.text.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>Test Key</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.status.success }, (!newProvider || !newApiKeyActual || isSaving) && styles.actionButtonDisabled]}
                    onPress={handleSaveNewKey}
                    disabled={!newProvider || !newApiKeyActual || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={COLORS.text.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {testStatus && (
                  <View style={[styles.testResult, { backgroundColor: testStatus.valid ? '#E6F9EE' : '#FDE8EA', borderColor: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                    <Ionicons name={testStatus.valid ? 'checkmark-circle' : 'close-circle'} size={18} color={testStatus.valid ? COLORS.status.success : COLORS.status.error} />
                    <Text style={[styles.testResultText, { color: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                      {testStatus.message}
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={styles.cancelAddButton} onPress={handleCancelAddNew}>
                  <Text style={styles.cancelAddText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {isAddingNewKey && savedKeys.length > 0 && (
          <View style={styles.addNewKeyForm}>
            <Text style={styles.subsectionTitle}>Add New API Key</Text>
            
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

            <Text style={[styles.label, { marginTop: 16 }]}>API Key</Text>
            <TextInput
              value={newApiKey}
              onChangeText={handleNewApiKeyChange}
              onFocus={() => setIsApiKeyInfoModalVisible(true)}
              placeholder="Enter your API key"
              placeholderTextColor="#999"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!!newApiKey && newApiKey === '*'.repeat(newApiKeyActual.length)}
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.primary }, (!newProvider || !newApiKeyActual || isTesting) && styles.actionButtonDisabled]}
                onPress={handleTestNewKey}
                disabled={!newProvider || !newApiKeyActual || isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator color={COLORS.text.white} />
                ) : (
                  <Text style={styles.actionButtonText}>Test Key</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.status.success }, (!newProvider || !newApiKeyActual || isSaving) && styles.actionButtonDisabled]}
                onPress={handleSaveNewKey}
                disabled={!newProvider || !newApiKeyActual || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.text.white} />
                ) : (
                  <Text style={styles.actionButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {testStatus && (
              <View style={[styles.testResult, { backgroundColor: testStatus.valid ? '#E6F9EE' : '#FDE8EA', borderColor: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                <Ionicons name={testStatus.valid ? 'checkmark-circle' : 'close-circle'} size={18} color={testStatus.valid ? COLORS.status.success : COLORS.status.error} />
                <Text style={[styles.testResultText, { color: testStatus.valid ? COLORS.status.success : COLORS.status.error }]}>
                  {testStatus.message}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.cancelAddButton} onPress={handleCancelAddNew}>
              <Text style={styles.cancelAddText}>Cancel</Text>
            </TouchableOpacity>
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

      {/* API Key Info Modal */}
      <Modal visible={isApiKeyInfoModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>API Key Information</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalInfoText}>
                Your API key will be securely stored and encrypted. After verification, it will be displayed as asterisks (*) for security purposes.
              </Text>
              <Text style={styles.modalInfoText}>
                <Text style={styles.modalInfoBold}>Security Note:</Text> Your API key is encrypted and stored securely. It will remain visible while you type, but will be masked after verification.
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.modalCancel, { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 12 }]} 
              onPress={() => setIsApiKeyInfoModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: COLORS.text.white, fontWeight: '600' }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
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
  keyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  deleteKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FDE8EA',
    borderRadius: 8,
  },
  deleteKeyText: {
    marginLeft: 4,
    color: COLORS.status.error,
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
  actionButtonDisabled: {
    opacity: 0.6,
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
  addKeyButton: {
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
  addKeyText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  actionButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  modalContent: {
    marginBottom: 20,
  },
  modalInfoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  modalInfoBold: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

export default LlmApiKeysScreen;

