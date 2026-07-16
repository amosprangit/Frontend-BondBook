import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithLogger } from "./baseQuery";

export interface Notification {
  _id: string;
  user: string;
  fromUser: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  type:
    // Follow Types
    | "follow"
    | "follow_request"
    | "follow_accepted"
    // Merge Request Types
    | "merge_request"
    | "merge_request_accepted"
    | "merge_request_rejected"
    // Chat Types
    | "new_message"
    // Post & Story Types
    | "post_like"
    | "story_like"
    | "comment"
    | "comment_like"
    | "mention"
    | "new_post"
    | "new_story"
    // Other Types
    | "profile_update"
    | "mutual_connection_created"
    | "mutual_connection_reactivated"
    | "mutual_connection_post"
    | "reminder_due";
  message: string;
  relatedId?: string;
  relatedModel?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FollowRequest {
  _id: string;
  requester: {
    _id: string;
    username: string;
    profilePicture?: string;
    email?: string;
  };
  recipient?: {
    _id: string;
    username: string;
    profilePicture?: string;
    email?: string;
  };
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface FollowRequestsResponse {
  success: boolean;
  incoming: FollowRequest[];
  outgoing: FollowRequest[];
}

export interface MergeRequest {
  _id: string;
  requester: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  recipient?: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface MergeRequestsResponse {
  success: boolean;
  mergeRequests: MergeRequest[];
}

// ✅ FCM Token interfaces
export interface SaveFCMTokenRequest {
  fcmToken: string;
}

export interface SaveFCMTokenResponse {
  success: boolean;
  message: string;
}

// ✅ Notification request interfaces
export interface FollowNotificationRequest {
  targetUserId: string;
}

export interface MergeRequestNotificationRequest {
  targetUserId: string;
  mergeRequestId: string;
}

export interface MergeRequestAcceptedNotificationRequest {
  targetUserId: string;
  mergeRequestId: string;
  connectionId?: string;
}

export interface MergeRequestRejectedNotificationRequest {
  targetUserId: string;
  mergeRequestId: string;
}

export interface NewMessageNotificationRequest {
  recipientId: string;
  mutualConnectionId: string;
  messageId: string;
  content: string;
}

export interface PostLikeNotificationRequest {
  recipientId: string;
  postId: string;
}

export interface StoryLikeNotificationRequest {
  recipientId: string;
  storyId: string;
}

export interface CommentNotificationRequest {
  recipientId: string;
  postId: string;
  commentId: string;
  commentText?: string;
}

export interface CommentLikeNotificationRequest {
  recipientId: string;
  postId: string;
  commentId: string;
}

export interface MentionNotificationRequest {
  recipientId: string;
  postId: string;
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: createBaseQueryWithLogger(),
  tagTypes: ["Notifications", "FollowRequests"],
  endpoints: (builder) => ({
    // ==================== GET ENDPOINTS ====================
    getNotifications: builder.query<
      NotificationsResponse,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 50 } = {}) => ({
        url: "/api/notifications",
        method: "GET",
        params: { page, limit },
      }),
      providesTags: ["Notifications"],
    }),
    
    getUnreadNotifications: builder.query<
      { success: boolean; notifications: Notification[]; unreadCount: number },
      void
    >({
      query: () => ({
        url: "/api/notifications/unread",
        method: "GET",
      }),
      providesTags: ["Notifications"],
    }),
    
    getNotificationCount: builder.query<
      { success: boolean; unreadCount: number },
      void
    >({
      query: () => ({
        url: "/api/notifications/count",
        method: "GET",
      }),
      providesTags: ["Notifications"],
    }),

    getNotificationsByType: builder.query<
      { success: boolean; notifications: Notification[]; totalCount: number },
      { type: string; page?: number; limit?: number }
    >({
      query: ({ type, page = 1, limit = 20 }) => ({
        url: `/api/notifications/type/${type}`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: ["Notifications"],
    }),

    getLatestNotifications: builder.query<
      { success: boolean; notifications: Notification[]; count: number },
      { since?: number }
    >({
      query: ({ since }) => ({
        url: "/api/notifications/latest",
        method: "GET",
        params: since ? { since } : undefined,
      }),
      providesTags: ["Notifications"],
    }),

    // ==================== PUT ENDPOINTS ====================
    markNotificationAsRead: builder.mutation<
      { success: boolean; message: string; notification: Notification },
      string
    >({
      query: (notificationId) => ({
        url: `/api/notifications/${notificationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),
    
    markAllNotificationsAsRead: builder.mutation<
      { success: boolean; message: string; updatedCount: number },
      void
    >({
      query: () => ({
        url: "/api/notifications/read-all",
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),

    // ==================== DELETE ENDPOINTS ====================
    deleteNotification: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (notificationId) => ({
        url: `/api/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
    
    deleteAllNotifications: builder.mutation<
      { success: boolean; message: string; deletedCount: number },
      void
    >({
      query: () => ({
        url: "/api/notifications",
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),

    // ==================== FOLLOW NOTIFICATIONS ====================
    sendFollowNotification: builder.mutation<
      { success: boolean; message: string },
      { targetUserId: string }
    >({
      query: ({ targetUserId }) => ({
        url: `/api/notifications/follow/${targetUserId}`,
        method: "POST",
      }),
    }),

    sendFollowRequestNotification: builder.mutation<
      { success: boolean; message: string },
      { targetUserId: string }
    >({
      query: ({ targetUserId }) => ({
        url: `/api/notifications/follow-request/${targetUserId}`,
        method: "POST",
      }),
    }),

    sendFollowAcceptedNotification: builder.mutation<
      { success: boolean; message: string },
      { targetUserId: string }
    >({
      query: ({ targetUserId }) => ({
        url: `/api/notifications/follow-accepted/${targetUserId}`,
        method: "POST",
      }),
    }),

    // ==================== MERGE REQUEST NOTIFICATIONS ====================
    sendMergeRequestNotification: builder.mutation<
      { success: boolean; message: string },
      { targetUserId: string; mergeRequestId: string }
    >({
      query: ({ targetUserId, mergeRequestId }) => ({
        url: `/api/notifications/merge-request/${targetUserId}`,
        method: "POST",
        body: { mergeRequestId },
      }),
    }),

    sendMergeRequestAcceptedNotification: builder.mutation<
      { success: boolean; message: string },
      { targetUserId: string; mergeRequestId: string; connectionId?: string }
    >({
      query: ({ targetUserId, mergeRequestId, connectionId }) => ({
        url: `/api/notifications/merge-request-accepted/${targetUserId}`,
        method: "POST",
        body: { mergeRequestId, connectionId },
      }),
    }),

    sendMergeRequestRejectedNotification: builder.mutation<
      { success: boolean; message: string },
      { targetUserId: string; mergeRequestId: string }
    >({
      query: ({ targetUserId, mergeRequestId }) => ({
        url: `/api/notifications/merge-request-rejected/${targetUserId}`,
        method: "POST",
        body: { mergeRequestId },
      }),
    }),

    // ==================== CHAT NOTIFICATIONS ====================
    sendNewMessageNotification: builder.mutation<
      { success: boolean; message: string },
      { recipientId: string; mutualConnectionId: string; messageId: string; content: string }
    >({
      query: ({ recipientId, mutualConnectionId, messageId, content }) => ({
        url: `/api/notifications/new-message/${recipientId}`,
        method: "POST",
        body: { mutualConnectionId, messageId, content },
      }),
    }),

    // ==================== POST NOTIFICATIONS ====================
    sendPostLikeNotification: builder.mutation<
      { success: boolean; message: string },
      { recipientId: string; postId: string }
    >({
      query: ({ recipientId, postId }) => ({
        url: `/api/notifications/post-like/${recipientId}`,
        method: "POST",
        body: { postId },
      }),
    }),

    sendCommentNotification: builder.mutation<
      { success: boolean; message: string },
      { recipientId: string; postId: string; commentId: string; commentText?: string }
    >({
      query: ({ recipientId, postId, commentId, commentText }) => ({
        url: `/api/notifications/comment/${recipientId}`,
        method: "POST",
        body: { postId, commentId, commentText },
      }),
    }),

    sendCommentLikeNotification: builder.mutation<
      { success: boolean; message: string },
      { recipientId: string; postId: string; commentId: string }
    >({
      query: ({ recipientId, postId, commentId }) => ({
        url: `/api/notifications/comment-like/${recipientId}`,
        method: "POST",
        body: { postId, commentId },
      }),
    }),

    sendMentionNotification: builder.mutation<
      { success: boolean; message: string },
      { recipientId: string; postId: string }
    >({
      query: ({ recipientId, postId }) => ({
        url: `/api/notifications/mention/${recipientId}`,
        method: "POST",
        body: { postId },
      }),
    }),

    // ==================== STORY NOTIFICATIONS ====================
    sendStoryLikeNotification: builder.mutation<
      { success: boolean; message: string },
      { recipientId: string; storyId: string }
    >({
      query: ({ recipientId, storyId }) => ({
        url: `/api/notifications/story-like/${recipientId}`,
        method: "POST",
        body: { storyId },
      }),
    }),

    // ==================== FOLLOW REQUESTS ====================
    getFollowRequests: builder.query<FollowRequestsResponse, void>({
      query: () => ({
        url: "/api/users/follow-requests",
        method: "GET",
      }),
      providesTags: ["FollowRequests"],
    }),

    // ==================== MERGE REQUESTS ====================
    getMergeRequests: builder.query<MergeRequestsResponse, void>({
      query: () => ({
        url: "/api/users/merge-requests",
        method: "GET",
      }),
      providesTags: ["Notifications"],
    }),

    // ==================== FCM TOKEN ====================
    saveFCMToken: builder.mutation<SaveFCMTokenResponse, SaveFCMTokenRequest>({
      query: (body) => ({
        url: "/api/users/save-fcm-token",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  // GET
  useGetNotificationsQuery,
  useGetUnreadNotificationsQuery,
  useGetNotificationCountQuery,
  useGetNotificationsByTypeQuery,
  useGetLatestNotificationsQuery,
  
  // PUT
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  
  // DELETE
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  
  // FOLLOW
  useSendFollowNotificationMutation,
  useSendFollowRequestNotificationMutation,
  useSendFollowAcceptedNotificationMutation,
  
  // MERGE REQUEST
  useSendMergeRequestNotificationMutation,
  useSendMergeRequestAcceptedNotificationMutation,
  useSendMergeRequestRejectedNotificationMutation,
  
  // CHAT
  useSendNewMessageNotificationMutation,
  
  // POST
  useSendPostLikeNotificationMutation,
  useSendCommentNotificationMutation,
  useSendCommentLikeNotificationMutation,
  useSendMentionNotificationMutation,
  
  // STORY
  useSendStoryLikeNotificationMutation,
  
  // REQUESTS
  useGetFollowRequestsQuery,
  useGetMergeRequestsQuery,
  
  // FCM
  useSaveFCMTokenMutation,
} = notificationApi;