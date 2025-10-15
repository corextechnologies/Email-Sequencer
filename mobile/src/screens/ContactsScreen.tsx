import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Linking,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../navigation/MainNavigator';
import { contactsService } from '../services/contactsService';
import { Contact, ContactsListRequest } from '../types/contacts';
import { COLORS } from '../constants/colors';
import { GetContactsPopup } from './Popups';

const { width } = Dimensions.get('window');

type ContactsScreenNavigationProp = StackNavigationProp<ContactsStackParamList, 'ContactsList'>;

const ContactsScreen: React.FC = () => {
  const navigation = useNavigation<ContactsScreenNavigationProp>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  // Popup state
  const [showGetContactsPopup, setShowGetContactsPopup] = useState(false);
  const [popupTimer, setPopupTimer] = useState(3);

  const filters = [
    { key: 'all', label: 'All', icon: 'people-outline', count: 0 },
    { key: 'active', label: 'Active', icon: 'checkmark-circle-outline', count: 0 },
    { key: 'inactive', label: 'Inactive', icon: 'pause-circle-outline', count: 0 },
    { key: 'subscribed', label: 'Subscribed', icon: 'mail-outline', count: 0 },
  ];

  // Timer effect for popup countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showGetContactsPopup && popupTimer > 0) {
      interval = setInterval(() => {
        setPopupTimer((prev) => {
          if (prev <= 1) {
            setShowGetContactsPopup(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showGetContactsPopup, popupTimer]);

  // Show popup when component mounts
  useEffect(() => {
    setShowGetContactsPopup(true);
    setPopupTimer(3);
  }, []);

  const handleStartHere = async () => {
    setShowGetContactsPopup(false);
    try {
      const url = 'https://www.bobos.ai/';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open browser');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open website');
    }
  };

  const handleClosePopup = () => {
    setShowGetContactsPopup(false);
  };

  const loadContacts = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }

      const params: ContactsListRequest = {
        page: pageNum,
        limit: 20,
        search: searchQuery || undefined,
        status: selectedFilter !== 'all' && selectedFilter !== 'subscribed' ? selectedFilter : undefined,
        sort: 'created_at',
        order: 'desc',
      };

      const response = await contactsService.getContacts(params);
      
      if (pageNum === 1 || isRefresh) {
        setContacts(response.contacts);
      } else {
        setContacts(prev => [...prev, ...response.contacts]);
      }

      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadContacts(1, true);
    }, [loadContacts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts(1, true);
  };

  const loadMoreContacts = () => {
    if (!loading && hasMore) {
      loadContacts(page + 1);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const timeoutId = setTimeout(() => {
      loadContacts(1, true);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleFilterChange = (filterKey: string) => {
    setSelectedFilter(filterKey);
    setPage(1);
    loadContacts(1, true);
  };

  const handleContactPress = (contact: Contact) => {
    navigation.navigate('ContactDetails', { contactId: contact.id });
  };

  const handleDeleteContact = async (contactId: number) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactsService.deleteContact(contactId);
              setContacts(prev => prev.filter(c => c.id !== contactId));
              Alert.alert('Success', 'Contact deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.email;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const displayName = getContactDisplayName(item);
    const initials = getInitials(displayName);
    const avatarColor = getAvatarColor(displayName);

    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => handleContactPress(item)}
        onLongPress={() => handleDeleteContact(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.contactContent}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactEmail} numberOfLines={1}>
              {item.email}
            </Text>
            {item.company && (
              <Text style={styles.contactCompany} numberOfLines={1}>
                {item.company}
              </Text>
            )}
            
            <View style={styles.contactMeta}>
              <View style={[styles.statusBadge, 
                item.status === 'active' ? styles.statusActive :
                item.status === 'inactive' ? styles.statusInactive :
                item.status === 'bounced' ? styles.statusBounced :
                styles.statusUnsubscribed
              ]}>
                <View style={[styles.statusDot, 
                  item.status === 'active' ? styles.statusDotActive :
                  item.status === 'inactive' ? styles.statusDotInactive :
                  item.status === 'bounced' ? styles.statusDotBounced :
                  styles.statusDotUnsubscribed
                ]} />
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              
              {item.subscribed && (
                <View style={styles.subscribedBadge}>
                  <Ionicons name="mail" size={12} color={COLORS.status.success} />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterChip = ({ item }: { item: typeof filters[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedFilter === item.key && styles.filterChipActive
      ]}
      onPress={() => handleFilterChange(item.key)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={18} 
        color={selectedFilter === item.key ? COLORS.primary : COLORS.text.secondary} 
      />
      <Text style={[
        styles.filterChipText,
        selectedFilter === item.key && styles.filterChipTextActive
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSubtitle}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddContact')}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipActive
            ]}
            onPress={() => handleFilterChange(filter.key)}
          >
            <Ionicons 
              name={filter.icon as any} 
              size={18} 
              color={selectedFilter === filter.key ? COLORS.primary : COLORS.text.secondary} 
            />
            <Text style={[
              styles.filterChipText,
              selectedFilter === filter.key && styles.filterChipTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickImportButton}
          onPress={() => navigation.navigate('ImportContacts')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionText}>Import</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => Linking.openURL('https://bobos.ai')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="star" size={20} color="#000000" />
          </View>
          <Text style={styles.quickActionText}>More Contacts = More Results</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && contacts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={loadMoreContacts}
          onEndReachedThreshold={0.1}
          contentContainerStyle={contacts.length === 0 ? styles.emptyListContainer : undefined}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={80} color={COLORS.icon.light} />
              </View>
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? `No contacts found for "${searchQuery}"`
                  : 'Start building your contact list by adding your first contact'
                }
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => navigation.navigate('AddContact')}
                >
                  <Ionicons name="add" size={20} color={COLORS.text.white} />
                  <Text style={styles.emptyActionText}>Add Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            loading && contacts.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
      )}
      
      {/* Floating Search Button */}
      <TouchableOpacity
        style={styles.floatingSearchButton}
        onPress={() => setShowSearch(!showSearch)}
      >
        <Ionicons name="search" size={24} color={COLORS.text.white} />
      </TouchableOpacity>

      {/* Search Modal */}
      {showSearch && (
        <View style={styles.searchModal}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Search Contacts</Text>
              <TouchableOpacity
                style={styles.searchModalClose}
                onPress={() => setShowSearch(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchModalInputContainer}>
              <Ionicons name="search" size={20} color={COLORS.icon.light} style={styles.searchModalIcon} />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search contacts..."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#9ca3af"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    loadContacts(1, true);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.icon.light} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Get Contacts Popup */}
      <GetContactsPopup
        visible={showGetContactsPopup}
        onClose={handleClosePopup}
        onStartHere={handleStartHere}
        timer={popupTimer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  
  // Header Styles
  headerContainer: {
    backgroundColor: COLORS.background.primary,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Filter Styles
  filtersContainer: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.background.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  quickImportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 6,
    flex: 1,
    maxWidth: '30%',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fcba03',
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 6,
    flex: 1,
    maxWidth: '67%',
    shadowColor: '#FFD700',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  bobosIcon: {
    width: 20,
    height: 20,
  },

  // Contact Card Styles
  contactCard: {
    backgroundColor: COLORS.background.primary,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 13,
    color: COLORS.text.light,
    marginBottom: 8,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fef3c7',
  },
  statusBounced: {
    backgroundColor: '#fee2e2',
  },
  statusUnsubscribed: {
    backgroundColor: COLORS.background.tertiary,
  },
  statusDotActive: {
    backgroundColor: COLORS.status.success,
  },
  statusDotInactive: {
    backgroundColor: COLORS.status.warning,
  },
  statusDotBounced: {
    backgroundColor: COLORS.status.error,
  },
  statusDotUnsubscribed: {
    backgroundColor: COLORS.text.light,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscribedBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background.secondary,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.secondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyActionText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  // Legacy styles (keeping for compatibility)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 12,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  contactDetails: {
    flex: 1,
  },
  subscribedIcon: {
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },

  // Floating Search Button
  floatingSearchButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Search Modal
  searchModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchModalContent: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  searchModalClose: {
    padding: 4,
  },
  searchModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  searchModalIcon: {
    marginRight: 12,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
});

export default ContactsScreen;
