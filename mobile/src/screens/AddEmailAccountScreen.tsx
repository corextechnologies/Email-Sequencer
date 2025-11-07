import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';
import { CreateEmailAccountRequest } from '../types';

interface Props {
  navigation: any;
}

const AddEmailAccountScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState<CreateEmailAccountRequest>({
    provider: '',
    imap_host: '',
    imap_port: 993,
    smtp_host: '',
    smtp_port: 587,
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const presetProviders = [
    {
      name: 'Gmail',
      provider: 'gmail',
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
    },
    {
      name: 'Outlook',
      provider: 'outlook',
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
    },
    {
      name: 'Yahoo',
      provider: 'yahoo',
      imap_host: 'imap.mail.yahoo.com',
      imap_port: 993,
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 587,
    },
  ];

  const selectProvider = (preset: any) => {
    setFormData({
      ...formData,
      provider: preset.provider,
      imap_host: preset.imap_host,
      imap_port: preset.imap_port,
      smtp_host: preset.smtp_host,
      smtp_port: preset.smtp_port,
    });
  };

  const handleAddAccount = async () => {
    if (!formData.provider || !formData.username || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.imap_host || !formData.smtp_host) {
      Alert.alert('Error', 'Please provide IMAP and SMTP host information');
      return;
    }

    setIsLoading(true);
    try {
      await ApiService.createEmailAccount(formData);
      Alert.alert('Success', 'Email account added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add email account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Email Account</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.presetSection}>
            <Text style={styles.sectionTitle}>Quick Setup</Text>
            <View style={styles.presetButtons}>
              {presetProviders.map((preset) => (
                <TouchableOpacity
                  key={preset.provider}
                  style={[
                    styles.presetButton,
                    formData.provider === preset.provider && styles.presetButtonActive
                  ]}
                  onPress={() => selectProvider(preset)}
                >
                  <Text style={[
                    styles.presetButtonText,
                    formData.provider === preset.provider && styles.presetButtonTextActive
                  ]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provider Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.provider}
              onChangeText={(text) => setFormData({ ...formData, provider: text })}
              placeholder="e.g., gmail, outlook, custom"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="App password or account password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.serverSection}>
            <Text style={styles.sectionTitle}>IMAP Settings</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 2 }]}>
                <Text style={styles.label}>IMAP Host *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.imap_host}
                  onChangeText={(text) => setFormData({ ...formData, imap_host: text })}
                  placeholder="imap.example.com"
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={formData.imap_port.toString()}
                  onChangeText={(text) => setFormData({ ...formData, imap_port: parseInt(text) || 993 })}
                  placeholder="993"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.serverSection}>
            <Text style={styles.sectionTitle}>SMTP Settings</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 2 }]}>
                <Text style={styles.label}>SMTP Host *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.smtp_host}
                  onChangeText={(text) => setFormData({ ...formData, smtp_host: text })}
                  placeholder="smtp.example.com"
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={formData.smtp_port.toString()}
                  onChangeText={(text) => setFormData({ ...formData, smtp_port: parseInt(text) || 587 })}
                  placeholder="587"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, isLoading && styles.addButtonDisabled]}
            onPress={handleAddAccount}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>
              {isLoading ? 'Adding Account...' : 'Add Email Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    padding: 20,
  },
  presetSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  presetButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  presetButtonTextActive: {
    color: '#007AFF',
  },
  serverSection: {
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 15,
    paddingLeft: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddEmailAccountScreen;
