import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Animated,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useAcceptFollowRequestMutation, useRejectFollowRequestMutation, useAcceptMergeRequestMutation, useRejectMergeRequestMutation } from '../store/api/authApi';
import {
  useGetNotificationsQuery,
  useGetFollowRequestsQuery,
  useGetMergeRequestsQuery,
  useMarkNotificationAsReadMutation,
  useDeleteNotificationMutation,
  Notification,
  FollowRequest,
  MergeRequest,
} from '../store/api/notificationApi';
import { useLazyCheckDueRemindersQuery } from '../store/api/remindersApi';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ✅ Minimal notification config
const NOTIFICATION_CONFIG: Record<string, { icon: string; color: string }> = {
  follow: { icon: 'person-add-outline', color: '#8B5CF6' },
  follow_request: { icon: 'person-add-outline', color: '#F59E0B' },
  follow_accepted: { icon: 'checkmark-circle-outline', color: '#10B981' },
  merge_request: { icon: 'link-outline', color: '#8B5CF6' },
  merge_request_accepted: { icon: 'checkmark-done-outline', color: '#10B981' },
  merge_request_rejected: { icon: 'close-circle-outline', color: '#EF4444' },
  new_message: { icon: 'chatbubble-outline', color: '#3B82F6' },
  post_like: { icon: 'heart-outline', color: '#EF4444' },
  story_like: { icon: 'heart-outline', color: '#EC4899' },
  comment: { icon: 'chatbubble-outline', color: '#F59E0B' },
  comment_like: { icon: 'heart-outline', color: '#EF4444' },
  mention: { icon: 'at-outline', color: '#8B5CF6' },
  new_post: { icon: 'image-outline', color: '#F59E0B' },
  new_story: { icon: 'book-outline', color: '#EC4899' },
  profile_update: { icon: 'create-outline', color: '#6366F1' },
  reminder_due: { icon: 'alarm-outline', color: '#F59E0B' },
  mutual_connection_created: { icon: 'people-outline', color: '#14B8A6' },
  mutual_connection_post: { icon: 'chatbubble-outline', color: '#F97316' },
};

