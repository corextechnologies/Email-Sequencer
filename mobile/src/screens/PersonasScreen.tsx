import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/api';
import { COLORS } from '../constants/colors';

type Props = { navigation: any };

interface Persona {
  id: string;
  name: string;
  industry: string;
  role: string;
  description: string;
  company_size: string;
  location: string;
  created_at: string;
  updated_at: string;
}

const PersonasScreen: React.FC<Props> = ({ navigation }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPersonas = async () => {
    try {
      console.log('📋 Fetching personas...');
      const response = await ApiService.getPersonas();
      setPersonas(response.personas || []);
      console.log(`✅ Fetched ${response.count} personas`);
    } catch (error: any) {
      console.error('❌ Error fetching personas:', error);
      Alert.alert(
        'Error',
        'Failed to load personas. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPersonas();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPersonas();
    }, [])
  );

  const handleDeletePersona = (persona: Persona) => {
    Alert.alert(
      'Delete Persona',
      `Are you sure you want to delete "${persona.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePersona(persona.id),
        },
      ]
    );
  };

  const deletePersona = async (id: string) => {
    setDeletingId(id);
    try {
      console.log('🗑️ Deleting persona:', id);
      await ApiService.deletePersona(id);

      // Remove from local state
      setPersonas(prev => prev.filter(p => p.id !== id));

      Alert.alert(
        'Success',
        'Persona deleted successfully.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Error deleting persona:', error);
      Alert.alert(
        'Error',
        'Failed to delete persona. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditPersona = (persona: Persona) => {
    navigation.navigate('EditPersona', { personaId: persona.id });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderPersonaItem = ({ item }: { item: Persona }) => (
    <View style={styles.personaCard}>
      <View style={styles.personaHeader}>
        <View style={styles.personaInfo}>
          <Text style={styles.personaName}>{item.name}</Text>
          <Text style={styles.personaRole}>{item.role}</Text>
          {item.industry && (
            <Text style={styles.personaIndustry}>{item.industry}</Text>
          )}
        </View>
        <View style={styles.personaActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditPersona(item)}
          >
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePersona(item)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.status.error} />
            ) : (
              <Ionicons name="trash" size={16} color={COLORS.status.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {item.description && (
        <Text style={styles.personaDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.personaMeta}>
        {item.company_size && (
          <Text style={styles.metaText}>Company: {item.company_size}</Text>
        )}
        {item.location && (
          <Text style={styles.metaText}>Location: {item.location}</Text>
        )}
        <Text style={styles.metaText}>Created: {formatDate(item.created_at)}</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={COLORS.icon.light} />
      <Text style={styles.emptyTitle}>No personas yet</Text>
      <Text style={styles.emptySubtitle}>
        Generate customer personas with AI to get started with your email marketing campaigns.
      </Text>
      <TouchableOpacity
        style={styles.generateButton}
        onPress={() => navigation.navigate('BusinessQuestionier')}
      >
        <Ionicons name="add" size={20} color={COLORS.text.white} />
        <Text style={styles.generateButtonText}>Generate Personas</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personas</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading personas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Personas</Text>
      </View>

      {/* Content */}
      <View style={styles.container}>
        {personas.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={personas}
            keyExtractor={(item) => item.id}
            renderItem={renderPersonaItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => navigation.navigate('BusinessQuestionier')}
        >
          <Text style={styles.floatingAddButtonText}>+</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingLeft: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerIconBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
   
  },
  headerRight: {
    padding: 6,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
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
  listContainer: {
    padding: 16,
  },
  personaCard: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow.light,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  personaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  personaInfo: {
    flex: 1,
    marginRight: 12,
  },
  personaName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  personaRole: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  personaIndustry: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  personaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#ede9fe',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  personaDescription: {
    fontSize: 14,
    color: COLORS.text.dark,
    lineHeight: 20,
    marginBottom: 12,
  },
  personaMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingAddButtonText: {
    color: COLORS.text.white,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    marginBottom: 2,
  },

});

export default PersonasScreen;
