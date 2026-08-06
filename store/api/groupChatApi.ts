// store/api/groupChatApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const groupChatApi = createApi({
  reducerPath: "groupChatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api`,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["GroupChat"],
  endpoints: (builder) => ({
    createGroupChat: builder.mutation({
      query: (formData) => ({
        url: "/chats/group",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["GroupChat"],
    }),
    getGroupChats: builder.query({
      query: () => "/chats/groups",
      providesTags: ["GroupChat"],
    }),
    getGroupChatDetails: builder.query({
      query: (groupId) => `/chats/group/${groupId}`,
      providesTags: (result, error, groupId) => [
        { type: "GroupChat", id: groupId },
      ],
    }),
    updateGroupChat: builder.mutation({
      query: ({ groupId, ...data }) => ({
        url: `/chats/group/${groupId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { groupId }) => [
        { type: "GroupChat", id: groupId },
      ],
    }),
    addMembersToGroup: builder.mutation({
      query: ({ groupId, members }) => ({
        url: `/chats/group/${groupId}/members`,
        method: "POST",
        body: { members },
      }),
      invalidatesTags: (result, error, { groupId }) => [
        { type: "GroupChat", id: groupId },
      ],
    }),
    removeMemberFromGroup: builder.mutation({
      query: ({ groupId, memberId }) => ({
        url: `/chats/group/${groupId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { groupId }) => [
        { type: "GroupChat", id: groupId },
      ],
    }),
    leaveGroup: builder.mutation({
      query: (groupId) => ({
        url: `/chats/group/${groupId}/leave`,
        method: "POST",
      }),
      invalidatesTags: ["GroupChat"],
    }),
    deleteGroup: builder.mutation({
      query: (groupId) => ({
        url: `/chats/group/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["GroupChat"],
    }),
  }),
});

export const {
  useCreateGroupChatMutation,
  useGetGroupChatsQuery,
  useGetGroupChatDetailsQuery,
  useUpdateGroupChatMutation,
  useAddMembersToGroupMutation,
  useRemoveMemberFromGroupMutation,
  useLeaveGroupMutation,
  useDeleteGroupMutation,
} = groupChatApi;
