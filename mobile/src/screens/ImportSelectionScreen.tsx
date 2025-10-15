import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../navigation/MainNavigator';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

type ImportSelectionScreenNavigationProp = StackNavigationProp<ContactsStackParamList, 'ImportContacts'>;

interface ImportOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  route?: string;
  action?: () => void;
}

const ImportSelectionScreen: React.FC = () => {
  const navigation = useNavigation<ImportSelectionScreenNavigationProp>();

  const importOptions: ImportOption[] = [
    {
      id: 'vcf',
      title: 'Import from VCF',
      description: 'Import contacts from vCard (.vcf) files. Perfect for backing up contacts from other apps.',
      icon: 'card-outline',
      color: '#8b5cf6',
      backgroundColor: '#f3e8ff',
      action: () => {
        // Navigate to VCF import screen
        navigation.navigate('ImportContactsVCF');
      }
    },
    {
      id: 'phone',
      title: 'Import from Phone',
      description: 'Import contacts directly from your device\'s contact list. Quick and easy setup.',
      icon: 'phone-portrait-outline',
      color: '#06b6d4',
      backgroundColor: '#e0f7fa',
      action: () => {
        // Navigate to phone contacts import screen
        navigation.navigate('ImportContactsPhone');
      }
    },
  ];

  const handleImportOption = (option: ImportOption) => {
    if (option.action) {
      option.action();
    }
  };

  const renderImportOption = (option: ImportOption) => (
    <TouchableOpacity
      key={option.id}
      style={[styles.optionCard, { borderLeftColor: option.color }]}
      onPress={() => handleImportOption(option)}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View style={[styles.iconContainer, { backgroundColor: option.backgroundColor }]}>
          <Ionicons name={option.icon} size={32} color={option.color} />
        </View>
        
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.icon.light} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.introSection}>
          <View style={styles.introIcon}>
            <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Choose Import Method</Text>
          <Text style={styles.introDescription}>
            Select how you'd like to import your contacts. We support multiple formats to make it easy for you to get started.
          </Text>
        </View>

        {/* Import Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Import Options</Text>
          {importOptions.map(renderImportOption)}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Import Tips</Text>
          
          {/* <View style={styles.tipCard}>
            <Ionicons name="information-circle-outline" size={20} color="#06b6d4" />
            <Text style={styles.tipText}>
              Make sure your CSV file has an "email" column - this is required for all contacts.
            </Text>
          </View> */}
          
          <View style={styles.tipCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.status.success} />
            <Text style={styles.tipText}>
              Duplicate contacts will be automatically detected and skipped during import.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="people-outline" size={20} color={COLORS.status.warning} />
            <Text style={styles.tipText}>
              You can import up to 1000 contacts at once. Larger files can be split into multiple imports.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  content: {
    flex: 1,
  },
  introSection: {
    backgroundColor: COLORS.background.primary,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  introIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  optionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginLeft: 12,
  },
});

export default ImportSelectionScreen;
