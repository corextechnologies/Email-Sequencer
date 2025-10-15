import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../navigation/MainNavigator';
import { contactsService } from '../services/contactsService';

const { width } = Dimensions.get('window');

type ImportContactsVCFScreenNavigationProp = StackNavigationProp<ContactsStackParamList, 'ImportContactsVCF'>;

interface VCFContact {
  fn?: string; // Full name
  n?: string[]; // Name components [Last, First, Middle, Prefix, Suffix]
  email?: string[];
  tel?: string[];
  org?: string;
  title?: string;
  note?: string;
  rawData?: string;
}

interface VCFPreview {
  contacts: VCFContact[];
  totalContacts: number;
  supportedFields: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

const ImportContactsVCFScreen: React.FC = () => {
  const navigation = useNavigation<ImportContactsVCFScreenNavigationProp>();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [preview, setPreview] = useState<VCFPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const pickVCFFile = async () => {
    try {
      console.log('Opening file picker for VCF files...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/vcard', 'text/x-vcard', 'application/vcard', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
        multiple: false,
        presentationStyle: 'pageSheet',
      });

      console.log('DocumentPicker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected file:', file);
        setSelectedFile(file);
        setImportResult(null); // Reset previous results
        await previewVCFFile(file);
      } else {
        console.log('File selection was canceled');
      }
    } catch (error) {
      console.error('Error picking VCF file:', error);
      Alert.alert('Error', `Failed to pick VCF file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const previewVCFFile = async (file: any) => {
    setLoading(true);
    try {
      console.log('VCF preview not fully implemented yet - using frontend parsing');
      
      // Try to use the backend API first, fallback to frontend parsing
      try {
        const formData = new FormData();
        formData.append('vcfFile', {
          uri: file.uri,
          type: 'text/vcard',
          name: file.name,
        } as any);

        const response = await contactsService.previewVCF(formData);
        setPreview(response);
      } catch (apiError) {
        console.log('Backend VCF preview not available, using frontend parsing');
        
        // Fallback to frontend parsing
        console.log('Reading VCF file content from:', file.uri);
        
        let vcfContent: string;
        try {
          // Try different methods to read the file
          if (file.uri.startsWith('content://') || file.uri.startsWith('file://')) {
            // For Android content URIs or file URIs
            const response = await fetch(file.uri);
            if (!response.ok) {
              throw new Error(`Failed to read file: ${response.status}`);
            }
            vcfContent = await response.text();
          } else {
            // For other URI types, try direct fetch
            const response = await fetch(file.uri);
            vcfContent = await response.text();
          }
          
          console.log('VCF file content length:', vcfContent.length);
          console.log('VCF file content preview:', vcfContent.substring(0, 200));
          
        } catch (readError) {
          console.error('Error reading VCF file:', readError);
          throw new Error(`Failed to read VCF file: ${readError instanceof Error ? readError.message : String(readError)}`);
        }
        
        const parsedContacts = parseVCFContent(vcfContent);
        console.log('Parsed contacts count:', parsedContacts.length);
        
        const preview: VCFPreview = {
          contacts: parsedContacts,
          totalContacts: parsedContacts.length,
          supportedFields: ['FN', 'N', 'EMAIL', 'TEL', 'ORG', 'TITLE', 'NOTE']
        };
        
        setPreview(preview);
      }
    } catch (error) {
      console.error('Error previewing VCF:', error);
      Alert.alert('Error', 'Failed to preview VCF file. Please check the file format.');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const parseVCFContent = (content: string): VCFContact[] => {
    console.log('VCF parsing not fully implemented yet - basic parsing only');
    
    const contacts: VCFContact[] = [];
    const lines = content.split('\n');
    let currentContact: any = {};
    let contactStarted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'BEGIN:VCARD') {
        contactStarted = true;
        currentContact = { rawData: '' };
      } else if (line === 'END:VCARD' && contactStarted) {
        if (currentContact.fn || currentContact.email?.length) {
          contacts.push(currentContact);
        }
        contactStarted = false;
        currentContact = {};
      } else if (contactStarted && line) {
        currentContact.rawData += line + '\n';
        
        // Basic parsing of common VCF fields
        if (line.startsWith('FN:')) {
          currentContact.fn = line.substring(3);
        } else if (line.startsWith('N:')) {
          const nameParts = line.substring(2).split(';');
          currentContact.n = nameParts;
        } else if (line.startsWith('EMAIL') || line.includes('EMAIL')) {
          const emailMatch = line.match(/EMAIL[^:]*:(.+)/);
          if (emailMatch) {
            if (!currentContact.email) currentContact.email = [];
            currentContact.email.push(emailMatch[1]);
          }
        } else if (line.startsWith('TEL') || line.includes('TEL')) {
          const telMatch = line.match(/TEL[^:]*:(.+)/);
          if (telMatch) {
            if (!currentContact.tel) currentContact.tel = [];
            currentContact.tel.push(telMatch[1]);
          }
        } else if (line.startsWith('ORG:')) {
          currentContact.org = line.substring(4);
        } else if (line.startsWith('TITLE:')) {
          currentContact.title = line.substring(6);
        } else if (line.startsWith('NOTE:')) {
          currentContact.note = line.substring(5);
        }
      }
    }

    return contacts;
  };

  const processVCFContactsFrontend = async (contacts: VCFContact[]): Promise<ImportResult> => {
    console.log('Processing VCF contacts on frontend...');
    
    const errors: Array<{ row: number; error: string; data: any }> = [];
    let success = 0;
    let failed = 0;
    let duplicates = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      try {
        const contact = contacts[i];
        
        // Validate contact data - must have email
        if (!contact.email || contact.email.length === 0) {
          failed++;
          errors.push({
            row: i + 1,
            error: 'No email address',
            data: contact
          });
          continue;
        }

        console.log(`Processing VCF contact ${i + 1}: ${contact.fn || 'Unknown'}`);
        
        // Extract name components
        const firstName = contact.n && contact.n.length > 1 ? contact.n[1] : '';
        const lastName = contact.n && contact.n.length > 0 ? contact.n[0] : '';
        const fullName = contact.fn || '';
        
        // If we don't have first/last from N field, try to split FN
        let finalFirstName = firstName;
        let finalLastName = lastName;
        
        if (!finalFirstName && !finalLastName && fullName) {
          const nameParts = fullName.trim().split(' ');
          finalFirstName = nameParts[0] || '';
          finalLastName = nameParts.slice(1).join(' ') || '';
        }
        
        // Create contact data for the backend
        const contactData = {
          first_name: finalFirstName,
          last_name: finalLastName,
          email: contact.email[0], // Use first email
          phone: contact.tel && contact.tel.length > 0 ? contact.tel[0] : undefined,
          company: contact.org || undefined,
          job_title: contact.title || undefined,
          subscribed: true,
          source: 'vcf'
        };

        // Actually create the contact using the contacts service
        await contactsService.createContact(contactData);
        success++;
        
      } catch (error) {
        console.error(`Error processing VCF contact ${i + 1}:`, error);
        
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
    
    console.log(`VCF import completed: ${success} success, ${failed} failed, ${duplicates} duplicates`);
    return { success, failed, duplicates, errors };
  };

  const importVCFFile = async () => {
    if (!selectedFile) return;

    Alert.alert(
      'Import Contacts',
      `This will import ${preview?.totalContacts || 0} contacts from ${selectedFile.name}. Duplicates will be skipped. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: performImport }
      ]
    );
  };

  const performImport = async () => {
    setImporting(true);
    try {
      console.log('VCF import not fully implemented yet - trying backend first');
      
      // Try to use the backend API first, fallback to mock import
      try {
        const formData = new FormData();
        formData.append('vcfFile', {
          uri: selectedFile.uri,
          type: 'text/vcard',
          name: selectedFile.name,
        } as any);

        const response = await contactsService.importVCF(formData);
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
        console.log('Backend VCF import not available, using frontend processing');
        
        // Fallback to frontend processing
        const result = await processVCFContactsFrontend(preview?.contacts || []);
        setImportResult(result);
        
        Alert.alert(
          'Import Complete',
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
      console.error('Error importing VCF:', error);
      Alert.alert('Error', 'Failed to import VCF file. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const renderContactPreview = ({ item, index }: { item: VCFContact; index: number }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactAvatar}>
          <Text style={styles.avatarText}>
            {item.fn ? item.fn.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.fn || 'Unknown Name'}
          </Text>
          {item.email && item.email.length > 0 && (
            <Text style={styles.contactEmail} numberOfLines={1}>
              {item.email[0]}
            </Text>
          )}
          {item.org && (
            <Text style={styles.contactOrg} numberOfLines={1}>
              {item.org}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.contactFields}>
        {item.email && item.email.length > 0 && (
          <View style={styles.fieldRow}>
            <Ionicons name="mail-outline" size={16} color="#6366f1" />
            <Text style={styles.fieldText}>{item.email.length} email(s)</Text>
          </View>
        )}
        {item.tel && item.tel.length > 0 && (
          <View style={styles.fieldRow}>
            <Ionicons name="call-outline" size={16} color="#10b981" />
            <Text style={styles.fieldText}>{item.tel.length} phone(s)</Text>
          </View>
        )}
        {item.org && (
          <View style={styles.fieldRow}>
            <Ionicons name="business-outline" size={16} color="#f59e0b" />
            <Text style={styles.fieldText}>{item.org}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderImportGuide = () => (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>VCF Format Guide</Text>
      <Text style={styles.guideText}>
        VCF (vCard) files contain contact information in a standard format. We support these fields:
      </Text>
      
      <View style={styles.fieldsGuide}>
        <View style={styles.guideField}>
          <Ionicons name="person-outline" size={16} color="#6366f1" />
          <Text style={styles.guideFieldText}>FN - Full Name</Text>
        </View>
        <View style={styles.guideField}>
          <Ionicons name="mail-outline" size={16} color="#6366f1" />
          <Text style={styles.guideFieldText}>EMAIL - Email Address</Text>
        </View>
        <View style={styles.guideField}>
          <Ionicons name="call-outline" size={16} color="#6366f1" />
          <Text style={styles.guideFieldText}>TEL - Phone Number</Text>
        </View>
        <View style={styles.guideField}>
          <Ionicons name="business-outline" size={16} color="#6366f1" />
          <Text style={styles.guideFieldText}>ORG - Organization</Text>
        </View>
        <View style={styles.guideField}>
          <Ionicons name="briefcase-outline" size={16} color="#6366f1" />
          <Text style={styles.guideFieldText}>TITLE - Job Title</Text>
        </View>
        <View style={styles.guideField}>
          <Ionicons name="document-text-outline" size={16} color="#6366f1" />
          <Text style={styles.guideFieldText}>NOTE - Notes</Text>
        </View>
      </View>
      
      <Text style={styles.guideNote}>
        Note: At least a name (FN) or email address is required for each contact.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import from VCF</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select VCF File</Text>
          
          <TouchableOpacity
            style={[styles.uploadButton, selectedFile && styles.uploadButtonSuccess]}
            onPress={() => {
              console.log('VCF file picker button pressed');
              pickVCFFile();
            }}
            disabled={loading}
          >
            <Ionicons 
              name={selectedFile ? "checkmark-circle" : "card-outline"} 
              size={32} 
              color={selectedFile ? "#10b981" : "#8b5cf6"} 
            />
            <Text style={[styles.uploadButtonText, selectedFile && styles.uploadButtonTextSuccess]}>
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose VCF File'}
            </Text>
            {selectedFile && (
              <Text style={styles.fileSize}>
                {Math.round(selectedFile.size / 1024)} KB
              </Text>
            )}
          </TouchableOpacity>

          {selectedFile && (
            <TouchableOpacity
              style={styles.changeFileButton}
              onPress={pickVCFFile}
            >
              <Text style={styles.changeFileText}>Change File</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Analyzing VCF file...</Text>
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
                <Text style={styles.statNumber}>{preview.supportedFields.length}</Text>
                <Text style={styles.statLabel}>Supported Fields</Text>
              </View>
            </View>
            
            <Text style={styles.previewTitle}>Contact Preview (First 5 contacts):</Text>
            <FlatList
              data={preview.contacts.slice(0, 5)}
              renderItem={renderContactPreview}
              keyExtractor={(item, index) => index.toString()}
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
              onPress={importVCFFile}
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
                    `${importResult.errors.length} contacts failed to import. Most common issues: missing name or email.`
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
        {!selectedFile && renderImportGuide()}
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
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    gap: 12,
  },
  uploadButtonSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadButtonTextSuccess: {
    color: '#10b981',
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  changeFileButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changeFileText: {
    fontSize: 14,
    color: '#8b5cf6',
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
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8b5cf6',
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
    backgroundColor: '#8b5cf6',
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
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#8b5cf6',
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
  fieldsGuide: {
    gap: 12,
    marginBottom: 16,
  },
  guideField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  guideFieldText: {
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
});

export default ImportContactsVCFScreen;
