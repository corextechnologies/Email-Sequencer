import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/api';
import { EmailAccount } from '../types';

interface Props {
  navigation: any;
}

const EmailAccountsScreen: React.FC<Props> = ({ navigation }) => {
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEmailAccounts();
    }, [])
  );

  const loadEmailAccounts = async () => {
    try {
      const accounts = await ApiService.getEmailAccounts();
      setEmailAccounts(accounts);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load email accounts');
      console.error('Load email accounts error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmailAccounts();
    setRefreshing(false);
  };

  const toggleAccountStatus = async (accountId: number, currentStatus: boolean) => {
    try {
      await ApiService.toggleEmailAccountStatus(accountId);
      setEmailAccounts(accounts =>
        accounts.map(account =>
          account.id === accountId
            ? { ...account, is_active: !currentStatus }
            : account
        )
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update account status');
      console.error('Toggle account status error:', error);
    }
  };

  const deleteAccount = async (accountId: number) => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this email account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteEmailAccount(accountId);
              setEmailAccounts(accounts =>
                accounts.filter(account => account.id !== accountId)
              );
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete account');
              console.error('Delete account error:', error);
            }
          },
        },
      ]
    );
  };

  const renderEmailAccount = ({ item }: { item: EmailAccount }) => (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountInfo}>
          <Ionicons
            name={item.is_active ? "checkmark-circle" : "pause-circle"}
            size={24}
            color={item.is_active ? "#34C759" : "#FF9500"}
          />
          <View style={styles.accountDetails}>
            <Text style={styles.accountEmail}>{item.username}</Text>
            <Text style={styles.accountProvider}>{item.provider}</Text>
            <Text style={styles.accountHost}>
              IMAP: {item.imap_host}:{item.imap_port}
            </Text>
            <Text style={styles.accountHost}>
              SMTP: {item.smtp_host}:{item.smtp_port}
            </Text>
          </View>
        </View>
        <View style={styles.accountActions}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              { backgroundColor: item.is_active ? "#FF9500" : "#34C759" }
            ]}
            onPress={() => toggleAccountStatus(item.id, item.is_active)}
          >
            <Ionicons
              name={item.is_active ? "pause" : "play"}
              size={16}
              color="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteAccount(item.id)}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.accountStatus}>
        <Text style={[
          styles.statusText,
          { color: item.is_active ? "#34C759" : "#FF9500" }
        ]}>
          {item.is_active ? "Active" : "Inactive"}
        </Text>
        <Text style={styles.dateText}>
          Added: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="mail-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Email Accounts</Text>
      <Text style={styles.emptyStateText}>
        You haven't added any email accounts yet.
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddEmailAccount')}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Your First Account</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading email accounts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Email Accounts</Text>
        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={() => navigation.navigate('AddEmailAccount')}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={emailAccounts}
        renderItem={renderEmailAccount}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={emailAccounts.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addHeaderButton: {
    padding: 8,
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  accountInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  accountDetails: {
    marginLeft: 15,
    flex: 1,
  },
  accountEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  accountProvider: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  accountHost: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EmailAccountsScreen;