export default function NotificationScreen({ navigation }: { navigation: any }) {
  const [acceptRequest] = useAcceptFollowRequestMutation();
  const [rejectRequest] = useRejectFollowRequestMutation();
  const [acceptMergeRequest] = useAcceptMergeRequestMutation();
  const [rejectMergeRequest] = useRejectMergeRequestMutation();
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [processingMergeRequest, setProcessingMergeRequest] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deletingNotification, setDeletingNotification] = useState<string | null>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const [checkDueReminders] = useLazyCheckDueRemindersQuery();

  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useGetNotificationsQuery(
    { limit: 50 },
    { pollingInterval: 30000 }
  );
  const { data: followRequestsData, isLoading: isLoadingFollowRequests, refetch: refetchFollowRequests } = useGetFollowRequestsQuery();
  const { data: mergeRequestsData, isLoading: isLoadingMergeRequests, refetch: refetchMergeRequests } = useGetMergeRequestsQuery();

  const followRequests: FollowRequest[] = followRequestsData?.incoming || [];
  const mergeRequests: MergeRequest[] = mergeRequestsData?.mergeRequests || [];
  const notifications: Notification[] = notificationsData?.notifications || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkDueReminders();
      await Promise.all([refetchNotifications(), refetchFollowRequests(), refetchMergeRequests()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchNotifications, refetchFollowRequests, refetchMergeRequests, checkDueReminders]);

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await acceptRequest(requestId).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Follow request accepted' });
      refetchFollowRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to accept request' });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await rejectRequest(requestId).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Follow request rejected' });
      refetchFollowRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to reject request' });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleAcceptMergeRequest = async (requestId: string) => {
    setProcessingMergeRequest(requestId);
    try {
      await acceptMergeRequest(requestId).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Connection request accepted!' });
      refetchMergeRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to accept request' });
    } finally {
      setProcessingMergeRequest(null);
    }
  };

  const handleRejectMergeRequest = async (requestId: string) => {
    setProcessingMergeRequest(requestId);
    try {
      await rejectMergeRequest(requestId).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Connection request rejected' });
      refetchMergeRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to reject request' });
    } finally {
      setProcessingMergeRequest(null);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id).unwrap();
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }

    const type = notification.type;
    const data = notification;

    switch (type) {
      case 'follow':
      case 'follow_accepted':
        if (data.fromUser?._id) {
          navigation.navigate('UserInfo', { userId: data.fromUser._id });
        }
        break;
      case 'merge_request_accepted':
      case 'new_message':
        if (data.relatedId) {
          navigation.navigate('Chat', { mutualConnectionId: data.relatedId });
        }
        break;
      case 'post_like':
      case 'comment':
      case 'comment_like':
      case 'mention':
      case 'new_post':
        if (data.relatedId) {
          navigation.navigate('PostDetail', { postId: data.relatedId });
        }
        break;
      case 'story_like':
      case 'new_story':
        if (data.relatedId) {
          navigation.navigate('StoryView', { storyId: data.relatedId });
        }
        break;
      case 'reminder_due':
        navigation.navigate('Reminders');
        break;
      default:
        break;
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setDeletingNotification(notificationId);
    try {
      await deleteNotification(notificationId).unwrap();
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Notification deleted' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to delete' });
      const swipeable = swipeableRefs.current.get(notificationId);
      if (swipeable) swipeable.close();
    } finally {
      setDeletingNotification(null);
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    notificationId: string
  ) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteNotification(notificationId)}
        disabled={deletingNotification === notificationId}
        activeOpacity={0.9}
      >
        {deletingNotification === notificationId ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="trash-outline" size={22} color="#ffffff" />
        )}
      </TouchableOpacity>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item: notification }: { item: Notification }) => {
    const fromUser = notification.fromUser;
    const config = NOTIFICATION_CONFIG[notification.type] || { icon: 'notifications-outline', color: '#9CA3AF' };
    const isUnread = !notification.isRead;
    const username = fromUser?.username || '';
    const avatarUri = fromUser?.profilePicture ? `${API_URL}${fromUser.profilePicture}` : null;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(notification._id, ref);
          else swipeableRefs.current.delete(notification._id);
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, notification._id)}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.notificationItem, isUnread && styles.unreadItem]}
          onPress={() => handleNotificationPress(notification)}
          activeOpacity={0.7}
        >
          {/* Avatar or Icon */}
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: config.color + '15' }]}>
              <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.message} numberOfLines={2}>
              {username ? <Text style={styles.username}>{username} </Text> : null}
              <Text style={styles.body}>{notification.message}</Text>
            </Text>
            <Text style={styles.time}>{formatTimeAgo(notification.createdAt)}</Text>
          </View>

          {/* Unread indicator */}
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderRequestItem = (request: FollowRequest | MergeRequest, type: 'follow' | 'merge') => {
    const isMerge = type === 'merge';
    const username = isMerge ? (request as MergeRequest).requester.username : (request as FollowRequest).requester.username;
    const avatarUrl = isMerge
      ? (request as MergeRequest).requester.profilePicture
      : (request as FollowRequest).requester.profilePicture;
    const avatarUri = avatarUrl ? API_URL + avatarUrl : null;
    const isProcessing = isMerge
      ? processingMergeRequest === request._id
      : processingRequest === request._id;

    const handleAccept = isMerge
      ? () => handleAcceptMergeRequest(request._id)
      : () => handleAcceptRequest(request._id);
    const handleReject = isMerge
      ? () => handleRejectMergeRequest(request._id)
      : () => handleRejectRequest(request._id);

    return (
      <View style={styles.requestItem}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: '#8B5CF615' }]}>
            <Ionicons name="person-outline" size={20} color="#8B5CF6" />
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.message}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.body}>
              {isMerge ? ' wants to connect' : ' wants to follow you'}
            </Text>
          </Text>
          <Text style={styles.time}>{formatTimeAgo(request.createdAt)}</Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={handleAccept}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={handleReject}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="close" size={18} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const hasRequests = followRequests.length > 0 || mergeRequests.length > 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotificationItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
          }
          ListHeaderComponent={
            <>
              {/* Follow Requests */}
              {followRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Follow Requests</Text>
                  {followRequests.map((req) => renderRequestItem(req, 'follow'))}
                </View>
              )}

              {/* Merge Requests */}
              {mergeRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Connection Requests</Text>
                  {mergeRequests.map((req) => renderRequestItem(req, 'merge'))}
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !isLoadingNotifications && notifications.length === 0 && !hasRequests ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptySubtext}>No new notifications</Text>
              </View>
            ) : null
          }
        />

        {isLoadingNotifications && notifications.length === 0 && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#FEF9E7',
    borderColor: '#FEF9E7',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  username: {
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontWeight: '400',
    color: '#4B5563',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginLeft: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    borderRadius: 12,
    marginBottom: 8,
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});