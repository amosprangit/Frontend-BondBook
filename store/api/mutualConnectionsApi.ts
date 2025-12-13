import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithLogger } from './baseQuery';

export interface MutualConnection {
  _id: string;
  connectionId: string;
  displayName: string;
  profilePicture?: string;
  bio?: string;
  users: Array<{
    _id: string;
    username: string;
    profilePicture?: string;
    email: string;
  }>;
  user1?: any;
  user2?: any;
  otherUser?: {
    _id: string;
    username: string;
    profilePicture?: string;
    email: string;
  };
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
}

export interface Message {
  _id: string;
  mutualConnection: string;
  sender: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  receiver: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  content: string;
  messageType: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  mutualConnectionId: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
}

export interface GetMessagesResponse {
  success: boolean;
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MutualConnectionsResponse {
  success: boolean;
  mutualConnections: MutualConnection[];
}

export interface MutualConnectionResponse {
  success: boolean;
  mutualConnection: MutualConnection;
}

export interface UpdateMutualConnectionProfileRequest {
  bio?: string;
  profilePicture?: string;
  displayName?: string;
}

export interface MutualConnectionPost {
  _id: string;
  mutualConnection: string;
  createdBy: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  image?: string;
  video?: string;
  caption?: string;
  tags?: string[];
  location?: string;
  likes?: number;
  likeCount?: number;
  likedBy?: Array<{
    _id: string;
    username: string;
    profilePicture?: string;
  }>;
  comments?: Array<{
    _id: string;
    user: {
      _id: string;
      username: string;
      profilePicture?: string;
    };
    comment: string;
    createdAt: string;
  }>;
  commentCount?: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MutualConnectionPostsResponse {
  success: boolean;
  posts: MutualConnectionPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateMutualPostSuccessResponse {
  success: boolean;
  message: string;
  post: MutualConnectionPost;
}

export const mutualConnectionsApi = createApi({
  reducerPath: 'mutualConnectionsApi',
  baseQuery: createBaseQueryWithLogger({
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['MutualConnections', 'Messages', 'MutualConnectionPosts'],
  endpoints: (builder) => ({
    // Get all mutual connections for current user
    getMutualConnections: builder.query<MutualConnectionsResponse, void>({
      query: () => ({
        url: '/api/mutual-connections/my-connections',
        method: 'GET',
      }),
      providesTags: ['MutualConnections'],
    }),

    // Get specific mutual connection by other user ID
    getMutualConnection: builder.query<MutualConnectionResponse, string>({
      query: (otherUserId) => ({
        url: `/api/mutual-connections/${otherUserId}`,
        method: 'GET',
      }),
      providesTags: (result, error, otherUserId) => [
        { type: 'MutualConnections', id: otherUserId },
        'MutualConnections'
      ],
    }),

    // Get mutual connection by ID
    getMutualConnectionById: builder.query<MutualConnectionResponse, string>({
      query: (mutualConnectionId) => ({
        url: `/api/mutual-connections/by-id/${mutualConnectionId}`,
        method: 'GET',
      }),
      providesTags: ['MutualConnections'],
    }),

    // Update mutual connection profile
    updateMutualConnectionProfile: builder.mutation<
      MutualConnectionResponse,
      { mutualConnectionId: string; data: UpdateMutualConnectionProfileRequest }
    >({
      query: ({ mutualConnectionId, data }) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/profile`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['MutualConnections'],
    }),

    // Upload mutual connection profile picture
    uploadMutualConnectionProfilePicture: builder.mutation<
      { success: boolean; message: string; profilePicture: string },
      { mutualConnectionId: string; formData: FormData }
    >({
      query: ({ mutualConnectionId, formData }) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/profile-picture`,
        method: 'PUT',
        body: formData,
        prepareHeaders: (headers: Headers) => {
          // Remove Content-Type to let browser set it automatically for FormData
          headers.delete('Content-Type');
          return headers;
        },
      }),
      invalidatesTags: ['MutualConnections'],
    }),

    // Send message
    sendMessage: builder.mutation<
      { success: boolean; message: string; data: Message },
      SendMessageRequest
    >({
      query: ({ mutualConnectionId, content, messageType, mediaUrl }) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/messages`,
        method: 'POST',
        body: { content, messageType, mediaUrl },
      }),
      invalidatesTags: ['Messages'],
    }),

    // Get messages for a mutual connection
    getMessages: builder.query<
      GetMessagesResponse,
      { mutualConnectionId: string; page?: number; limit?: number }
    >({
      query: ({ mutualConnectionId, page = 1, limit = 50 }) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/messages?page=${page}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: ['Messages'],
    }),

    // Get unread message count
    getUnreadMessageCount: builder.query<
      { success: boolean; unreadCount: number },
      string
    >({
      query: (mutualConnectionId) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/messages/unread-count`,
        method: 'GET',
      }),
      providesTags: ['Messages'],
    }),

    // Mark messages as read
    markMessagesAsRead: builder.mutation<
      { success: boolean; message: string; updatedCount: number },
      string
    >({
      query: (mutualConnectionId) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/messages/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Messages'],
    }),

    // Get posts for mutual connection
    getMutualConnectionPosts: builder.query<
      MutualConnectionPostsResponse,
      { mutualConnectionId: string; page?: number; limit?: number }
    >({
      query: ({ mutualConnectionId, page = 1, limit = 12 }) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/posts`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'MutualConnectionPosts', id: arg.mutualConnectionId },
      ],
    }),

    // Create mutual connection post
    createMutualConnectionPost: builder.mutation<
      CreateMutualPostSuccessResponse,
      { mutualConnectionId: string; data: FormData }
    >({
      query: ({ mutualConnectionId, data }) => ({
        url: `/api/mutual-connections/${mutualConnectionId}/posts`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'MutualConnectionPosts', id: arg.mutualConnectionId },
        'MutualConnections',
      ],
    }),

    // Unmerge mutual connection
    unmergeMutualConnection: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (otherUserId) => ({
        url: `/api/mutual-connections/unmerge/${otherUserId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, otherUserId) => [
        'MutualConnections',
        'Auth',
        { type: 'Auth', id: `merge-status-${otherUserId}` }
      ],
    }),
  }),
});

export const {
  useGetMutualConnectionsQuery,
  useGetMutualConnectionQuery,
  useGetMutualConnectionByIdQuery,
  useUpdateMutualConnectionProfileMutation,
  useUploadMutualConnectionProfilePictureMutation,
  useSendMessageMutation,
  useGetMessagesQuery,
  useGetUnreadMessageCountQuery,
  useMarkMessagesAsReadMutation,
  useGetMutualConnectionPostsQuery,
  useCreateMutualConnectionPostMutation,
  useUnmergeMutualConnectionMutation,
} = mutualConnectionsApi;

