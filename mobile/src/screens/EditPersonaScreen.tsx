import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PersonasStackParamList } from '../navigation/MainNavigator';
import ApiService from '../services/api';
import ArrayInput from '../components/ArrayInput';
import { COLORS } from '../constants/colors';

type Props = NativeStackScreenProps<PersonasStackParamList, 'EditPersona'>;

interface Persona {
  id: string;
  name: string;
  industry: string;
  role: string;
  description: string;
  company_size: string;
  location: string;
  current_challenges: string;
  change_events: string;
  interests_priorities: string;
  communication_style: string;
  demographics: string;
  content_preferences: string;
  buying_triggers: string;
  geographic_location: string;
  created_at: string;
  updated_at: string;
}

const EditPersonaScreen: React.FC<Props> = ({ navigation, route }) => {
  const { personaId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    role: '',
    description: '',
    company_size: '',
    location: '',
    current_challenges: '',
    change_events: '',
    interests_priorities: '',
    communication_style: '',
    demographics: '',
    content_preferences: '',
    buying_triggers: '',
    geographic_location: '',
    age_range: '',
    income_range: '',
    education_level: '',
  });

  // Array fields for better editing experience
  const [arrayFields, setArrayFields] = useState({
    current_challenges: [] as string[],
    change_events: [] as string[],
    interests_priorities: [] as string[],
    content_preferences: [] as string[],
    buying_triggers: [] as string[],
    demographics: [] as string[],
  });

  // Helper functions to convert between comma-separated strings and arrays
  const stringToArray = (str: string): string[] => {
    if (!str || str.trim() === '') return [];
    
    // Handle if it's already a JSON array string
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed.filter(item => item && item.trim().length > 0) : [];
      } catch (e) {
        // If JSON parsing fails, fall back to comma splitting
      }
    }
    
    // Handle comma-separated string
    return str.split(',').map(item => {
      // Remove quotes and brackets if present
      return item.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '');
    }).filter(item => item.length > 0);
  };

  const arrayToString = (arr: string[]): string => {
    return arr.filter(item => item.trim().length > 0).join(', ');
  };

  // Helper function to parse demographics and extract specific categories
  const parseDemographics = (demographics: string) => {
    const items = stringToArray(demographics);
    const ageRange: string[] = [];
    const incomeRange: string[] = [];
    const educationLevel: string[] = [];
    
    items.forEach(item => {
      // Clean the item by removing any JSON-like syntax
      const cleanItem = item.replace(/^["'\[\]{}]+|["'\[\]{}]+$/g, '').trim();
      
      // Extract just the value from JSON-like strings
      let value = cleanItem;
      if (cleanItem.includes(':')) {
        const parts = cleanItem.split(':');
        if (parts.length > 1) {
          value = parts[1].replace(/^["']+|["']+$/g, '').trim();
        }
      }
      
      const lowerItem = value.toLowerCase();
      if (lowerItem.includes('age') || lowerItem.includes('years') || /\d+-\d+/.test(value)) {
        ageRange.push(value);
      } else if (lowerItem.includes('income') || lowerItem.includes('salary') || lowerItem.includes('$') || lowerItem.includes('k')) {
        incomeRange.push(value);
      } else if (lowerItem.includes('education') || lowerItem.includes('degree') || lowerItem.includes('bachelor') || lowerItem.includes('master') || lowerItem.includes('phd') || lowerItem.includes('high school') || lowerItem.includes('college')) {
        educationLevel.push(value);
      }
    });
    
    return { ageRange, incomeRange, educationLevel };
  };

  useEffect(() => {
    fetchPersona();
  }, [personaId]);

  const fetchPersona = async () => {
    try {
      console.log('👤 Fetching persona:', personaId);
      const personaData = await ApiService.getPersona(personaId);
      setPersona(personaData);
      
      // Parse demographics into separate categories
      const { ageRange, incomeRange, educationLevel } = parseDemographics(personaData.demographics || '');

      // Helper function to extract single value from array format
      const extractSingleValue = (value: string): string => {
        if (!value || value.trim() === '') return '';
        
        // If it's a JSON array, parse it and take the first value
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed[0].toString().replace(/^["']+|["']+$/g, ''); // Remove quotes
            }
          } catch (e) {
            // If JSON parsing fails, try to extract from string format
            // Try different patterns: ["value"], ['value'], [value]
            const patterns = [
              /\["([^"]+)"\]/,  // ["value"]
              /\['([^']+)'\]/,  // ['value']  
              /\[([^,\]]+)\]/   // [value]
            ];
            
            for (const pattern of patterns) {
              const match = value.match(pattern);
              if (match && match[1]) {
                return match[1];
              }
            }
          }
        }
        
        // If it's comma-separated, take the first value
        const items = stringToArray(value);
        return items.length > 0 ? items[0] : value;
      };

      // Populate form with existing data
      setFormData({
        name: personaData.name || '',
        industry: personaData.industry || '',
        role: personaData.role || '',
        description: personaData.description || '',
        company_size: extractSingleValue(personaData.company_size || ''),
        location: extractSingleValue(personaData.location || ''),
        current_challenges: personaData.current_challenges || '',
        change_events: personaData.change_events || '',
        interests_priorities: personaData.interests_priorities || '',
        communication_style: personaData.communication_style || '',
        demographics: personaData.demographics || '',
        content_preferences: personaData.content_preferences || '',
        buying_triggers: personaData.buying_triggers || '',
        geographic_location: extractSingleValue(personaData.geographic_location || ''),
        age_range: ageRange.length > 0 ? ageRange[0] : '',
        income_range: incomeRange.length > 0 ? incomeRange[0] : '',
        education_level: educationLevel.length > 0 ? educationLevel[0] : '',
      });

      // Populate array fields
      setArrayFields({
        current_challenges: stringToArray(personaData.current_challenges || ''),
        change_events: stringToArray(personaData.change_events || ''),
        interests_priorities: stringToArray(personaData.interests_priorities || ''),
        content_preferences: stringToArray(personaData.content_preferences || ''),
        buying_triggers: stringToArray(personaData.buying_triggers || ''),
        demographics: stringToArray(personaData.demographics || ''),
      });
      
      console.log('✅ Persona loaded successfully');
    } catch (error: any) {
      console.error('❌ Error fetching persona:', error);
      Alert.alert(
        'Error',
        'Failed to load persona. Please try again.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Persona name is required.');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving persona:', personaId);
      
      // Combine demographic fields back into demographics
      const demographicParts = [];
      if (formData.age_range.trim()) demographicParts.push(formData.age_range);
      if (formData.income_range.trim()) demographicParts.push(formData.income_range);
      if (formData.education_level.trim()) demographicParts.push(formData.education_level);
      if (arrayFields.demographics.length > 0) demographicParts.push(...arrayFields.demographics);

      // Convert array fields back to comma-separated strings
      const dataToSave = {
        ...formData,
        current_challenges: arrayToString(arrayFields.current_challenges),
        change_events: arrayToString(arrayFields.change_events),
        interests_priorities: arrayToString(arrayFields.interests_priorities),
        content_preferences: arrayToString(arrayFields.content_preferences),
        buying_triggers: arrayToString(arrayFields.buying_triggers),
        demographics: arrayToString(demographicParts),
      };
      
      await ApiService.updatePersona(personaId, dataToSave);
      
      Alert.alert(
        'Success',
        'Persona updated successfully.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error: any) {
      console.error('❌ Error updating persona:', error);
      Alert.alert(
        'Error',
        'Failed to update persona. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateArrayField = (field: keyof typeof arrayFields, value: string[]) => {
    setArrayFields(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Persona</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading persona...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Persona</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Enter persona name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <TextInput
              style={styles.input}
              value={formData.role}
              onChangeText={(value) => updateField('role', value)}
              placeholder="e.g., Marketing Manager, CEO"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Industry</Text>
            <TextInput
              style={styles.input}
              value={formData.industry}
              onChangeText={(value) => updateField('industry', value)}
              placeholder="e.g., Technology, Healthcare"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              placeholder="Describe this persona..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Company & Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company & Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Size</Text>
            <TextInput
              style={styles.input}
              value={formData.company_size}
              onChangeText={(value) => updateField('company_size', value)}
              placeholder="e.g., 11-50, 51-200, 201-500"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(value) => updateField('location', value)}
              placeholder="e.g., New York, Remote"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Geographic Location</Text>
            <TextInput
              style={styles.input}
              value={formData.geographic_location}
              onChangeText={(value) => updateField('geographic_location', value)}
              placeholder="e.g., North America, Europe"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Challenges & Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenges & Goals</Text>
          
          <ArrayInput
            label="Current Challenges"
            value={arrayFields.current_challenges}
            onChange={(value) => updateArrayField('current_challenges', value)}
            placeholder="Enter a challenge"
            multiline={true}
          />

          <ArrayInput
            label="Change Events"
            value={arrayFields.change_events}
            onChange={(value) => updateArrayField('change_events', value)}
            placeholder="Enter a change event"
            multiline={true}
          />

          <ArrayInput
            label="Interests & Priorities"
            value={arrayFields.interests_priorities}
            onChange={(value) => updateArrayField('interests_priorities', value)}
            placeholder="Enter an interest or priority"
            multiline={true}
          />
        </View>

        {/* Communication & Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication & Preferences</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Communication Style</Text>
            <TextInput
              style={styles.input}
              value={formData.communication_style}
              onChangeText={(value) => updateField('communication_style', value)}
              placeholder="e.g., Direct, Consultative, Educational"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <ArrayInput
            label="Content Preferences"
            value={arrayFields.content_preferences}
            onChange={(value) => updateArrayField('content_preferences', value)}
            placeholder="Enter a content preference"
            multiline={true}
          />

          <ArrayInput
            label="Buying Triggers"
            value={arrayFields.buying_triggers}
            onChange={(value) => updateArrayField('buying_triggers', value)}
            placeholder="Enter a buying trigger"
            multiline={true}
          />
        </View>

        {/* Demographics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demographics</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age Range</Text>
            <TextInput
              style={styles.input}
              value={formData.age_range}
              onChangeText={(value) => updateField('age_range', value)}
              placeholder="e.g., 25-35, 30-45"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Income Range</Text>
            <TextInput
              style={styles.input}
              value={formData.income_range}
              onChangeText={(value) => updateField('income_range', value)}
              placeholder="e.g., $50k-$75k, $75k-$100k"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Education Level</Text>
            <TextInput
              style={styles.input}
              value={formData.education_level}
              onChangeText={(value) => updateField('education_level', value)}
              placeholder="e.g., Bachelor's, Master's, PhD"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingLeft: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light
  },
  headerIconBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerRight: {
    padding: 6,
    width: 36,
  },
  saveButton: {
    marginRight: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  section: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow.light,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.dark,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default EditPersonaScreen;
