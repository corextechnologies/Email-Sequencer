import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ArrayInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
}

const ArrayInput: React.FC<ArrayInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Enter item',
  multiline = false,
}) => {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      const newValue = [...value, newItem.trim()];
      onChange(newValue);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const updateItem = (index: number, newText: string) => {
    const newValue = [...value];
    newValue[index] = newText;
    onChange(newValue);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {/* Display existing items */}
      {value.length > 0 && (
        <View style={styles.itemsContainer}>
          {value.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TextInput
                style={[styles.itemInput, multiline && styles.multilineItemInput]}
                value={item}
                onChangeText={(text) => updateItem(index, text)}
                placeholder={`Item ${index + 1}`}
                placeholderTextColor="#9ca3af"
                multiline={multiline}
                numberOfLines={multiline ? 2 : 1}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItem(index)}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add new item */}
      <View style={styles.addContainer}>
        <TextInput
          style={[styles.addInput, multiline && styles.multilineAddInput]}
          value={newItem}
          onChangeText={setNewItem}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          numberOfLines={multiline ? 2 : 1}
          onSubmitEditing={addItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={addItem}
          disabled={!newItem.trim()}
        >
          <Ionicons 
            name="add-circle" 
            size={24} 
            color={newItem.trim() ? "#3b82f6" : "#9ca3af"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  multilineItemInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  addContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 8,
  },
  addInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  multilineAddInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default ArrayInput;
