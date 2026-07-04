import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithLogger } from "./baseQuery";

export interface Story {
  _id: string;
  image: string;
  imageUrl: string;
  createdAt: string;
  expiresAt: string;
  views?: string[];
  likes?: number;
  isLiked?: boolean;
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

export interface StoryLikeResponse {
  success: boolean;
  isLiked: boolean;
  likes: number;
}

export const storiesApi = createApi({
  reducerPath: "storiesApi",
  baseQuery: createBaseQueryWithLogger(),
  tagTypes: ["Stories", "MyStories"],
  endpoints: (builder) => ({
    getStories: builder.query<StoriesResponse, void>({
      query: () => ({
        url: "/api/stories/",
        method: "GET",
      }),
      providesTags: ["Stories"],
    }),
    getStoriesFeed: builder.query<StoriesResponse, void>({
      query: () => {
        console.log("Fetching stories feed...");
        return {
          url: "/api/stories/feed",
          method: "GET",
        };
      },
      providesTags: ["Stories"],
    }),
    getMyStories: builder.query<StoriesResponse, void>({
      query: () => ({
        url: "/api/stories/me",
        method: "GET",
      }),
      providesTags: ["MyStories"],
    }),
    uploadStory: builder.mutation<UploadStoryResponse, FormData>({
      query: (formData) => {
        console.log("Uploading story...");
        return {
          url: "/api/stories/",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Stories", "MyStories"],
    }),
    deleteStory: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (storyId) => ({
        url: `/api/stories/${storyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stories", "MyStories"],
    }),
    // ✅ ADD STORY LIKE ENDPOINT
    likeStory: builder.mutation<StoryLikeResponse, { storyId: string }>({
      query: ({ storyId }) => ({
        url: `/api/stories/${storyId}/like`,
        method: "POST",
      }),
      invalidatesTags: ["Stories", "MyStories"],
    }),
    // ✅ ADD STORY UNLIKE ENDPOINT
    unlikeStory: builder.mutation<StoryLikeResponse, { storyId: string }>({
      query: ({ storyId }) => ({
        url: `/api/stories/${storyId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stories", "MyStories"],
    }),
  }),
});

export const {
  useGetStoriesQuery,
  useGetStoriesFeedQuery,
  useGetMyStoriesQuery,
  useUploadStoryMutation,
  useDeleteStoryMutation,
  useLikeStoryMutation, // ✅ Export this
  useUnlikeStoryMutation, // ✅ Export this
} = storiesApi;
