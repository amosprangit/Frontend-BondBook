import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithLogger } from './baseQuery';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: {
      _id?: string;
      id?: string;
      username: string;
      email: string;
      name?: string;
      profilePicture?: string;
      profilePictureUrl?: string;
      bio?: string;
      followers?: string[];
      following?: string[];
      createdAt?: string;
      updatedAt?: string;
    };
  };
  // Support direct response format
  token?: string;
  user?: {
    _id?: string;
    id?: string;
    username: string;
    email: string;
    name?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
    bio?: string;
    followers?: string[];
    following?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      username: string;
      email: string;
      name: string;
    };
  };
}

export interface ProfileResponse {
  success?: boolean;
  message?: string;
  user?: {
    _id?: string;
    id?: string;
    username: string;
    email: string;
    name?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
    bio?: string;
    followers?: string[];
    following?: string[];
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    isFollowing?: boolean;
    isFollowedBy?: boolean;
    isConnected?: boolean;
    isVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  // Support direct user response
  _id?: string;
  username?: string;
  email?: string;
  profilePicture?: string;
  profilePictureUrl?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isConnected?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfilePictureResponse {
  success: boolean;
  message: string;
  profilePicture?: string;
  user?: {
    _id?: string;
    username?: string;
    email?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
    bio?: string;
    followers?: string[];
    following?: string[];
  };
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: {
    _id?: string;
    username?: string;
    email?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
    bio?: string;
    followers?: string[];
    following?: string[];
  };
}

export interface FollowRequest {
  followUserId: string;
}

export interface FollowResponse {
  success: boolean;
  message: string;
  user?: {
    _id?: string;
    username?: string;
    followers?: string[];
    following?: string[];
  };
}

export interface FollowRequestResponse {
  success: boolean;
  message: string;
  request?: any;
}

export interface FollowRequestStatusResponse {
  success: boolean;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  requestId: string | null;
  status: 'following' | 'pending' | 'none';
}

export interface MergeRequestRequest {
  targetUserId: string;
}

export interface MergeRequestResponse {
  success: boolean;
  message: string;
  request?: {
    _id: string;
    requester: {
      _id: string;
      username: string;
      profilePicture?: string;
    };
    recipient: {
      _id: string;
      username: string;
      profilePicture?: string;
    };
    status: string;
    createdAt: string;
  };
  mutualConnection?: {
    _id: string;
    connectionId: string;
    displayName: string;
  };
}

export interface MergeRequestStatusResponse {
  success: boolean;
  hasPendingRequest: boolean;
  hasMutualConnection: boolean;
  requestId: string | null;
  isRequester: boolean;
  mutualConnectionId: string | null;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: {
      _id?: string;
      username: string;
      email: string;
      profilePictureUrl?: string;
    };
  };
}

export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface DeleteProfileResponse {
  success: boolean;
  message: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createBaseQueryWithLogger({
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => {
        console.log('Login API Request Body:', credentials);
        return {
          url: '/api/users/login',
          method: 'POST',
          body: credentials,
        };
      },
      invalidatesTags: ['Auth'],
    }),
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (userData) => {
        console.log('Register API Request Body:', userData);
        return {
          url: '/api/users/register',
          method: 'POST',
          body: userData,
        };
      },
    }),
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    getProfile: builder.query<ProfileResponse, void>({
      query: () => ({
        url: '/api/users/profile',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    getUserById: builder.query<ProfileResponse, string>({
      query: (userId) => ({
        url: `/api/users/${userId}`,
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    updateProfilePicture: builder.mutation<UpdateProfilePictureResponse, FormData>({
      query: (formData) => {
        console.log('Updating profile picture...');
        return {
          url: '/api/users/profile-picture',
          method: 'PUT',
          body: formData,
          // Don't set Content-Type header - let browser set it with boundary for FormData
          prepareHeaders: (headers: Headers) => {
            // Remove Content-Type to let browser set it automatically for FormData
            headers.delete('Content-Type');
            return headers;
          },
        };
      },
      invalidatesTags: ['Auth'],
    }),
    updateProfile: builder.mutation<UpdateProfileResponse, UpdateProfileRequest>({
      query: (data) => {
        return {
          url: '/api/users/update-profile',
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: ['Auth'],
    }),
    toggleFollow: builder.mutation<FollowResponse, FollowRequest>({
      query: (data) => {
        return {
          url: '/api/users/toggle-follow',
          method: 'POST',
          body: data,
        };
      },
      invalidatesTags: ['Auth'],
    }),
    acceptFollowRequest: builder.mutation<FollowRequestResponse, string>({
      query: (requestId) => {
        return {
          url: `/api/users/follow-requests/${requestId}/accept`,
          method: 'POST',
        };
      },
      invalidatesTags: ['Auth'],
    }),
    rejectFollowRequest: builder.mutation<FollowRequestResponse, string>({
      query: (requestId) => {
        return {
          url: `/api/users/follow-requests/${requestId}/reject`,
          method: 'POST',
        };
      },
      invalidatesTags: ['Auth'],
    }),
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: (data) => {
        console.log('Verify OTP API Request:', data);
        return {
          url: '/api/users/verify-otp',
          method: 'POST',
          body: data,
        };
      },
      invalidatesTags: ['Auth'],
    }),
    resendOtp: builder.mutation<ResendOtpResponse, ResendOtpRequest>({
      query: (data) => {
        console.log('Resend OTP API Request:', data);
        return {
          url: '/api/users/resend-otp',
          method: 'POST',
          body: data,
        };
      },
    }),
    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (data) => {
        console.log('Forgot Password API Request:', data);
        return {
          url: '/api/users/forgot-password',
          method: 'POST',
          body: data,
        };
      },
    }),
    verifyResetOtp: builder.mutation<VerifyResetOtpResponse, VerifyResetOtpRequest>({
      query: (data) => {
        console.log('Verify Reset OTP API Request:', data);
        return {
          url: '/api/users/verify-reset-otp',
          method: 'POST',
          body: data,
        };
      },
    }),
    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (data) => {
        console.log('Reset Password API Request:', data);
        return {
          url: '/api/users/reset-password',
          method: 'POST',
          body: data,
        };
      },
    }),
    deleteProfile: builder.mutation<DeleteProfileResponse, void>({
      query: () => {
        console.log('Delete Profile API Request');
        return {
          url: '/api/users/delete-profile',
          method: 'DELETE',
        };
      },
      invalidatesTags: ['Auth'],
    }),
    checkFollowRequestStatus: builder.query<FollowRequestStatusResponse, string>({
      query: (targetUserId) => ({
        url: `/api/users/follow-request-status/${targetUserId}`,
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    checkFollowRequestByPost: builder.query<FollowRequestStatusResponse & { isOwnPost?: boolean; postOwnerId?: string }, string>({
      query: (postId) => ({
        url: `/api/users/follow-request-by-post/${postId}`,
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    sendMergeRequest: builder.mutation<MergeRequestResponse, MergeRequestRequest>({
      query: (data) => ({
        url: '/api/users/merge-request',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, data) => [
        'Auth',
        { type: 'Auth', id: `merge-status-${data.targetUserId}` }
      ],
    }),
    acceptMergeRequest: builder.mutation<MergeRequestResponse, string>({
      query: (requestId) => ({
        url: `/api/users/merge-requests/${requestId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    rejectMergeRequest: builder.mutation<MergeRequestResponse, string>({
      query: (requestId) => ({
        url: `/api/users/merge-requests/${requestId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    checkMergeRequestStatus: builder.query<MergeRequestStatusResponse, string>({
      query: (targetUserId) => ({
        url: `/api/users/merge-request-status/${targetUserId}`,
        method: 'GET',
      }),
      providesTags: (result, error, targetUserId) => [
        { type: 'Auth', id: `merge-status-${targetUserId}` },
        'Auth'
      ],
    }),
    getFollowers: builder.query<{
      success: boolean;
      followers: Array<{
        _id: string;
        username: string;
        profilePicture?: string;
        email: string;
        bio?: string;
        isVerified?: boolean;
        isFollowing?: boolean;
      }>;
      count: number;
    }, string>({
      query: (userId) => ({
        url: `/api/users/${userId}/followers`,
        method: 'GET',
      }),
      providesTags: (result, error, userId) => [
        { type: 'Auth', id: `followers-${userId}` },
        'Auth'
      ],
    }),
    getFollowing: builder.query<{
      success: boolean;
      following: Array<{
        _id: string;
        username: string;
        profilePicture?: string;
        email: string;
        bio?: string;
        isVerified?: boolean;
        isFollowing?: boolean;
      }>;
      count: number;
    }, string>({
      query: (userId) => ({
        url: `/api/users/${userId}/following`,
        method: 'GET',
      }),
      providesTags: (result, error, userId) => [
        { type: 'Auth', id: `following-${userId}` },
        'Auth'
      ],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useGetUserByIdQuery,
  useUpdateProfilePictureMutation,
  useUpdateProfileMutation,
  useToggleFollowMutation,
  useAcceptFollowRequestMutation,
  useRejectFollowRequestMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useVerifyResetOtpMutation,
  useResetPasswordMutation,
  useDeleteProfileMutation,
  useCheckFollowRequestStatusQuery,
  useCheckFollowRequestByPostQuery,
  useSendMergeRequestMutation,
  useAcceptMergeRequestMutation,
  useRejectMergeRequestMutation,
  useCheckMergeRequestStatusQuery,
  useGetFollowersQuery,
  useGetFollowingQuery,
} = authApi;
