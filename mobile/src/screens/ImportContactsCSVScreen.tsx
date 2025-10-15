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

type ImportContactsCSVScreenNavigationProp = StackNavigationProp<ContactsStackParamList, 'ImportContactsCSV'>;

interface CSVPreview {
  preview: any[];
  totalRows: number;
  columns: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

const ImportContactsCSVScreen: React.FC = () => {
  const navigation = useNavigation<ImportContactsCSVScreenNavigationProp>();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        setImportResult(null); // Reset previous results
        await previewCSVFile(file);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick CSV file');
    }
  };

  const previewCSVFile = async (file: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', {
        uri: file.uri,
        type: 'text/csv',
        name: file.name,
      } as any);

      const response = await contactsService.previewCSV(formData);
      setPreview(response);
    } catch (error) {
      console.error('Error previewing CSV:', error);
      Alert.alert('Error', 'Failed to preview CSV file. Please check the file format.');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const importCSVFile = async () => {
    if (!selectedFile) return;

    Alert.alert(
      'Import Contacts',
      `This will import contacts from ${selectedFile.name}. Duplicates will be skipped. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: performImport }
      ]
    );
  };

  const performImport = async () => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', {
        uri: selectedFile.uri,
        type: 'text/csv',
        name: selectedFile.name,
      } as any);

      const response = await contactsService.importCSV(formData);
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
    } catch (error) {
      console.error('Error importing CSV:', error);
      Alert.alert('Error', 'Failed to import CSV file. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const renderPreviewRow = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.previewRow}>
      <Text style={styles.rowNumber}>{index + 1}</Text>
      <View style={styles.rowData}>
        {Object.entries(item).map(([key, value]) => (
          <View key={key} style={styles.cellContainer}>
            <Text style={styles.cellHeader}>{key}</Text>
            <Text style={styles.cellValue} numberOfLines={1}>
              {String(value) || '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderImportGuide = () => (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>CSV Format Guide</Text>
      <Text style={styles.guideText}>
        Your CSV file should include columns with these headers (case-insensitive):
      </Text>
      
      <View style={styles.columnsGuide}>
        <View style={styles.guideColumn}>
          <Ionicons name="mail-outline" size={16} color="#6366f1" />
          <Text style={styles.guideColumnText}>Email (required)</Text>
        </View>
        <View style={styles.guideColumn}>
          <Ionicons name="person-outline" size={16} color="#6366f1" />
          <Text style={styles.guideColumnText}>First Name</Text>
        </View>
        <View style={styles.guideColumn}>
          <Ionicons name="person-outline" size={16} color="#6366f1" />
          <Text style={styles.guideColumnText}>Last Name</Text>
        </View>
        <View style={styles.guideColumn}>
          <Ionicons name="call-outline" size={16} color="#6366f1" />
          <Text style={styles.guideColumnText}>Phone</Text>
        </View>
        <View style={styles.guideColumn}>
          <Ionicons name="business-outline" size={16} color="#6366f1" />
          <Text style={styles.guideColumnText}>Company</Text>
        </View>
      </View>
      
      <Text style={styles.guideNote}>
        Note: Only Email is required. Other fields are optional.
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
        <Text style={styles.headerTitle}>Import from CSV</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select CSV File</Text>
          
          <TouchableOpacity
            style={[styles.uploadButton, selectedFile && styles.uploadButtonSuccess]}
            onPress={pickCSVFile}
            disabled={loading}
          >
            <Ionicons 
              name={selectedFile ? "checkmark-circle" : "cloud-upload-outline"} 
              size={32} 
              color={selectedFile ? "#10b981" : "#6366f1"} 
            />
            <Text style={[styles.uploadButtonText, selectedFile && styles.uploadButtonTextSuccess]}>
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose CSV File'}
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
              onPress={pickCSVFile}
            >
              <Text style={styles.changeFileText}>Change File</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Analyzing CSV file...</Text>
          </View>
        )}

        {/* Preview Section */}
        {preview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            
            <View style={styles.previewStats}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{preview.totalRows}</Text>
                <Text style={styles.statLabel}>Total Rows</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{preview.columns.length}</Text>
                <Text style={styles.statLabel}>Columns</Text>
              </View>
            </View>
            
            <View style={styles.columnsContainer}>
              <Text style={styles.columnsTitle}>Detected Columns:</Text>
              <View style={styles.columnsList}>
                {preview.columns.map((column, index) => (
                  <View key={index} style={styles.columnChip}>
                    <Text style={styles.columnText}>{column}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.previewTitle}>Sample Data (First 10 rows):</Text>
            <FlatList
              data={preview.preview}
              renderItem={renderPreviewRow}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.previewList}
              contentContainerStyle={styles.previewListContent}
            />

            <TouchableOpacity
              style={[styles.importButton, importing && styles.importButtonDisabled]}
              onPress={importCSVFile}
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
                    `${importResult.errors.length} rows failed to import. Most common issues: invalid email format or missing required fields.`
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
    borderColor: '#6366f1',
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
    color: '#6366f1',
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
    color: '#6366f1',
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
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  columnsContainer: {
    marginBottom: 20,
  },
  columnsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  columnsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  columnChip: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  columnText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  previewList: {
    marginBottom: 20,
  },
  previewListContent: {
    paddingRight: 20,
  },
  previewRow: {
    flexDirection: 'row',
    marginRight: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    minWidth: width * 0.7,
    maxWidth: width * 0.8,
  },
  rowNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 12,
    fontWeight: '600',
    minWidth: 20,
  },
  rowData: {
    flex: 1,
  },
  cellContainer: {
    marginBottom: 8,
  },
  cellHeader: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellValue: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
    fontWeight: '500',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#6366f1',
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
  columnsGuide: {
    gap: 12,
    marginBottom: 16,
  },
  guideColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  guideColumnText: {
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

export default ImportContactsCSVScreen;
