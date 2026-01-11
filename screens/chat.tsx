import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar,
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons } from '@expo/vector-icons';
import TabHeader from '../components/tabHeader';
import { 
  useGetMessagesQuery, 
  useSendMessageMutation, 
  useMarkMessagesAsReadMutation,
  useGetMutualConnectionByIdQuery,
} from '../store/api/mutualConnectionsApi';
import { useAppSelector } from '../store/hooks';
import { API_URL } from '@env';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function ChatScreen({ route, navigation }: { route: any; navigation: any }) {
  const { mutualConnectionId, displayName, otherUser, connectionId } = route.params || {};
  const scrollViewRef = useRef<ScrollView>(null);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: messagesData, isLoading, refetch } = useGetMessagesQuery(
    { mutualConnectionId, page: 1, limit: 100 },
    { skip: !mutualConnectionId, pollingInterval: 5000 } // Poll every 5 seconds for new messages
  );
  
  const { data: connectionData } = useGetMutualConnectionByIdQuery(mutualConnectionId, {
    skip: !mutualConnectionId,
  });
  
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [markAsRead] = useMarkMessagesAsReadMutation();
  
  const messages = messagesData?.messages || [];
  const connection = connectionData?.mutualConnection;
  
  // Get profile picture URL
  const profilePicture = connection?.profilePicture
    ? `${API_URL}/${connection.profilePicture.replace(/^\//, '')}?t=${connection.updatedAt || Date.now()}`
    : 'https://picsum.photos/150/150?random=10';

  // Mark messages as read when opening chat
  useEffect(() => {
    if (mutualConnectionId && messages.length > 0) {
      markAsRead(mutualConnectionId).catch(err => console.error('Mark as read error:', err));
    }
  }, [mutualConnectionId, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleSendMessage = async () => {
    if (message.trim() && mutualConnectionId) {
      const messageContent = message.trim();
      setMessage(''); // Clear immediately for better UX
      
      try {
        await sendMessage({
          mutualConnectionId,
          content: messageContent,
          messageType: 'text',
        }).unwrap();
        
        // Refetch messages to show the new message
        await refetch();
      } catch (error: any) {
        console.error('Send message error:', error);
        setMessage(messageContent); // Restore message on error
        Toast.show({
          type: 'error',
          text1: 'Failed to send',
          text2: error?.data?.message || 'Please try again',
        });
      }
    }
  };

  const handleProfilePress = () => {
    // Navigate to mutual connection profile
    navigation.navigate('MutualConnectionProfile', {
      mutualConnectionId,
      displayName,
      connectionId,
    });
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Entypo name="chevron-left" size={24} color="#8B5CF6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.userInfo} onPress={handleProfilePress}>
            <View style={styles.profilePictureContainer}>
              <View style={styles.profilePictureBorder}>
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.fullProfileImage}
                  resizeMode="cover"
                />
              </View>
            </View>
            <Text style={styles.contactName}>{displayName || connection?.displayName || 'Connection'}</Text>
          </TouchableOpacity>
        </View>

        {/* Messages Area */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isSent = msg.sender._id === currentUser?._id || msg.sender._id === currentUser?.id;
                return (
                  <View 
                    key={msg._id} 
                    style={[
                      styles.messageContainer,
                      isSent ? styles.sentMessage : styles.receivedMessage
                    ]}
                  >
                    <View style={[
                      styles.messageBubble,
                      isSent ? styles.sentBubble : styles.receivedBubble
                    ]}>
                      <Text style={[
                        styles.messageText,
                        isSent ? styles.sentText : styles.receivedText
                      ]}>
                        {msg.content}
                      </Text>
                      <Text style={[
                        styles.messageTime,
                        isSent ? styles.sentTime : styles.receivedTime
                      ]}>
                        {formatTimestamp(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Message Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Entypo name="attachment" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Entypo name="emoji-happy" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.sendButton, message.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={message.trim() ? "#ffffff" : "#9CA3AF"} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePictureContainer: {
    marginRight: 15,
  },
  profilePictureBorder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePicture: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  fullProfileImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 15,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sentBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 5,
  },
  receivedBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  sentText: {
    color: '#ffffff',
  },
  receivedText: {
    color: '#374151',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  receivedTime: {
    color: '#9CA3AF',
    textAlign: 'left',
  },
  typingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  typingBubble: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    alignSelf: 'flex-start',
    maxWidth: 80,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  attachButton: {
    padding: 5,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    maxHeight: 80,
    paddingVertical: 5,
  },
  emojiButton: {
    padding: 5,
    marginLeft: 8,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  sendButtonInactive: {
    backgroundColor: '#E5E7EB',
  },
});
