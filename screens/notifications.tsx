import React, { useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, Feather } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import TabHeader from '../components/tabHeader';
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
export default function NotificationScreen({ navigation }: { navigation: any }) {
  const [acceptRequest] = useAcceptFollowRequestMutation();
  const [rejectRequest] = useRejectFollowRequestMutation();
  const [acceptMergeRequest] = useAcceptMergeRequestMutation();
  const [rejectMergeRequest] = useRejectMergeRequestMutation();
  const [processingRequest, setProcessingRequest] = React.useState<string | null>(null);
  const [processingMergeRequest, setProcessingMergeRequest] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deletingNotification, setDeletingNotification] = React.useState<string | null>(null);
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
  const [previousNotificationCount, setPreviousNotificationCount] = React.useState(0);

  React.useEffect(() => {
    if (notifications.length > previousNotificationCount && previousNotificationCount > 0) {
      const newNotifications = notifications.slice(0, notifications.length - previousNotificationCount);
      const reminderNotifications = newNotifications.filter(n => n.type === 'reminder_due' && !n.isRead);
      
      if (reminderNotifications.length > 0) {
        reminderNotifications.forEach(notification => {
          Toast.show({
            type: 'info',
            text1: '⏰ Reminder Due',
            text2: notification.message,
            visibilityTime: 4000,
          });
        });
      }
    }
    setPreviousNotificationCount(notifications.length);
  }, [notifications.length, previousNotificationCount]);

  React.useEffect(() => {
    checkDueReminders().then(() => {
      refetchNotifications();
    }).catch((error) => {
      console.error('Error checking due reminders:', error);
    });
  }, []);

  const onRefresh = React.useCallback(async () => {
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
      const result = await acceptRequest(requestId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: result.message || 'Follow request accepted',
      });
      refetchFollowRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to accept request',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const result = await rejectRequest(requestId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: result.message || 'Follow request rejected',
      });
      refetchFollowRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to reject request',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleAcceptMergeRequest = async (requestId: string) => {
    setProcessingMergeRequest(requestId);
    try {
      const result = await acceptMergeRequest(requestId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: result.message || 'Merge request accepted. Mutual connection created!',
      });
      refetchMergeRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to accept merge request',
      });
    } finally {
      setProcessingMergeRequest(null);
    }
  };

  const handleRejectMergeRequest = async (requestId: string) => {
    setProcessingMergeRequest(requestId);
    try {
      const result = await rejectMergeRequest(requestId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: result.message || 'Merge request rejected',
      });
      refetchMergeRequests();
      refetchNotifications();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to reject merge request',
      });
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

    if (notification.type === 'merge_request' && notification.relatedId) {
      refetchMergeRequests();
    } else if (notification.type === 'follow_accepted' && notification.fromUser?._id) {
      navigation.navigate('UserInfo', { userId: notification.fromUser._id });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setDeletingNotification(notificationId);
    try {
      await deleteNotification(notificationId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Deleted',
        text2: 'Notification deleted successfully',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to delete notification',
      });
      const swipeable = swipeableRefs.current.get(notificationId);
      if (swipeable) {
        swipeable.close();
      }
    } finally {
      setDeletingNotification(null);
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    notificationId: string
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteNotification(notificationId)}
        disabled={deletingNotification === notificationId}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            styles.deleteActionContent,
            { transform: [{ translateX: trans }] },
          ]}
        >
          {deletingNotification === notificationId ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={24} color="#ffffff" />
              <Text style={styles.deleteActionText}>Delete</Text>
            </>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_request':
        return { icon: 'person-add-outline', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] };
      case 'follow_accepted':
        return { icon: 'checkmark-circle-outline', color: '#10B981', gradient: ['#10B981', '#34D399'] };
      case 'new_post':
        return { icon: 'image-outline', color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] };
      case 'new_story':
        return { icon: 'book-outline', color: '#EC489A', gradient: ['#EC489A', '#F472B6'] };
      case 'profile_update':
        return { icon: 'create-outline', color: '#6366F1', gradient: ['#6366F1', '#818CF8'] };
      case 'mutual_connection_created':
        return { icon: 'people-outline', color: '#14B8A6', gradient: ['#14B8A6', '#2DD4BF'] };
      case 'mutual_connection_post':
        return { icon: 'chatbubble-outline', color: '#F97316', gradient: ['#F97316', '#FB923C'] };
      case 'merge_request':
        return { icon: 'link-outline', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] };
      case 'merge_request_accepted':
        return { icon: 'checkmark-done-outline', color: '#10B981', gradient: ['#10B981', '#34D399'] };
      case 'merge_request_rejected':
        return { icon: 'close-circle-outline', color: '#EF4444', gradient: ['#EF4444', '#F87171'] };
      case 'reminder_due':
        return { icon: 'alarm-outline', color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] };
      default:
        return { icon: 'notifications-outline', color: '#9CA3AF', gradient: ['#9CA3AF', '#B9C0CC'] };
    }
  };

  const formatTimeAgo = (dateString: string) => {
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

  const hasRequests = followRequests.length > 0 || mergeRequests.length > 0;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
        >
          {/* Enhanced Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <View style={styles.backButtonIcon}>
                <Entypo name="chevron-left" size={24} color="#8B5CF6" />
              </View>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Notifications</Text>
              {!hasRequests && notifications.length === 0 && (
                <Text style={styles.subtitle}>Stay updated with your activity</Text>
              )}
            </View>
            <View style={styles.headerRight} />
          </View>

          {/* Enhanced Follow Requests Section */}
          {followRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="person-add" size={20} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Follow Requests</Text>
                </View>
                <Text style={styles.sectionCount}>{followRequests.length}</Text>
              </View>
              {followRequests.map((request) => (
                <View key={request._id} style={styles.requestCard}>
                  <Image
                    source={{ 
                      uri: request.requester.profilePicture 
                        ? API_URL + request.requester.profilePicture 
                        : request.requester.profilePictureUrl || 'https://picsum.photos/150/150?random=1' 
                    }}
                    style={styles.requestAvatar}
                    resizeMode="cover"
                  />
                  
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestUsername}>{request.requester.username}</Text>
                    <Text style={styles.requestTime}>
                      {formatTimeAgo(request.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request._id)}
                      disabled={processingRequest === request._id}
                      activeOpacity={0.8}
                    >
                      {processingRequest === request._id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons name="checkmark" size={20} color="#ffffff" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request._id)}
                      disabled={processingRequest === request._id}
                      activeOpacity={0.8}
                    >
                      {processingRequest === request._id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="close" size={20} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Enhanced Merge Requests Section */}
          {mergeRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="link" size={20} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Connection Requests</Text>
                </View>
                <Text style={styles.sectionCount}>{mergeRequests.length}</Text>
              </View>
              {mergeRequests.map((request) => (
                <View key={request._id} style={styles.requestCard}>
                  <Image
                    source={{ 
                      uri: request.requester.profilePicture 
                        ? API_URL + request.requester.profilePicture 
                        : 'https://picsum.photos/150/150?random=1' 
                    }}
                    style={styles.requestAvatar}
                    resizeMode="cover"
                  />
                  
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestUsername}>{request.requester.username}</Text>
                    <Text style={styles.requestSubtext}>Wants to connect with you</Text>
                    <Text style={styles.requestTime}>
                      {formatTimeAgo(request.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptMergeRequest(request._id)}
                      disabled={processingMergeRequest === request._id}
                      activeOpacity={0.8}
                    >
                      {processingMergeRequest === request._id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons name="checkmark" size={20} color="#ffffff" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => handleRejectMergeRequest(request._id)}
                      disabled={processingMergeRequest === request._id}
                      activeOpacity={0.8}
                    >
                      {processingMergeRequest === request._id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="close" size={20} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Enhanced Notifications List */}
          <View style={styles.notificationsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>
              {notifications.length > 0 && (
                <Text style={styles.sectionCount}>{notifications.length}</Text>
              )}
            </View>
            
            {isLoadingNotifications ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="notifications-off-outline" size={64} color="#E5E7EB" />
                </View>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  When you get notifications, they'll appear here
                </Text>
              </View>
            ) : (
              notifications.map((notification) => {
                const fromUser = notification.fromUser;
                const isReminderNotification = notification.type === 'reminder_due';
                const username = isReminderNotification ? '' : (fromUser?.username || 'Someone');
                const avatarUri = isReminderNotification 
                  ? null
                  : (fromUser?.profilePicture
                      ? `${API_URL}${fromUser.profilePicture}`
                      : null);
                const messageBody = isReminderNotification
                  ? notification.message
                  : (notification.message
                      ? notification.message.replace(username, '').trim()
                      : 'sent you a notification');
                
                const isMergeRequestNotification = notification.type === 'merge_request' && notification.relatedId;
                const relatedMergeRequest = isMergeRequestNotification 
                  ? mergeRequests.find(mr => mr._id === notification.relatedId)
                  : null;
                const isAcceptedOrRejected = notification.type === 'merge_request_accepted' || notification.type === 'merge_request_rejected';
                const canActOnMergeRequest = isMergeRequestNotification && !isAcceptedOrRejected && (
                  (relatedMergeRequest && relatedMergeRequest.status === 'pending') ||
                  (!relatedMergeRequest && notification.relatedId)
                );
                const mergeRequestId = relatedMergeRequest?._id || (isMergeRequestNotification ? notification.relatedId : null);
                
                const iconData = getNotificationIcon(notification.type);

                return (
                  <Swipeable
                    key={notification._id}
                    ref={(ref) => {
                      if (ref) {
                        swipeableRefs.current.set(notification._id, ref);
                      } else {
                        swipeableRefs.current.delete(notification._id);
                      }
                    }}
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, notification._id)
                    }
                    rightThreshold={40}
                    overshootRight={false}
                  >
                    <View
                      style={[
                        styles.notificationCard,
                        !notification.isRead && styles.unreadNotificationCard,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.notificationContent}
                        onPress={() => handleNotificationPress(notification)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.notificationIconWrapper}>
                          <LinearGradient
                            colors={iconData.gradient}
                            style={styles.notificationIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name={iconData.icon} size={22} color="#ffffff" />
                          </LinearGradient>
                        </View>
                        
                        {avatarUri ? (
                          <Image
                            source={{ uri: avatarUri }}
                            style={styles.notificationAvatar}
                            resizeMode="cover"
                          />
                        ) : !isReminderNotification ? (
                          <View style={styles.notificationAvatarPlaceholder}>
                            <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                          </View>
                        ) : null}
                        
                        <View style={styles.notificationInfo}>
                          <Text style={styles.notificationText}>
                            {username && (
                              <Text style={styles.notificationUsername}>
                                {username}
                              </Text>
                            )}
                            {username && ' '}
                            {messageBody}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {formatTimeAgo(notification.createdAt)}
                          </Text>
                        </View>
                        
                        {!notification.isRead && <View style={styles.unreadDot} />}
                      </TouchableOpacity>

                      {canActOnMergeRequest && mergeRequestId && (
                        <View style={styles.notificationActionsInline}>
                          <TouchableOpacity
                            style={[styles.inlineActionButton, styles.acceptInlineButton]}
                            onPress={() => handleAcceptMergeRequest(mergeRequestId)}
                            disabled={processingMergeRequest === mergeRequestId}
                          >
                            {processingMergeRequest === mergeRequestId ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark" size={16} color="#ffffff" />
                                <Text style={styles.inlineActionText}>Accept</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.inlineActionButton, styles.rejectInlineButton]}
                            onPress={() => handleRejectMergeRequest(mergeRequestId)}
                            disabled={processingMergeRequest === mergeRequestId}
                          >
                            {processingMergeRequest === mergeRequestId ? (
                              <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                              <>
                                <Ionicons name="close" size={16} color="#EF4444" />
                                <Text style={[styles.inlineActionText, styles.rejectInlineText]}>Decline</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Swipeable>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  requestsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  requestAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  requestSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginTop: 20,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  unreadNotificationCard: {
    backgroundColor: '#FEF9E7',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  notificationIconWrapper: {
    marginRight: 12,
  },
  notificationIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationUsername: {
    fontWeight: '800',
    color: '#111827',
  },
  notificationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginLeft: 8,
  },
  notificationActionsInline: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    justifyContent: 'flex-end',
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptInlineButton: {
    backgroundColor: '#10B981',
  },
  rejectInlineButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectInlineText: {
    color: '#EF4444',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    fontWeight: '500',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 100,
    marginBottom: 12,
    borderRadius: 16,
    marginRight: 16,
  },
  deleteActionContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});