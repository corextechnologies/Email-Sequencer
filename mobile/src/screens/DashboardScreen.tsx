import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { EmailAccount } from '../types';
import { COLORS } from '../constants/colors';
import { UpgradeEmailSequencePopup } from './Popups';

interface Props {
  navigation: any;
}

interface ReplyAnalytics {
  totalReplies: number;
  totalCampaigns: number;
  totalSentEmails: number;
  overallReplyRate: number;
  recentReplies: number;
  topCampaign: {
    id: number;
    name: string;
    replyRate: number;
    replies: number;
  } | null;
}

interface OverviewStats {
  totalCampaigns: number;
  totalContacts: number;
  totalEmailsSent: number;
  replyRate: number;
}

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [replyAnalytics, setReplyAnalytics] = useState<ReplyAnalytics | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [popupTimer, setPopupTimer] = useState(3);

  useEffect(() => {
    loadData();
    // Show popup on every hot reload for all users
    setShowUpgradePopup(true);
  }, []);

  // Show popup when user logs in (when user object changes)
  useEffect(() => {
    if (user) {
      setShowUpgradePopup(true);
      setPopupTimer(3); // Reset timer when showing popup
    }
  }, [user]);

  // Timer effect for popup countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showUpgradePopup && popupTimer > 0) {
      interval = setInterval(() => {
        setPopupTimer((prev) => {
          if (prev <= 1) {
            setShowUpgradePopup(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showUpgradePopup, popupTimer]);


  const loadData = async () => {
    await Promise.all([
      loadEmailAccounts(),
      loadReplyAnalytics(),
      loadOverviewStats()
    ]);
  };

  const loadEmailAccounts = async () => {
    try {
      const accounts = await ApiService.getEmailAccounts();
      setEmailAccounts(accounts);
    } catch (error: any) {
      console.error('Load email accounts error:', error);
    }
  };

  const loadReplyAnalytics = async () => {
    try {
      const response = await ApiService.get('/analytics/replies');
      setReplyAnalytics(response.data.data);
    } catch (error: any) {
      console.error('Load reply analytics error:', error);
    }
  };

  const loadOverviewStats = async () => {
    try {
      const response = await ApiService.get('/analytics/overview');
      setOverviewStats(response.data.data);
    } catch (error: any) {
      console.error('Load overview stats error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getActiveAccountsCount = () => {
    return emailAccounts.filter(account => account.is_active).length;
  };

  const getTotalAccountsCount = () => {
    return emailAccounts.length;
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const handleExploreNow = async () => {
    setShowUpgradePopup(false);
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
    setShowUpgradePopup(false);
  };

  const triggerUpgradePopup = () => {
    setShowUpgradePopup(true);
    setPopupTimer(3);
  };

  // Set loading to false after data is loaded
  React.useEffect(() => {
    if (emailAccounts.length >= 0) {
      setIsLoading(false);
    }
  }, [emailAccounts, replyAnalytics, overviewStats]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.welcomeText}>Smart Sequence Dashboard</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <Image 
            source={require('../../assets/boboslogo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* <View style={styles.statsContainer}>
        { <View style={styles.statCard}>
          <Ionicons name="mail" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{getTotalAccountsCount()}</Text>
          <Text style={styles.statLabel}>Total Accounts</Text>
        </View> }

        { <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={32} color={COLORS.status.success} />
          <Text style={styles.statNumber}>{getActiveAccountsCount()}</Text>
          <Text style={styles.statLabel}>Active Accounts</Text>
        </View> }
      </View> */}


{/* Overview Section */}
      {overviewStats && (
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
              <Text style={styles.overviewNumber}>{overviewStats.totalCampaigns}</Text>
              <Text style={styles.overviewLabel}>Campaigns</Text>
            </View>

            <View style={styles.overviewCard}>
              <Ionicons name="person-outline" size={24} color={COLORS.primary} />
              <Text style={styles.overviewNumber}>{overviewStats.totalContacts}</Text>
              <Text style={styles.overviewLabel}>Contacts</Text>
            </View>

            <View style={styles.overviewCard}>
              <Ionicons name="send-outline" size={24} color={COLORS.primary} />
              <Text style={styles.overviewNumber}>{overviewStats.totalEmailsSent}</Text>
              <Text style={styles.overviewLabel}>Emails Sent</Text>
            </View>

            <View style={styles.overviewCard}>
              <Ionicons name="return-up-back-outline" size={24} color={COLORS.primary} />
              <Text style={styles.overviewNumber}>{formatPercentage(overviewStats.replyRate)}</Text>
              <Text style={styles.overviewLabel}>Reply Rate</Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('EmailAccounts')}
        >
          <Ionicons name="mail" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Manage Accounts</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Campaigns', { screen: 'CampaignCreate' })}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.status.success} />
          <Text style={styles.actionText}>New Campaign</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Settings', { screen: 'LLMIntegration' })}
        >
          <Ionicons name="key-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.actionText}>Add API Key</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Growth Tips Section */}
      <View style={styles.growthTipsSection}>
        <View style={styles.growthTipsHeader}>
          <Ionicons name="trending-up" size={24} color={COLORS.primary} />
          <Text style={styles.growthTipsTitle}>Growth Tips</Text>
        </View>
        
        <Text style={styles.growthTipsDescription}>
          Take your marketing to the next level with professional support from bobos.ai - from list building to campaign strategy.
        </Text>
        
        <View style={styles.growthTipsLinks}>
          <TouchableOpacity 
            style={styles.growthTipsLink}
            onPress={() => Linking.openURL('https://bobos.ai/list-building')}
          >
            <Text style={styles.growthTipsLinkText}>List Building →</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.growthTipsLink}
            onPress={() => Linking.openURL('https://bobos.ai/services')}
          >
            <Text style={styles.growthTipsLinkText}>Browse Services →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reply Analytics Section */}
      {replyAnalytics && (
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reply Analytics</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Campaigns', { screen: 'ReplyAnalytics' })}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.status.success} />
              <Text style={styles.analyticsNumber}>{replyAnalytics.totalReplies}</Text>
              <Text style={styles.analyticsLabel}>Total Replies</Text>
            </View>

            <View style={styles.analyticsCard}>
              <Ionicons name="trending-up" size={24} color={COLORS.secondary} />
              <Text style={styles.analyticsNumber}>{formatPercentage(replyAnalytics.overallReplyRate)}</Text>
              <Text style={styles.analyticsLabel}>Reply Rate</Text>
            </View>

            <View style={styles.analyticsCard}>
              <Ionicons name="calendar" size={24} color={COLORS.legacy.purple} />
              <Text style={styles.analyticsNumber}>{replyAnalytics.recentReplies}</Text>
              <Text style={styles.analyticsLabel}>This Week</Text>
            </View>

            <View style={styles.analyticsCard}>
              <Ionicons name="layers" size={24} color={COLORS.status.warning} />
              <Text style={styles.analyticsNumber}>{replyAnalytics.totalCampaigns}</Text>
              <Text style={styles.analyticsLabel}>Campaigns</Text>
            </View>
          </View>

          {replyAnalytics.topCampaign && (
            <View style={styles.topCampaignCard}>
              <View style={styles.topCampaignHeader}>
                <Ionicons name="trophy" size={20} color={COLORS.status.warning} />
                <Text style={styles.topCampaignTitle}>Top Campaign</Text>
              </View>
              <Text style={styles.topCampaignName}>{replyAnalytics.topCampaign.name}</Text>
              <View style={styles.topCampaignStats}>
                <Text style={styles.topCampaignStat}>
                  {replyAnalytics.topCampaign.replies} replies
                </Text>
                <Text style={styles.topCampaignStat}>
                  {formatPercentage(replyAnalytics.topCampaign.replyRate)} rate
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* <View style={styles.recentAccounts}>
        <Text style={styles.sectionTitle}>Recent Accounts</Text>
        
        {emailAccounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No email accounts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first email account to get started
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('EmailAccounts', { screen: 'AddEmailAccount' })}
            >
              <Text style={styles.addButtonText}>Add Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          emailAccounts.slice(0, 3).map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountInfo}>
                <Ionicons
                  name={account.is_active ? "checkmark-circle" : "pause-circle"}
                  size={20}
                  color={account.is_active ? "#34C759" : "#FF9500"}
                />
                <View style={styles.accountDetails}>
                  <Text style={styles.accountEmail}>{account.username}</Text>
                  <Text style={styles.accountProvider}>{account.provider}</Text>
                </View>
              </View>
              <Text style={[
                styles.accountStatus,
                { color: account.is_active ? "#34C759" : "#FF9500" }
              ]}>
                {account.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
          ))
        )}
      </View> */}

      {/* Upgrade Popup */}
      <UpgradeEmailSequencePopup
        visible={showUpgradePopup}
        onClose={handleClosePopup}
        onExploreNow={handleExploreNow}
        timer={popupTimer}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  header: {
    backgroundColor: COLORS.background.primary,
    padding: 20,
    paddingTop: 40,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  logo: {
    width: 150,
    height: 40,
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 27,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  
  overviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 15,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  overviewNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  analyticsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 4,
    fontWeight: '500',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 15,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  analyticsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  topCampaignCard: {
    backgroundColor: COLORS.background.primary,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  topCampaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  topCampaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  topCampaignName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  topCampaignStats: {
    flexDirection: 'row',
    gap: 16,
  },
  topCampaignStat: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 15,
  },
  actionCard: {
    backgroundColor: COLORS.background.primary,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 15,
    fontWeight: '500',
  },
  growthTipsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  growthTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  growthTipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  growthTipsDescription: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  growthTipsLinks: {
    flexDirection: 'row',
    gap: 20,
  },
  growthTipsLink: {
    paddingVertical: 4,
  },
  growthTipsLinkText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  recentAccounts: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  emptyState: {
    backgroundColor: COLORS.background.primary,
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  accountCard: {
    backgroundColor: COLORS.background.primary,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountDetails: {
    marginLeft: 12,
    flex: 1,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  accountProvider: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  accountStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DashboardScreen;
