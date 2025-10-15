import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../navigation/MainNavigator';
import { contactsService } from '../services/contactsService';
import { PhoneContact } from '../types/contacts';

const { width } = Dimensions.get('window');

type ImportContactsPhoneScreenNavigationProp = StackNavigationProp<ContactsStackParamList, 'ImportContactsPhone'>;

interface PhoneContactsPreview {
  contacts: PhoneContact[];
  totalContacts: number;
  contactsWithEmail: number;
  contactsWithPhone: number;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

const ImportContactsPhoneScreen: React.FC = () => {
  const navigation = useNavigation<ImportContactsPhoneScreenNavigationProp>();
  const [deviceContacts, setDeviceContacts] = useState<PhoneContact[]>([]);
  const [preview, setPreview] = useState<PhoneContactsPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    checkContactsPermission();
  }, []);

  const checkContactsPermission = async () => {
    try {
      console.log('Checking phone contacts permission...');
      console.log('Platform.OS:', Platform.OS);
      
      // Use expo-contacts permission methods for both platforms
      const { status } = await Contacts.requestPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status === 'granted') {
        console.log('Contacts permission granted');
        setPermissionGranted(true);
        setPermissionError(null);
      } else {
        console.log('Contacts permission denied');
        setPermissionError('Contacts permission denied');
        setPermissionGranted(false);
      }
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      setPermissionError('Failed to check contacts permission');
      setPermissionGranted(false);
    }
  };

  const loadDeviceContacts = async () => {
    setLoading(true);
    setPermissionError(null);
    
    try {
      console.log('Loading device contacts...');
      
      // Check permission again before making the API call
      const { status } = await Contacts.getPermissionsAsync();
      console.log('Permission check before API call:', status);
      
      if (status !== 'granted') {
        throw new Error('Missing read contacts permission.');
      }
      
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.Emails,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Company,
          Contacts.Fields.JobTitle,
        ],
      });

      console.log(`Found ${data.length} contacts on device`);
      
      // Filter contacts that have at least email or phone
      const validContacts = data.filter(contact => 
        (contact.emails && contact.emails.length > 0) || 
        (contact.phoneNumbers && contact.phoneNumbers.length > 0)
      );

      console.log(`${validContacts.length} contacts have email or phone numbers`);

      const phoneContacts: PhoneContact[] = validContacts.map(contact => ({
        id: contact.id,
        name: contact.name || '',
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        phoneNumbers: contact.phoneNumbers?.map(phone => ({
          label: phone.label || 'mobile',
          number: phone.number || ''
        })) || [],
        emails: contact.emails?.map(email => ({
          label: email.label || 'work',
          email: email.email || ''
        })) || [],
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
      }));

      setDeviceContacts(phoneContacts);
      
      const preview: PhoneContactsPreview = {
        contacts: phoneContacts.slice(0, 5), // Show first 5 for preview
        totalContacts: phoneContacts.length,
        contactsWithEmail: phoneContacts.filter(c => c.emails && c.emails.length > 0).length,
        contactsWithPhone: phoneContacts.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0).length,
      };
      
      setPreview(preview);
      setImportResult(null);
      
    } catch (error) {
      console.error('Error loading device contacts:', error);
      Alert.alert('Error', 'Failed to load device contacts. Please try again.');
      setPermissionError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const importPhoneContacts = async () => {
    if (!preview || deviceContacts.length === 0) return;

    Alert.alert(
      'Import Phone Contacts',
      `This will import ${preview.totalContacts} contacts from your device. Only contacts with email addresses will be imported. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: performImport }
      ]
    );
  };

  const performImport = async () => {
    setImporting(true);
    try {
      console.log('Starting phone contacts import...');
      
      // Filter contacts that have email addresses (required for our system)
      const contactsWithEmail = deviceContacts.filter(contact => 
        contact.emails && contact.emails.length > 0
      );

      console.log(`${contactsWithEmail.length} contacts have email addresses`);

      if (contactsWithEmail.length === 0) {
        Alert.alert('No Valid Contacts', 'No contacts with email addresses found. Email is required for import.');
        setImporting(false);
        return;
      }

      // Try to use backend API first, fallback to frontend processing
      try {
        console.log('Attempting to use backend phone import API...');
        
        const importData = {
          contacts: contactsWithEmail.map(contact => ({
            first_name: contact.firstName || '',
            last_name: contact.lastName || '',
            email: contact.emails![0].email,
            phone: contact.phoneNumbers?.[0]?.number || undefined,
            company: contact.company || undefined,
            job_title: contact.jobTitle || undefined,
            source: 'phone' as const,
          }))
        };

        const response = await contactsService.importPhoneContacts(importData.contacts);
        setImportResult(response.results);
        
        Alert.alert(
          'Import Complete',
          `Successfully imported ${response.results.success} contacts.\n${response.results.duplicates} duplicates skipped.\n${response.results.failed} failed.`,
          [
            {
              text: 'View Contacts',
              onPress: () => navigation.navigate('ContactsList')
            },
            { text: 'OK' }
          ]
        );
      } catch (apiError) {
        console.log('Backend phone import API not available, using frontend processing');
        
        // Fallback to frontend processing
        const result = await processContactsFrontend(contactsWithEmail);
        setImportResult(result);
        
        Alert.alert(
          'Import Complete (Frontend)',
          `Successfully imported ${result.success} contacts.\n${result.duplicates} duplicates skipped.\n${result.failed} failed.`,
          [
            {
              text: 'View Contacts',
              onPress: () => navigation.navigate('ContactsList')
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('Error importing phone contacts:', error);
      Alert.alert('Error', 'Failed to import phone contacts. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const processContactsFrontend = async (contacts: PhoneContact[]): Promise<ImportResult> => {
    console.log('Processing phone contacts on frontend...');
    
    const errors: Array<{ row: number; error: string; data: any }> = [];
    let success = 0;
    let failed = 0;
    let duplicates = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      try {
        const contact = contacts[i];
        
        // Validate contact data
        if (!contact.emails || contact.emails.length === 0) {
          failed++;
          errors.push({
            row: i + 1,
            error: 'No email address',
            data: contact
          });
          continue;
        }

        console.log(`Processing contact ${i + 1}: ${contact.name || contact.firstName}`);
        
        // Create contact data for the backend
        const contactData = {
          first_name: contact.firstName || '',
          last_name: contact.lastName || '',
          email: contact.emails[0].email,
          phone: contact.phoneNumbers && contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0].number : undefined,
          company: contact.company || undefined,
          job_title: contact.jobTitle || undefined,
          subscribed: true,
          source: 'phone'
        };

        // Actually create the contact using the contacts service
        await contactsService.createContact(contactData);
        success++;
        
      } catch (error) {
        console.error(`Error processing contact ${i + 1}:`, error);
        
        // Check if it's a duplicate error
        if (error instanceof Error && error.message.includes('duplicate')) {
          duplicates++;
        } else {
          failed++;
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: contacts[i]
          });
        }
      }
    }
    
    return { success, failed, duplicates, errors };
  };

  const renderContactPreview = ({ item, index }: { item: PhoneContact; index: number }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactAvatar}>
          <Text style={styles.avatarText}>
            {(item.firstName?.charAt(0) || item.name?.charAt(0) || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name || `${item.firstName} ${item.lastName}`.trim() || 'Unknown'}
          </Text>
          {item.emails && item.emails.length > 0 && (
            <Text style={styles.contactEmail} numberOfLines={1}>
              {item.emails[0].email}
            </Text>
          )}
          {item.company && (
            <Text style={styles.contactOrg} numberOfLines={1}>
              {item.company}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.contactFields}>
        {item.emails && item.emails.length > 0 && (
          <View style={styles.fieldRow}>
            <Ionicons name="mail-outline" size={16} color="#06b6d4" />
            <Text style={styles.fieldText}>{item.emails.length} email(s)</Text>
          </View>
        )}
        {item.phoneNumbers && item.phoneNumbers.length > 0 && (
          <View style={styles.fieldRow}>
            <Ionicons name="call-outline" size={16} color="#10b981" />
            <Text style={styles.fieldText}>{item.phoneNumbers.length} phone(s)</Text>
          </View>
        )}
        {item.company && (
          <View style={styles.fieldRow}>
            <Ionicons name="business-outline" size={16} color="#f59e0b" />
            <Text style={styles.fieldText}>{item.company}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPermissionError = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
      </View>
      <Text style={styles.errorTitle}>Permission Required</Text>
      <Text style={styles.errorText}>
        {permissionError || 'This app needs access to your contacts to import them.'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={checkContactsPermission}
      >
        <Text style={styles.retryButtonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  const renderImportGuide = () => (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>Phone Contacts Import</Text>
      <Text style={styles.guideText}>
        Import contacts directly from your device's contact list. We'll import contacts that have email addresses.
      </Text>
      
      <View style={styles.featuresGuide}>
        <View style={styles.guideFeature}>
          <Ionicons name="mail-outline" size={16} color="#06b6d4" />
          <Text style={styles.guideFeatureText}>Email addresses (required)</Text>
        </View>
        <View style={styles.guideFeature}>
          <Ionicons name="call-outline" size={16} color="#06b6d4" />
          <Text style={styles.guideFeatureText}>Phone numbers</Text>
        </View>
        <View style={styles.guideFeature}>
          <Ionicons name="person-outline" size={16} color="#06b6d4" />
          <Text style={styles.guideFeatureText}>Names and company info</Text>
        </View>
        <View style={styles.guideFeature}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#06b6d4" />
          <Text style={styles.guideFeatureText}>Automatic duplicate detection</Text>
        </View>
      </View>
      
      <Text style={styles.guideNote}>
        Note: Only contacts with email addresses will be imported. Phone-only contacts will be skipped.
      </Text>
    </View>
  );

  if (permissionError && !permissionGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#06b6d4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import from Phone</Text>
        </View>
        {renderPermissionError()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#06b6d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import from Phone</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Load Contacts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Contacts</Text>
          
          {!preview ? (
            <TouchableOpacity
              style={styles.loadButton}
              onPress={loadDeviceContacts}
              disabled={loading || !permissionGranted}
            >
              <Ionicons 
                name="phone-portrait-outline" 
                size={32} 
                color="#06b6d4" 
              />
              <Text style={styles.loadButtonText}>
                {loading ? 'Loading Contacts...' : 'Load Device Contacts'}
              </Text>
              {loading && (
                <ActivityIndicator size="small" color="#06b6d4" style={styles.loadingSpinner} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.loadedContainer}>
              <View style={styles.loadedIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              </View>
              <Text style={styles.loadedText}>Contacts Loaded Successfully</Text>
              <TouchableOpacity
                style={styles.reloadButton}
                onPress={loadDeviceContacts}
              >
                <Text style={styles.reloadButtonText}>Reload Contacts</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Loading contacts from device...</Text>
          </View>
        )}

        {/* Preview Section */}
        {preview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            
            <View style={styles.previewStats}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{preview.totalContacts}</Text>
                <Text style={styles.statLabel}>Total Contacts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{preview.contactsWithEmail}</Text>
                <Text style={styles.statLabel}>With Email</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{preview.contactsWithPhone}</Text>
                <Text style={styles.statLabel}>With Phone</Text>
              </View>
            </View>
            
            <Text style={styles.previewTitle}>Contact Preview (First 5 contacts):</Text>
            <FlatList
              data={preview.contacts}
              renderItem={renderContactPreview}
              keyExtractor={(item, index) => item.id || index.toString()}
              scrollEnabled={false}
              style={styles.contactsList}
            />

            {preview.contacts.length > 5 && (
              <Text style={styles.moreContactsText}>
                ... and {preview.contacts.length - 5} more contacts
              </Text>
            )}

            <TouchableOpacity
              style={[styles.importButton, importing && styles.importButtonDisabled]}
              onPress={importPhoneContacts}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#fff" />
              )}
              <Text style={styles.importButtonText}>
                {importing ? 'Importing...' : 'Import Contacts'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Import Results */}
        {importResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Import Results</Text>
            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <View style={[styles.resultIcon, styles.resultIconSuccess]}>
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                </View>
                <Text style={styles.resultNumber}>{importResult.success}</Text>
                <Text style={styles.resultLabel}>Imported</Text>
              </View>
              
              <View style={styles.resultStat}>
                <View style={[styles.resultIcon, styles.resultIconWarning]}>
                  <Ionicons name="copy" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.resultNumber}>{importResult.duplicates}</Text>
                <Text style={styles.resultLabel}>Duplicates</Text>
              </View>
              
              <View style={styles.resultStat}>
                <View style={[styles.resultIcon, styles.resultIconError]}>
                  <Ionicons name="close" size={20} color="#ef4444" />
                </View>
                <Text style={styles.resultNumber}>{importResult.failed}</Text>
                <Text style={styles.resultLabel}>Failed</Text>
              </View>
            </View>

            {importResult.errors.length > 0 && (
              <TouchableOpacity
                style={styles.errorsButton}
                onPress={() => {
                  Alert.alert(
                    'Import Errors',
                    `${importResult.errors.length} contacts failed to import. Most common issues: missing email address.`
                  );
                }}
              >
                <Ionicons name="warning-outline" size={16} color="#ef4444" />
                <Text style={styles.errorsButtonText}>
                  View {importResult.errors.length} Error{importResult.errors.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Guide Section */}
        {!preview && renderImportGuide()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  loadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdfa',
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    gap: 12,
  },
  loadButtonText: {
    fontSize: 16,
    color: '#06b6d4',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSpinner: {
    marginTop: 8,
  },
  loadedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadedIcon: {
    marginBottom: 12,
  },
  loadedText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 16,
  },
  reloadButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reloadButtonText: {
    fontSize: 14,
    color: '#06b6d4',
    fontWeight: '500',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  previewStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06b6d4',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  contactsList: {
    marginBottom: 20,
  },
  contactCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactOrg: {
    fontSize: 12,
    color: '#9ca3af',
  },
  contactFields: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  moreContactsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  resultStat: {
    alignItems: 'center',
    gap: 8,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconSuccess: {
    backgroundColor: '#dcfce7',
  },
  resultIconWarning: {
    backgroundColor: '#fef3c7',
  },
  resultIconError: {
    backgroundColor: '#fee2e2',
  },
  resultNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  resultLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorsButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  guideContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  guideText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresGuide: {
    gap: 12,
    marginBottom: 16,
  },
  guideFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  guideFeatureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  guideNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImportContactsPhoneScreen;
