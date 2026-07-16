import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
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
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useGetMutualConnectionByIdQuery,
} from '../store/api/mutualConnectionsApi';
import { useAppSelector } from '../store/hooks';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ChatScreen({ route, navigation }: { route: any; navigation: any }) {
  const { mutualConnectionId, displayName, otherUser, connectionId } = route.params || {};
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  // Animate messages in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getUserProfilePicture = () => {
    if (otherUser?.profilePicture) {
      return `${API_URL}/${otherUser.profilePicture.replace(/^\//, '')}`;
    }
    if (connection?.profilePicture) {
      return `${API_URL}/${connection.profilePicture.replace(/^\//, '')}?t=${connection.updatedAt || Date.now()}`;
    }
    return null;
  };

  const getDisplayName = () => {
    if (displayName) return displayName;
    if (connection?.displayName) return connection.displayName;
    if (otherUser?.username) return otherUser.username;
    if (otherUser?.displayName) return otherUser.displayName;
    return 'Connection';
  };

  const userProfilePicture = getUserProfilePicture();
  const userName = getDisplayName();

  useEffect(() => {
    if (mutualConnectionId && messages.length > 0) {
      markAsRead(mutualConnectionId).catch(err => console.error('Mark as read error:', err));
    }
  }, [mutualConnectionId, messages.length]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
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
      setMessage('');

      try {
        await sendMessage({
          mutualConnectionId,
          content: messageContent,
          messageType: 'text',
        }).unwrap();
        await refetch();
      } catch (error: any) {
        console.error('Send message error:', error);
        setMessage(messageContent);
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

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleInputChange = (text: string) => {
    setMessage(text);

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

  const groupMessagesByDate = () => {
    const groups: { [key: string]: any[] } = {};
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const renderMessage = ({ item: msg, index }: { item: any; index: number }) => {
    const isSent = msg.sender._id === currentUser?._id || msg.sender._id === currentUser?.id;
    const showAvatar = !isSent && userProfilePicture;
    const isFirstInGroup = index === 0 || messages[index - 1]?.sender._id !== msg.sender._id;

    return (
      <Animated.View
        style={[
          styles.messageWrapper,
          isSent ? styles.sentWrapper : styles.receivedWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!isSent && showAvatar && (
          <View style={styles.messageAvatarWrapper}>
            <Image source={{ uri: userProfilePicture }} style={styles.messageAvatar} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isSent ? styles.sentBubble : styles.receivedBubble,
          !isSent && !showAvatar && styles.noAvatarBubble,
        ]}>
          <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
            {msg.content}
          </Text>
          <Text style={[styles.messageTime, isSent ? styles.sentTime : styles.receivedTime]}>
            {formatMessageTime(msg.createdAt)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.userInfo} onPress={handleProfilePress} activeOpacity={0.7}>
            <View style={styles.avatarContainer}>
              {userProfilePicture ? (
                <Image source={{ uri: userProfilePicture }} style={styles.avatar} />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Text style={styles.defaultAvatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userStatus}>Online</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreBtn}>
            <Feather name="more-vertical" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8B5CF6"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Say hello to {userName.split(' ')[0] || 'them'} 👋
                </Text>
              </View>
            }
            ListHeaderComponent={
              messages.length > 0 ? (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateText}>
                    {formatDateHeader(messages[0]?.createdAt)}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDotWrapper}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
            </View>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add-circle-outline" size={28} color="#8B5CF6" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.emojiBtn}>
              <Ionicons name="happy-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, message.trim() ? styles.sendBtnActive : styles.sendBtnInactive]}
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
                color={message.trim() ? "#ffffff" : "#D1D5DB"}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 4,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  moreBtn: {
    padding: 8,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
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
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
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
  noAvatarBubble: {
    marginLeft: 36,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentText: {
    color: '#ffffff',
  },
  receivedText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  receivedTime: {
    color: '#9CA3AF',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDotWrapper: {
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
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
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
  attachBtn: {
    paddingBottom: 4,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  emojiBtn: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnInactive: {
    backgroundColor: '#F3F4F6',
  },
});