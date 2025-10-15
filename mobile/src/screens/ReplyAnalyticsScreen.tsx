import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface ReplyAnalytics {
  totalReplies: number;
  totalCampaigns: number;
  totalSentEmails: number;
  overallReplyRate: number;
  recentReplies: number; // Last 7 days
  topCampaign: {
    id: number;
    name: string;
    replyRate: number;
    replies: number;
  } | null;
  replyTrends: {
    date: string;
    replies: number;
  }[];
}

export default function ReplyAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<ReplyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      
      const response = await api.get('/analytics/replies');
      setAnalytics(response.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      console.error('Error loading reply analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics])
  );

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics) return null;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="chatbubbles" size={24} color="#22c55e" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{analytics.totalReplies}</Text>
            <Text style={styles.metricLabel}>Total Replies</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="trending-up" size={24} color="#3b82f6" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{formatPercentage(analytics.overallReplyRate)}</Text>
            <Text style={styles.metricLabel}>Reply Rate</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="mail" size={24} color="#f59e0b" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{analytics.totalSentEmails}</Text>
            <Text style={styles.metricLabel}>Emails Sent</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="calendar" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{analytics.recentReplies}</Text>
            <Text style={styles.metricLabel}>This Week</Text>
          </View>
        </View>
      </View>

      {/* Top Performing Campaign */}
      {analytics.topCampaign && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Campaign</Text>
          <View style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignName}>{analytics.topCampaign.name}</Text>
              <View style={styles.campaignBadge}>
                <Text style={styles.campaignBadgeText}>Best</Text>
              </View>
            </View>
            <View style={styles.campaignMetrics}>
              <View style={styles.campaignMetric}>
                <Text style={styles.campaignMetricValue}>{analytics.topCampaign.replies}</Text>
                <Text style={styles.campaignMetricLabel}>Replies</Text>
              </View>
              <View style={styles.campaignMetric}>
                <Text style={styles.campaignMetricValue}>{formatPercentage(analytics.topCampaign.replyRate)}</Text>
                <Text style={styles.campaignMetricLabel}>Reply Rate</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Recent Trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Reply Trends</Text>
        <View style={styles.trendsContainer}>
          {analytics.replyTrends.slice(-7).map((trend, index) => (
            <View key={index} style={styles.trendItem}>
              <Text style={styles.trendDate}>{formatDate(trend.date)}</Text>
              <View style={styles.trendBar}>
                <View 
                  style={[
                    styles.trendBarFill, 
                    { 
                      height: `${Math.max((trend.replies / Math.max(...analytics.replyTrends.map(t => t.replies))) * 100, 10)}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.trendValue}>{trend.replies}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="layers" size={20} color="#6b7280" />
            <Text style={styles.statValue}>{analytics.totalCampaigns}</Text>
            <Text style={styles.statLabel}>Campaigns</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color="#6b7280" />
            <Text style={styles.statValue}>24h</Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color="#6b7280" />
            <Text style={styles.statValue}>{analytics.totalReplies > 0 ? 'Active' : 'Pending'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  campaignCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  campaignBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  campaignBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  campaignMetrics: {
    flexDirection: 'row',
    gap: 24,
  },
  campaignMetric: {
    alignItems: 'center',
  },
  campaignMetricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  campaignMetricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  trendsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  trendBar: {
    width: 20,
    height: 60,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  trendBarFill: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minHeight: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  statsGrid: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
