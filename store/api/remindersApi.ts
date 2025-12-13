import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithLogger } from './baseQuery';

export interface Reminder {
  _id: string;
  user: string;
  title: string;
  description?: string;
  reminderDate: string;
  reminderTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'personal' | 'work' | 'health' | 'social' | 'finance' | 'other';
  isCompleted: boolean;
  completedAt?: string;
  isRecurring: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  notificationSent: boolean;
  isDismissed: boolean;
  snoozeUntil?: string;
  attachments?: string[];
  tags?: string[];
  color?: string;
  isShared?: boolean;
  sharedBy?: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  sharedWith?: string[];
  wishMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Friend {
  _id: string;
  username: string;
  profilePicture?: string;
  email?: string;
}

export interface FriendsResponse {
  success: boolean;
  friends: Friend[];
}

export interface ShareReminderRequest {
  friendIds: string[];
  wishMessage?: string;
}

export interface CreateReminderRequest {
  title: string;
  description?: string;
  reminderDate: string;
  reminderTime: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'personal' | 'work' | 'health' | 'social' | 'finance' | 'other';
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  color?: string;
  attachments?: string[];
}

export interface UpdateReminderRequest {
  title?: string;
  description?: string;
  reminderDate?: string;
  reminderTime?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'personal' | 'work' | 'health' | 'social' | 'finance' | 'other';
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  color?: string;
  attachments?: string[];
}

export interface ReminderStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  today: number;
  byPriority: Array<{ _id: string; count: number }>;
  byCategory: Array<{ _id: string; count: number }>;
}

export interface RemindersResponse {
  success: boolean;
  count: number;
  reminders: Reminder[];
  message?: string;
}

export interface ReminderResponse {
  success: boolean;
  message?: string;
  reminder?: Reminder;
}

export interface StatsResponse {
  success: boolean;
  stats: ReminderStats;
}

export const remindersApi = createApi({
  reducerPath: 'remindersApi',
  baseQuery: createBaseQueryWithLogger({
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Reminders', 'ReminderStats'],
  endpoints: (builder) => ({
    // Get all reminders
    getReminders: builder.query<RemindersResponse, {
      completed?: boolean;
      priority?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      order?: 'asc' | 'desc';
    } | void>({
      query: (params) => ({
        url: '/api/reminders',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Reminders'],
    }),

    // Get reminder by ID
    getReminderById: builder.query<ReminderResponse, string>({
      query: (reminderId) => ({
        url: `/api/reminders/${reminderId}`,
        method: 'GET',
      }),
      providesTags: ['Reminders'],
    }),

    // Get upcoming reminders
    getUpcomingReminders: builder.query<RemindersResponse, number | void>({
      query: (limit) => ({
        url: '/api/reminders/upcoming',
        method: 'GET',
        params: limit ? { limit } : {},
      }),
      providesTags: ['Reminders'],
    }),

    // Get overdue reminders
    getOverdueReminders: builder.query<RemindersResponse, void>({
      query: () => ({
        url: '/api/reminders/overdue',
        method: 'GET',
      }),
      providesTags: ['Reminders'],
    }),

    // Get today's reminders
    getTodayReminders: builder.query<RemindersResponse, void>({
      query: () => ({
        url: '/api/reminders/today',
        method: 'GET',
      }),
      providesTags: ['Reminders'],
    }),

    // Get reminder statistics
    getReminderStats: builder.query<StatsResponse, void>({
      query: () => ({
        url: '/api/reminders/stats',
        method: 'GET',
      }),
      providesTags: ['ReminderStats'],
    }),

    // Create reminder
    createReminder: builder.mutation<ReminderResponse, CreateReminderRequest>({
      query: (data) => ({
        url: '/api/reminders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Reminders', 'ReminderStats'],
    }),

    // Update reminder
    updateReminder: builder.mutation<ReminderResponse, { reminderId: string; data: UpdateReminderRequest }>({
      query: ({ reminderId, data }) => ({
        url: `/api/reminders/${reminderId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Reminders', 'ReminderStats'],
    }),

    // Delete reminder
    deleteReminder: builder.mutation<ReminderResponse, string>({
      query: (reminderId) => ({
        url: `/api/reminders/${reminderId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reminders', 'ReminderStats'],
    }),

    // Mark reminder as completed
    markReminderCompleted: builder.mutation<ReminderResponse, string>({
      query: (reminderId) => ({
        url: `/api/reminders/${reminderId}/complete`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Reminders', 'ReminderStats'],
    }),

    // Snooze reminder
    snoozeReminder: builder.mutation<ReminderResponse, { reminderId: string; minutes: number }>({
      query: ({ reminderId, minutes }) => ({
        url: `/api/reminders/${reminderId}/snooze`,
        method: 'PATCH',
        body: { minutes },
      }),
      invalidatesTags: ['Reminders'],
    }),

    // Get friends for sharing
    getFriendsForSharing: builder.query<FriendsResponse, void>({
      query: () => ({
        url: '/api/reminders/friends',
        method: 'GET',
      }),
    }),

    // Share reminder with friends
    shareReminder: builder.mutation<ReminderResponse, { reminderId: string; data: ShareReminderRequest }>({
      query: ({ reminderId, data }) => ({
        url: `/api/reminders/${reminderId}/share`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Reminders'],
    }),

    // Get shared reminders
    getSharedReminders: builder.query<RemindersResponse, void>({
      query: () => ({
        url: '/api/reminders/shared',
        method: 'GET',
      }),
      providesTags: ['Reminders'],
    }),

    // Check due reminders and trigger notifications
    checkDueReminders: builder.query<RemindersResponse, void>({
      query: () => ({
        url: '/api/reminders/check/due',
        method: 'GET',
      }),
    }),

    // Get active due reminders for popup (not dismissed, not completed)
    getActiveDueReminders: builder.query<RemindersResponse, void>({
      query: () => ({
        url: '/api/reminders/active-due',
        method: 'GET',
      }),
      providesTags: ['Reminders'],
    }),

    // Dismiss reminder (turn off reminder popup permanently)
    dismissReminder: builder.mutation<ReminderResponse, string>({
      query: (reminderId) => ({
        url: `/api/reminders/${reminderId}/dismiss`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Reminders'],
    }),
  }),
});

export const {
  useGetRemindersQuery,
  useGetReminderByIdQuery,
  useGetUpcomingRemindersQuery,
  useGetOverdueRemindersQuery,
  useGetTodayRemindersQuery,
  useGetReminderStatsQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useDeleteReminderMutation,
  useMarkReminderCompletedMutation,
  useSnoozeReminderMutation,
  useGetFriendsForSharingQuery,
  useShareReminderMutation,
  useGetSharedRemindersQuery,
  useCheckDueRemindersQuery,
  useLazyCheckDueRemindersQuery,
  useGetActiveDueRemindersQuery,
  useLazyGetActiveDueRemindersQuery,
  useDismissReminderMutation,
} = remindersApi;

