// services/useNotificationCount.ts
import { useState, useEffect, useCallback } from "react";
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  Notification,
} from "../store/api/notificationApi";
import { useAppSelector } from "../store/hooks";
import Toast from "react-native-toast-message";

export const useNotificationCount = () => {
  const { user, token } = useAppSelector((state) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Get notifications with polling (30 seconds)
  const {
    data: notificationsData,
    refetch,
    isLoading,
    error,
  } = useGetNotificationsQuery(
    { page: 1, limit: 100 },
    {
      pollingInterval: 30000, // Poll every 30 seconds
      skip: !token || !user?._id,
    },
  );

  // Get unread count separately
  const {
    data: countData,
    refetch: refetchCount,
    isLoading: isCountLoading,
  } = useGetNotificationCountQuery(undefined, {
    pollingInterval: 30000,
    skip: !token || !user?._id,
  });

  const [markNotificationAsRead] = useMarkNotificationAsReadMutation();
  const [markAllNotificationsAsRead] = useMarkAllNotificationsAsReadMutation();

  // Update state when API data changes
  useEffect(() => {
    if (notificationsData?.notifications) {
      const newNotifications = notificationsData.notifications;
      setNotifications(newNotifications);
      setTotalCount(notificationsData.totalCount || newNotifications.length);

      // Check for new notifications and show toast
      if (
        newNotifications.length > lastNotificationCount &&
        lastNotificationCount > 0
      ) {
        // New notifications arrived
        const latestNotification = newNotifications[0];
        if (latestNotification) {
          showNotificationToast(latestNotification);
        }
      }
      setLastNotificationCount(newNotifications.length);
    }
  }, [notificationsData]);

  useEffect(() => {
    if (countData?.unreadCount !== undefined) {
      setUnreadCount(countData.unreadCount);
      setHasUnread(countData.unreadCount > 0);
    } else if (notificationsData?.unreadCount !== undefined) {
      setUnreadCount(notificationsData.unreadCount);
      setHasUnread(notificationsData.unreadCount > 0);
    }
  }, [countData, notificationsData]);

  // Show toast notification for different types
  const showNotificationToast = (notification: Notification) => {
    const username = notification.fromUser?.username || "Someone";
    let icon = "📢";
    let title = "Notification";
    let message = notification.message || `${username} interacted with you`;

    switch (notification.type) {
      case "follow":
        icon = "👤";
        title = "New Follower";
        message = `${username} started following you`;
        break;
      case "follow_request":
        icon = "📨";
        title = "Follow Request";
        message = `${username} sent you a follow request`;
        break;
      case "follow_accepted":
        icon = "✅";
        title = "Follow Accepted";
        message = `${username} accepted your follow request`;
        break;
      case "merge_request":
        icon = "🤝";
        title = "Merge Request";
        message = `${username} sent you a merge request`;
        break;
      case "merge_request_accepted":
        icon = "🎉";
        title = "Merge Request Accepted";
        message = `${username} accepted your merge request`;
        break;
      case "merge_request_rejected":
        icon = "❌";
        title = "Merge Request Rejected";
        message = `${username} rejected your merge request`;
        break;
      case "post_like":
        icon = "❤️";
        title = "New Like";
        message = `${username} liked your post`;
        break;
      case "story_like":
        icon = "🔥";
        title = "Story Like";
        message = `${username} liked your story`;
        break;
      case "comment":
        icon = "💬";
        title = "New Comment";
        message = `${username} commented on your post`;
        break;
      case "comment_like":
        icon = "❤️";
        title = "Comment Like";
        message = `${username} liked your comment`;
        break;
      case "mention":
        icon = "📌";
        title = "Mention";
        message = `${username} mentioned you in a post`;
        break;
      case "new_message":
        icon = "💌";
        title = "New Message";
        message = `${username} sent you a message`;
        break;
      case "new_post":
        icon = "📝";
        title = "New Post";
        message = `${username} created a new post`;
        break;
      case "new_story":
        icon = "📸";
        title = "New Story";
        message = `${username} posted a new story`;
        break;
      case "mutual_connection_created":
        icon = "🔗";
        title = "New Connection";
        message = `You have a mutual connection with ${username}`;
        break;
      case "mutual_connection_reactivated":
        icon = "🔄";
        title = "Connection Reactivated";
        message = `Your connection with ${username} has been reactivated`;
        break;
      case "profile_update":
        icon = "✏️";
        title = "Profile Update";
        message = `${username} updated their profile`;
        break;
      case "reminder_due":
        icon = "⏰";
        title = "Reminder Due";
        message = notification.message || "You have a reminder due";
        break;
      default:
        icon = "📢";
        title = "Notification";
        message = notification.message || `${username} interacted with you`;
    }

    // Show toast
    Toast.show({
      type: "info",
      text1: title,
      text2: message,
      visibilityTime: 4000,
      position: "bottom",
      bottomOffset: 60,
      onPress: () => {
        // Navigate based on notification type
        handleNotificationPress(notification);
      },
    });
  };

  // Handle notification press - navigate to appropriate screen
  const handleNotificationPress = (notification: Notification) => {
    console.log("👆 Notification pressed:", notification);

    // You can implement navigation here
    // For example:
    // if (notification.type === 'follow' || notification.type === 'follow_request') {
    //   navigate to user profile
    // } else if (notification.type === 'post_like' || notification.type === 'comment') {
    //   navigate to post
    // }
  };

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;

      try {
        const result = await markNotificationAsRead(notificationId).unwrap();
        console.log("✅ Notification marked as read:", result);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setHasUnread(unreadCount - 1 > 0);

        return result;
      } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        throw error;
      }
    },
    [token, markNotificationAsRead, unreadCount],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const result = await markAllNotificationsAsRead().unwrap();
      console.log("✅ All notifications marked as read:", result);

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setHasUnread(false);

      return result;
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
      throw error;
    }
  }, [token, markAllNotificationsAsRead]);

  // Force refresh
  const refresh = useCallback(async () => {
    console.log("🔄 Refreshing notifications...");
    try {
      const [notificationsResult, countResult] = await Promise.all([
        refetch(),
        refetchCount(),
      ]);
      return { notifications: notificationsResult, count: countResult };
    } catch (error) {
      console.error("❌ Error refreshing notifications:", error);
      throw error;
    }
  }, [refetch, refetchCount]);

  // Get notification count for badge
  const getBadgeCount = useCallback(() => {
    return unreadCount > 99 ? "99+" : unreadCount;
  }, [unreadCount]);

  // Get notifications by type
  const getNotificationsByType = useCallback(
    (type: string) => {
      return notifications.filter((n) => n.type === type);
    },
    [notifications],
  );

  // Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  // Get recent notifications (last 5)
  const getRecentNotifications = useCallback(
    (limit: number = 5) => {
      return notifications.slice(0, limit);
    },
    [notifications],
  );

  // Get notification message
  const getNotificationMessage = useCallback((notification: Notification) => {
    const username = notification.fromUser?.username || "Someone";
    switch (notification.type) {
      case "follow":
        return `${username} started following you`;
      case "follow_request":
        return `${username} sent you a follow request`;
      case "follow_accepted":
        return `${username} accepted your follow request`;
      case "post_like":
        return `${username} liked your post`;
      case "story_like":
        return `${username} liked your story`;
      case "comment":
        return `${username} commented on your post`;
      case "mention":
        return `${username} mentioned you in a post`;
      case "new_message":
        return `${username} sent you a message`;
      default:
        return notification.message || `${username} interacted with you`;
    }
  }, []);

  return {
    unreadCount,
    totalCount,
    hasUnread,
    notifications,
    isLoading: isLoading || isCountLoading,
    error,
    refetch: refresh,
    markAsRead,
    markAllAsRead,
    getBadgeCount,
    getNotificationsByType,
    getUnreadNotifications,
    getRecentNotifications,
    getNotificationMessage,
    showNotificationToast,
    handleNotificationPress,
  };
};
