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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
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
import { API_URL } from '@env';
import Toast from 'react-native-toast-message';

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

  // Check due reminders when screen loads
  const [checkDueReminders] = useLazyCheckDueRemindersQuery();

  // Fetch notifications, follow requests, and merge requests
  // Poll notifications every 30 seconds to check for new reminder notifications
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useGetNotificationsQuery(
    { limit: 50 },
    { pollingInterval: 30000 } // Poll every 30 seconds
  );
  const { data: followRequestsData, isLoading: isLoadingFollowRequests, refetch: refetchFollowRequests } = useGetFollowRequestsQuery();
  const { data: mergeRequestsData, isLoading: isLoadingMergeRequests, refetch: refetchMergeRequests } = useGetMergeRequestsQuery();

  const followRequests: FollowRequest[] = followRequestsData?.incoming || [];
  const mergeRequests: MergeRequest[] = mergeRequestsData?.mergeRequests || [];
  const notifications: Notification[] = notificationsData?.notifications || [];
  const [previousNotificationCount, setPreviousNotificationCount] = React.useState(0);

  // Show toast when new reminder notifications arrive
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

  // Check due reminders when screen is focused
  React.useEffect(() => {
    // Check for due reminders when screen loads
    checkDueReminders().then(() => {
      // Refetch notifications after checking reminders
      refetchNotifications();
    }).catch((error) => {
      console.error('Error checking due reminders:', error);
    });
  }, []); // Only run once on mount

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Check due reminders first, then refetch notifications
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
      console.error('Accept request error:', error);
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
      console.error('Reject request error:', error);
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
      console.error('Accept merge request error:', error);
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
      console.error('Reject merge request error:', error);
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

    // Navigate based on notification type
    if (notification.type === 'merge_request' && notification.relatedId) {
      // If it's a merge request notification, refresh to show it in merge requests section
      refetchMergeRequests();
    } else if (notification.type === 'mutual_connection_created' && notification.relatedId) {
      // Navigate to mutual connection profile if available
      // You can add navigation here if needed
    } else if (notification.type === 'follow_accepted' && notification.fromUser?._id) {
      // Navigate to user profile
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
      console.error('Delete notification error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to delete notification',
      });
      // Close swipeable on error
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
            <Ionicons name="trash-outline" size={24} color="#ffffff" />
          )}
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_request':
        return '👤';
      case 'follow_accepted':
        return '✅';
      case 'new_post':
        return '📸';
      case 'new_story':
        return '📖';
      case 'profile_update':
        return '✏️';
      case 'mutual_connection_created':
        return '🤝';
      case 'mutual_connection_post':
        return '🫱';
      case 'merge_request':
        return '🔗';
      case 'merge_request_accepted':
        return '✅';
      case 'merge_request_rejected':
        return '❌';
      case 'reminder_due':
        return '⏰';
      default:
        return '🔔';
    }
  };

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonIcon}>
              <Entypo name="chevron-left" size={20} color="#8B5CF6" />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {/* Follow Requests Section */}
        {followRequests.length > 0 && (
          <View style={styles.followRequestsSection}>
            <Text style={styles.sectionTitle}>Follow Requests</Text>
            {followRequests.map((request) => (
              <View key={request._id} style={styles.followRequestItem}>
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
                    {new Date(request.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleAcceptRequest(request._id)}
                    disabled={processingRequest === request._id}
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

        {/* Merge Requests Section */}
        {mergeRequests.length > 0 && (
          <View style={styles.followRequestsSection}>
            <Text style={styles.sectionTitle}>Merge Requests</Text>
            {mergeRequests.map((request) => (
              <View key={request._id} style={styles.followRequestItem}>
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
                  <Text style={styles.requestTime}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.requestSubtext}>Wants to create mutual connection</Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleAcceptMergeRequest(request._id)}
                    disabled={processingMergeRequest === request._id}
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

        {/* Notifications List */}
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {isLoadingNotifications ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map((notification) => {
              const fromUser = notification.fromUser;
              // For reminder notifications, don't show username
              const isReminderNotification = notification.type === 'reminder_due';
              const username = isReminderNotification ? '' : (fromUser?.username || 'Someone');
              const avatarUri = isReminderNotification 
                ? null // Don't show avatar for reminder notifications
                : (fromUser?.profilePicture
                    ? `${API_URL}${fromUser.profilePicture}`
                    : 'https://picsum.photos/150/150?random=1');
              const messageBody = isReminderNotification
                ? notification.message // Show full message for reminders
                : (notification.message
                    ? notification.message.replace(username, '').trim()
                    : 'sent you a notification');
              
              // Check if this is a merge request notification that can be acted upon
              const isMergeRequestNotification = notification.type === 'merge_request' && notification.relatedId;
              // Find the corresponding merge request if it exists
              const relatedMergeRequest = isMergeRequestNotification 
                ? mergeRequests.find(mr => mr._id === notification.relatedId)
                : null;
              // For merge request notifications, show buttons if:
              // 1. It's a merge_request type notification (not accepted/rejected)
              // 2. We have a related merge request with pending status, OR
              // 3. We don't have it in the list yet (assume it's pending) - use the relatedId directly
              // Don't show buttons for accepted/rejected merge requests
              const isAcceptedOrRejected = notification.type === 'merge_request_accepted' || notification.type === 'merge_request_rejected';
              const canActOnMergeRequest = isMergeRequestNotification && !isAcceptedOrRejected && (
                (relatedMergeRequest && relatedMergeRequest.status === 'pending') ||
                (!relatedMergeRequest && notification.relatedId) // Show buttons even if not in merge requests list yet
              );
              const mergeRequestId = relatedMergeRequest?._id || (isMergeRequestNotification ? notification.relatedId : null);

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
                      styles.notificationItem,
                      !notification.isRead && styles.unreadNotification,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.notificationContentWrapper}
                      onPress={() => handleNotificationPress(notification)}
                    >
                      <View style={styles.notificationIconContainer}>
                        <Text style={styles.notificationIcon}>
                          {getNotificationIcon(notification.type)}
                        </Text>
                      </View>
                      {avatarUri ? (
                        <Image
                          source={{ uri: avatarUri }}
                          style={styles.notificationAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.notificationAvatarPlaceholder}>
                          <Ionicons name="notifications" size={24} color="#8B5CF6" />
                        </View>
                      )}
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationText}>
                          {username && (
                            <>
                              <Text style={styles.notificationUsername}>
                                {username}
                              </Text>{' '}
                            </>
                          )}
                          {messageBody}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {!notification.isRead && <View style={styles.unreadDot} />}
                    </TouchableOpacity>

                    {/* Accept/Reject buttons for merge request notifications */}
                    {canActOnMergeRequest && mergeRequestId && (
                      <View style={styles.notificationActions}>
                        <TouchableOpacity
                          style={[
                            styles.notificationActionButton,
                            styles.acceptNotificationButton,
                          ]}
                          onPress={() => handleAcceptMergeRequest(mergeRequestId)}
                          disabled={processingMergeRequest === mergeRequestId}
                        >
                          {processingMergeRequest === mergeRequestId ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Ionicons name="checkmark" size={18} color="#ffffff" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.notificationActionButton,
                            styles.rejectNotificationButton,
                          ]}
                          onPress={() => handleRejectMergeRequest(mergeRequestId)}
                          disabled={processingMergeRequest === mergeRequestId}
                        >
                          {processingMergeRequest === mergeRequestId ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <Ionicons name="close" size={18} color="#EF4444" />
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    flex: 1,
  },
  followRequestsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  followRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 10,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
  },
  notificationsSection: {
    marginBottom: 30,
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  notificationContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 20,
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  notificationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  notificationAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationUsername: {
    fontWeight: 'bold',
    color: '#000000',
  },
  notificationText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 5,
    paddingBottom: 10,
    justifyContent: 'flex-end',
  },
  notificationActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptNotificationButton: {
    backgroundColor: '#10B981',
  },
  rejectNotificationButton: {
    backgroundColor: '#F3F4F6',
  },
  gestureRoot: {
    flex: 1,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 100,
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
    fontWeight: 'bold',
    marginTop: 4,
  },
});
