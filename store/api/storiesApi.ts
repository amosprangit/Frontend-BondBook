import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithLogger } from './baseQuery';

export interface Story {
  _id: string;
  image: string;
  imageUrl: string;
  createdAt: string;
  expiresAt: string;
  views?: string[];
}

export interface UserStories {
  _id: string;
  user: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
    profilePicture?: string;
  };
  stories: Story[];
  storyCount: number;
}

export interface StoriesResponse {
  success: boolean;
  stories: UserStories[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UploadStoryResponse {
  success: boolean;
  message: string;
  story?: Story;
}

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: createBaseQueryWithLogger(),
  tagTypes: ['Stories'],
  endpoints: (builder) => ({
    getStories: builder.query<StoriesResponse, void>({
      query: () => ({
        url: '/api/stories/',
        method: 'GET',
      }),
      providesTags: ['Stories'],
    }),
    getStoriesFeed: builder.query<StoriesResponse, void>({
      query: () => {
        console.log('Fetching stories feed...');
        return {
          url: '/api/stories/feed',
          method: 'GET',
        };
      },
      providesTags: ['Stories'],
    }),
    getMyStories: builder.query<StoriesResponse, void>({
      query: () => ({
        url: '/api/stories/me',
        method: 'GET',
      }),
      providesTags: ['Stories'],
    }),
    uploadStory: builder.mutation<UploadStoryResponse, FormData>({
      query: (formData) => {
        console.log('Uploading story...');
        return {
          url: '/api/stories/',
          method: 'POST',
          body: formData,
          // FormData will automatically set Content-Type with boundary
        };
      },
      invalidatesTags: ['Stories'],
    }),
    deleteStory: builder.mutation<{ success: boolean; message: string }, string>({
      query: (storyId) => ({
        url: `/api/stories/${storyId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Stories'],
    }),
  }),
});

export const {
  useGetStoriesQuery,
  useGetStoriesFeedQuery,
  useGetMyStoriesQuery,
  useUploadStoryMutation,
  useDeleteStoryMutation,
} = storiesApi;
