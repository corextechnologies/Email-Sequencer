import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface Reply {
  id: number;
  campaign_id: number;
  contact_id: number;
  reply_subject: string;
  reply_content: string;
  reply_sender_email: string;
  reply_received_at: string;
  processed_at: string;
  contact_name: string;
  contact_email: string;
}

interface ReplyResponse {
  id: number;
  response_subject: string;
  response_content: string;
  response_sent_at: string;
  sent_by_email: string;
}

interface ReplyWithResponses extends Reply {
  responses?: ReplyResponse[];
}

interface CampaignRepliesScreenProps {
  navigation: any;
  route: any;
}

export default function CampaignRepliesScreen({ navigation, route }: CampaignRepliesScreenProps) {
  const { campaignId } = route.params;
  const [replies, setReplies] = useState<ReplyWithResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedReply, setSelectedReply] = useState<ReplyWithResponses | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseSubject, setResponseSubject] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  const loadReplies = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      
      const response = await api.get(`/campaigns/${campaignId}/replies`);
      const repliesData = response.data.data.replies || [];
      
      // Load responses for each reply
      const repliesWithResponses = await Promise.all(
        repliesData.map(async (reply: Reply) => {
          try {
            const responseData = await api.get(`/replies/${reply.id}/with-responses`);
            return responseData.data.data.reply;
          } catch (err) {
            console.error(`Error loading responses for reply ${reply.id}:`, err);
            return reply; // Return original reply if responses fail to load
          }
        })
      );
      
      setReplies(repliesWithResponses);
    } catch (err: any) {
      setError(err.message || 'Failed to load replies');
      console.error('Error loading replies:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReplies();
    setRefreshing(false);
  }, [loadReplies]);

  const handleRespond = useCallback((reply: ReplyWithResponses) => {
    setSelectedReply(reply);
    setResponseSubject(`Re: ${reply.reply_subject}`);
    setResponseContent('');
    setResponseModalVisible(true);
  }, []);

  const sendResponse = useCallback(async () => {
    if (!selectedReply || !responseSubject.trim() || !responseContent.trim()) {
      Alert.alert('Error', 'Please fill in both subject and content');
      return;
    }

    try {
      setSendingResponse(true);
      
      await api.post(`/replies/${selectedReply.id}/respond`, {
        subject: responseSubject.trim(),
        content: responseContent.trim()
      });
      
      Alert.alert('Success', 'Response sent successfully!');
      
      // Close modal and refresh replies
      setResponseModalVisible(false);
      setSelectedReply(null);
      setResponseSubject('');
      setResponseContent('');
      
      // Refresh replies to show the new response
      await loadReplies();
      
    } catch (error: any) {
      console.error('Error sending response:', error);
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  }, [selectedReply, responseSubject, responseContent, loadReplies]);

  const closeResponseModal = useCallback(() => {
    setResponseModalVisible(false);
    setSelectedReply(null);
    setResponseSubject('');
    setResponseContent('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReplies();
    }, [loadReplies])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderReply = ({ item }: { item: ReplyWithResponses }) => (
    <View style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.contact_name}</Text>
          <Text style={styles.contactEmail}>{item.contact_email}</Text>
        </View>
        <View style={styles.replyDate}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.dateText}>{formatDate(item.reply_received_at)}</Text>
        </View>
      </View>
      
      <View style={styles.replySubject}>
        <Text style={styles.subjectLabel}>Subject:</Text>
        <Text style={styles.subjectText}>{item.reply_subject}</Text>
      </View>
      
      <View style={styles.replyContent}>
        <Text style={styles.contentLabel}>Message:</Text>
        <Text style={styles.contentText} numberOfLines={3}>
          {item.reply_content}
        </Text>
      </View>

      {/* Response button */}
      <TouchableOpacity 
        style={styles.respondButton}
        onPress={() => handleRespond(item)}
      >
        <Ionicons name="arrow-undo" size={16} color="#3b82f6" />
        <Text style={styles.respondButtonText}>Respond</Text>
      </TouchableOpacity>

      {/* Show previous responses */}
      {item.responses && item.responses.length > 0 && (
        <View style={styles.responsesContainer}>
          <Text style={styles.responsesTitle}>Your Responses:</Text>
          {item.responses.map(response => (
            <View key={response.id} style={styles.responseItem}>
              <View style={styles.responseHeader}>
                <Text style={styles.responseSubject}>{response.response_subject}</Text>
                <Text style={styles.responseDate}>
                  {formatDate(response.response_sent_at)}
                </Text>
              </View>
              <Text style={styles.responseContent} numberOfLines={2}>
                {response.response_content}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading && replies.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading replies...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReplies}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {replies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Replies Yet</Text>
          <Text style={styles.emptyMessage}>
            Replies to your campaign emails will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReply}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Response Modal */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeResponseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeResponseModal}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Send Response</Text>
            <TouchableOpacity 
              onPress={sendResponse}
              disabled={sendingResponse || !responseSubject.trim() || !responseContent.trim()}
              style={[
                styles.sendButton,
                (sendingResponse || !responseSubject.trim() || !responseContent.trim()) && styles.sendButtonDisabled
              ]}
            >
              {sendingResponse ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedReply && (
              <View style={styles.originalReplyContainer}>
                <Text style={styles.originalReplyTitle}>Original Reply:</Text>
                <Text style={styles.originalReplySubject}>{selectedReply.reply_subject}</Text>
                <Text style={styles.originalReplyContent}>{selectedReply.reply_content}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject:</Text>
              <TextInput
                style={styles.subjectInput}
                value={responseSubject}
                onChangeText={setResponseSubject}
                placeholder="Enter subject"
                autoCapitalize="sentences"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message:</Text>
              <TextInput
                style={styles.contentInput}
                value={responseContent}
                onChangeText={setResponseContent}
                placeholder="Type your response..."
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  replyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  contactEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  replyDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  replySubject: {
    marginBottom: 12,
  },
  subjectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  subjectText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  replyContent: {
    marginBottom: 16,
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  // Response functionality styles
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  respondButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  responsesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  responsesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  responseItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  responseSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  responseDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  responseContent: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  originalReplyContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  originalReplyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  originalReplySubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  originalReplyContent: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  subjectInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  contentInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
  },
});
