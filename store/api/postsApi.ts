import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithLogger } from "./baseQuery";

export interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
  };
  image?: string;
  imageUrl?: string;
  video?: string;
  caption: string;
  likes: number | string[];
  likeCount?: number;
  isLiked?: boolean;
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      username: string;
    };
    text?: string;
    comment?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PostsResponse {
  success: boolean;
  posts: Post[];
}

export interface UserPostsResponse {
  message: string;
  userProfile: {
    _id: string;
    username: string;
    email: string;
    bio: string;
    profilePicture: string;
    profilePictureUrl: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isVerified: boolean;
    createdAt: string;
    isFollowing: boolean;
    isFollowedBy: boolean;
    isConnected: boolean;
  };
  userPosts: Post[];
  postsCount: number;
}

export interface CreatePostResponse {
  success: boolean;
  message: string;
  post?: Post;
}

export interface CreatePostRequest {
  image: any; // FormData image
  caption?: string;
}

export interface LikePostRequest {
  postId: string;
  action: number; // 1 to like, 0 to unlike
}

export interface LikePostResponse {
  success: boolean;
  message: string;
  likes: number | string[];
  likeCount?: number;
  isLiked?: boolean;
}

export interface CommentPostRequest {
  postId: string;
  text: string;
}

export interface CommentPostResponse {
  success: boolean;
  message: string;
  comment: {
    _id: string;
    user: {
      _id: string;
      username: string;
    };
    text: string;
    createdAt: string;
  };
}

export const postsApi = createApi({
  reducerPath: "postsApi",
  baseQuery: createBaseQueryWithLogger(),
  tagTypes: ["Posts"],
  endpoints: (builder) => ({
    getPosts: builder.query<PostsResponse, void>({
      query: () => ({
        url: "/api/posts/",
        method: "GET",
      }),
      providesTags: ["Posts"],
    }),
    getMyPosts: builder.query<PostsResponse, void>({
      query: () => ({
        url: "/api/posts/me",
        method: "GET",
      }),
      providesTags: ["Posts"],
    }),
    getUserPosts: builder.query<UserPostsResponse, string>({
      query: (userId) => ({
        url: `/api/posts/user/${userId}/profile`,
        method: "GET",
      }),
      providesTags: (result, error, userId) => [{ type: "Posts", id: userId }],
    }),
    getPostById: builder.query<{ success: boolean; post: any }, string>({
      query: (postId) => ({
        url: `/api/posts/${postId}`,
        method: "GET",
      }),
      providesTags: (result, error, postId) => [{ type: "Posts", id: postId }],
    }),
    createPost: builder.mutation<CreatePostResponse, FormData>({
      query: (formData) => {
        console.log("Creating post...");
        return {
          url: "/api/posts/",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Posts"],
    }),
    likePost: builder.mutation<LikePostResponse, LikePostRequest>({
      query: ({ postId, action }) => ({
        url: `/api/posts/${postId}/likes`,
        method: "PUT",
        body: { action: action, like: action },
      }),
      // Don't invalidate - we update cache manually for instant UI feedback
    }),
    commentPost: builder.mutation<CommentPostResponse, CommentPostRequest>({
      query: ({ postId, text }) => ({
        url: `/api/posts/${postId}/comments`,
        method: "POST",
        body: { comment: text },
      }),
      invalidatesTags: ["Posts"],
    }),
    deletePost: builder.mutation<{ success: boolean; message: string }, string>(
      {
        query: (postId) => ({
          url: `/api/posts/${postId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Posts"],
      },
    ),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostByIdQuery,
  useGetMyPostsQuery,
  useGetUserPostsQuery,
  useCreatePostMutation,
  useLikePostMutation,
  useCommentPostMutation,
  useDeletePostMutation,
} = postsApi;
