import { useGetNotificationsQuery } from '../store/api/notificationApi';

export const useNotificationCount = () => {
  const { data: notificationsData, refetch } = useGetNotificationsQuery(
    { limit: 100 },
    { pollingInterval: 30000 } // Updates every 30 seconds
  );

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalCount = notifications.length;
  const hasUnread = unreadCount > 0;

  return {
    unreadCount,
    totalCount,
    hasUnread,
    refetch,
  };
};