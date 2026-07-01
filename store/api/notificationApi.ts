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
    | "follow_request"
    | "follow_accepted"
    | "new_post"
    | "new_story"
    | "profile_update"
    | "mutual_connection_created"
    | "mutual_connection_reactivated"
    | "merge_request"
    | "merge_request_accepted"
    | "merge_request_rejected"
    | "reminder_due"
    | "mutual_connection_post";
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

// ✅ Add interface for FCM token request
export interface SaveFCMTokenRequest {
  fcmToken: string;
}

export interface SaveFCMTokenResponse {
  success: boolean;
  message: string;
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: createBaseQueryWithLogger(),
  tagTypes: ["Notifications", "FollowRequests"],
  endpoints: (builder) => ({
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
    getFollowRequests: builder.query<FollowRequestsResponse, void>({
      query: () => ({
        url: "/api/users/follow-requests",
        method: "GET",
      }),
      providesTags: ["FollowRequests"],
    }),
    getMergeRequests: builder.query<MergeRequestsResponse, void>({
      query: () => ({
        url: "/api/users/merge-requests",
        method: "GET",
      }),
      providesTags: ["Notifications"],
    }),
    // ✅ ADD: Save FCM Token endpoint
    saveFCMToken: builder.mutation<SaveFCMTokenResponse, SaveFCMTokenRequest>({
      query: (body) => ({
        url: "/api/users/save-fcm-token",
        method: "POST",
        body,
      }),
      // Optional: You can invalidate something if needed
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useGetFollowRequestsQuery,
  useGetMergeRequestsQuery,
  // ✅ Export the new hook
  useSaveFCMTokenMutation,
} = notificationApi;
