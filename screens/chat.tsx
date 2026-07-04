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
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useGetMutualConnectionByIdQuery,
} from '../store/api/mutualConnectionsApi';
import { useAppSelector } from '../store/hooks';
import Toast from 'react-native-toast-message';
import MaskedView from '@react-native-masked-view/masked-view';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ChatScreen({ route, navigation }: { route: any; navigation: any }) {
  const { mutualConnectionId, displayName, otherUser, connectionId } = route.params || {};
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: messagesData, isLoading, refetch } = useGetMessagesQuery(
    { mutualConnectionId, page: 1, limit: 100 },
    { skip: !mutualConnectionId, pollingInterval: 5000 }
  );

  const { data: connectionData } = useGetMutualConnectionByIdQuery(mutualConnectionId, {
    skip: !mutualConnectionId,
  });

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [markAsRead] = useMarkMessagesAsReadMutation();

  const messages = messagesData?.messages || [];
  const connection = connectionData?.mutualConnection;

  // ✅ Fix 3: Get real profile picture with fallback
  const getUserProfilePicture = () => {
    // Try to get from otherUser first
    if (otherUser?.profilePicture) {
      return `${API_URL}/${otherUser.profilePicture.replace(/^\//, '')}`;
    }
    // Try to get from connection
    if (connection?.profilePicture) {
      return `${API_URL}/${connection.profilePicture.replace(/^\//, '')}?t=${connection.updatedAt || Date.now()}`;
    }
    // Fallback to null
    return null;
  };

  // ✅ Fix 3: Get display name
  const getDisplayName = () => {
    if (displayName) return displayName;
    if (connection?.displayName) return connection.displayName;
    if (otherUser?.username) return otherUser.username;
    if (otherUser?.displayName) return otherUser.displayName;
    return 'Connection';
  };

  const userProfilePicture = getUserProfilePicture();
  const userName = getDisplayName();

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
    navigation.navigate('MutualConnectionProfile', {
      mutualConnectionId,
      displayName: userName,
      connectionId,
    });
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputChange = (text: string) => {
    setMessage(text);

    // Simulate typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: any[] } = {};
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // ✅ Fix 2: Remove menu button - just navigate back
  // The menu button is completely removed from the header

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ✅ Fixed Chat Header - No menu button */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.userInfo} onPress={handleProfilePress} activeOpacity={0.7}>
            <View style={styles.profilePictureWrapper}>
              <View style={styles.profilePictureContainer}>
                {/* ✅ Fix 3: Show real profile picture or default */}
                {userProfilePicture ? (
                  <Image
                    source={{ uri: userProfilePicture }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.defaultAvatar}>
                    <Text style={styles.defaultAvatarText}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineIndicator} />
              </View>
            </View>
            <View style={styles.userDetails}>
              {/* ✅ Fix 1: Gradient text for contact name */}
              <MaskedView
                style={styles.maskedView}
                maskElement={
                  <Text style={styles.contactName}>{userName}</Text>
                }
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBackground}
                />
              </MaskedView>
              <Text style={styles.userStatus}>Online</Text>
            </View>
          </TouchableOpacity>

          {/* ✅ Fix 2: Menu button completely removed */}
        </View>

        {/* Messages Area */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingAnimation}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8B5CF6"
                colors={['#8B5CF6']}
              />
            }
          >
            {messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <View style={styles.emptyIconWrapper}>
                  <LinearGradient
                    colors={['#F3F4F6', '#E5E7EB']}
                    style={styles.emptyIconGradient}
                  >
                    <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyDescription}>
                  Start the conversation with {userName.split(' ')[0] || 'them'}
                </Text>
              </View>
            ) : (
              <>
                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <View key={date}>
                    <View style={styles.dateHeader}>
                      <View style={styles.dateLine} />
                      <Text style={styles.dateText}>{date}</Text>
                      <View style={styles.dateLine} />
                    </View>
                    {dateMessages.map((msg) => {
                      const isSent = msg.sender._id === currentUser?._id || msg.sender._id === currentUser?.id;
                      return (
                        <View
                          key={msg._id}
                          style={[
                            styles.messageWrapper,
                            isSent ? styles.sentWrapper : styles.receivedWrapper
                          ]}
                        >
                          {!isSent && (
                            <View style={styles.messageAvatarWrapper}>
                              {userProfilePicture ? (
                                <Image
                                  source={{ uri: userProfilePicture }}
                                  style={styles.messageAvatar}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={[styles.messageAvatar, styles.messageDefaultAvatar]}>
                                  <Text style={styles.messageDefaultText}>
                                    {userName.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
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
                            <View style={styles.messageFooter}>
                              <Text style={[
                                styles.messageTime,
                                isSent ? styles.sentTime : styles.receivedTime
                              ]}>
                                {formatMessageTime(msg.createdAt)}
                              </Text>
                              {isSent && (
                                <Ionicons
                                  name="checkmark-done"
                                  size={14}
                                  color="rgba(255, 255, 255, 0.6)"
                                  style={styles.readReceipt}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
                {isTyping && (
                  <View style={styles.typingContainer}>
                    {userProfilePicture ? (
                      <Image
                        source={{ uri: userProfilePicture }}
                        style={styles.typingAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.typingAvatar, styles.typingDefaultAvatar]}>
                        <Text style={styles.typingDefaultText}>
                          {userName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.typingBubble}>
                      <View style={styles.typingDots}>
                        <View style={[styles.typingDot, styles.typingDot1]} />
                        <View style={[styles.typingDot, styles.typingDot2]} />
                        <View style={[styles.typingDot, styles.typingDot3]} />
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        {/* Enhanced Message Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.attachGradient}
              >
                <Ionicons name="add" size={24} color="#8B5CF6" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.textInputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={handleInputChange}
                multiline
                maxLength={500}
              />
            </View>

            <TouchableOpacity style={styles.emojiButton} activeOpacity={0.7}>
              <Ionicons name="happy-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              message.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isSending}
            activeOpacity={0.8}
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
    backgroundColor: '#F9FAFB',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePictureWrapper: {
    marginRight: 12,
  },
  profilePictureContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  defaultAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  maskedView: {
    height: 24,
    width: 'auto',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  gradientBackground: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  userStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginHorizontal: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sentWrapper: {
    justifyContent: 'flex-end',
  },
  receivedWrapper: {
    justifyContent: 'flex-start',
  },
  messageAvatarWrapper: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageDefaultAvatar: {
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageDefaultText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sentBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  sentText: {
    color: '#ffffff',
  },
  receivedText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: '#9CA3AF',
  },
  readReceipt: {
    marginLeft: 2,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  typingDefaultAvatar: {
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingDefaultText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typingBubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  typingDot1: {
    opacity: 0.4,
    transform: [{ scale: 1 }],
  },
  typingDot2: {
    opacity: 0.7,
    transform: [{ scale: 1.1 }],
  },
  typingDot3: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnimation: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconWrapper: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachButton: {
    marginRight: 8,
  },
  attachGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputWrapper: {
    flex: 1,
  },
  messageInput: {
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emojiButton: {
    marginLeft: 8,
    padding: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
});