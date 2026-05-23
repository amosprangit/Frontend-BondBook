import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  useToggleFollowMutation,
  useSendMergeRequestMutation,
  useCheckMergeRequestStatusQuery,
  useGetFollowersQuery,
  useGetFollowingQuery
} from '../store/api/authApi';
import { useGetMutualConnectionQuery, useUnmergeMutualConnectionMutation } from '../store/api/mutualConnectionsApi';
import { useGetUserPostsQuery, Post, useLikePostMutation, useCommentPostMutation, postsApi } from '../store/api/postsApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

interface UserInfoScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
    };
  };
}

export default function UserInfoScreen({ navigation, route }: UserInfoScreenProps) {
  const dispatch = useAppDispatch();
  const { userId } = route.params;
  const { user: reduxUser } = useAppSelector((state) => state.auth);
  const { data: userPostsData, isLoading, error, refetch } = useGetUserPostsQuery(userId);
  const [toggleFollow, { isLoading: isTogglingFollow }] = useToggleFollowMutation();
  const [sendMergeRequest, { isLoading: isSendingMerge }] = useSendMergeRequestMutation();
  const [unmergeMutualConnection, { isLoading: isUnmerging }] = useUnmergeMutualConnectionMutation();
  const { data: mergeStatus, refetch: refetchMergeStatus, isLoading: isLoadingMergeStatus } = useCheckMergeRequestStatusQuery(userId, { 
    skip: !userId,
    refetchOnMountOrArgChange: true,
  });
  
  // Also check mutual connection directly as a fallback
  const { data: mutualConnectionData, refetch: refetchMutualConnection, error: mutualConnectionError } = useGetMutualConnectionQuery(userId, {
    skip: !userId,
  });
  
  const [isFollowingState, setIsFollowingState] = useState(false);
  const userProfile = userPostsData?.userProfile;
  const userPosts = userPostsData?.userPosts || [];
  
  // Post modal state
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [likePost] = useLikePostMutation();
  const [commentPost, { isLoading: isCommenting }] = useCommentPostMutation();
  
  // Followers/Following modal state
  const [followersFollowingModalVisible, setFollowersFollowingModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  // Fetch followers and following lists - MUST be before any early returns
  const {
    data: followersData,
    isLoading: isLoadingFollowers,
    error: followersError,
    refetch: refetchFollowers,
    isFetching: isFetchingFollowers
  } = useGetFollowersQuery(userId, {
    skip: !userId || !followersFollowingModalVisible
  });

  const {
    data: followingData,
    isLoading: isLoadingFollowing,
    error: followingError,
    refetch: refetchFollowing,
    isFetching: isFetchingFollowing
  } = useGetFollowingQuery(userId, {
    skip: !userId || !followersFollowingModalVisible
  });

  // Track previous user to detect login changes
  const previousUserIdRef = useRef<string | null>(null);
  
  // Monitor user changes and refetch data when logged-in user logs in or switches
  useEffect(() => {
    const currentUserId = reduxUser?._id || reduxUser?.id;
    
    // If logged-in user changed (different user logged in)
    if (currentUserId && previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      console.log('Logged-in user changed in userInfo, refreshing data...');
      // Refetch the viewed user's data
      refetch();
    }
    
    // Update previous user ID
    previousUserIdRef.current = currentUserId || null;
  }, [reduxUser, refetch]);

  // Sync selectedPost with cache when userPosts updates (e.g., after like/unlike)
  useEffect(() => {
    if (selectedPost && postModalVisible && userPosts.length > 0) {
      const updatedPost = userPosts.find((p: any) => p._id === selectedPost._id);
      if (updatedPost && (
        updatedPost.isLiked !== selectedPost.isLiked ||
        updatedPost.likeCount !== selectedPost.likeCount ||
        updatedPost.likes !== selectedPost.likes
      )) {
        console.log('Syncing selectedPost with cache:', {
          postId: updatedPost._id,
          oldIsLiked: selectedPost.isLiked,
          newIsLiked: updatedPost.isLiked,
          oldCount: selectedPost.likeCount,
          newCount: updatedPost.likeCount
        });
        setSelectedPost(updatedPost);
      }
    }
  }, [userPosts, selectedPost?._id, postModalVisible]);

  // Force refetch followers/following when modal opens to ensure fresh data
  useEffect(() => {
    if (followersFollowingModalVisible && userId) {
      console.log('🔄 Followers/Following modal opened - triggering refetch for userId:', userId);
      const timer = setTimeout(() => {
        refetchFollowers().catch((err) => {
          console.error('❌ Followers refetch error:', err);
        });
        refetchFollowing().catch((err) => {
          console.error('❌ Following refetch error:', err);
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [followersFollowingModalVisible, userId, refetchFollowers, refetchFollowing]);

  const handleFollowToggle = async () => {
    const wasFollowing = isFollowingState;
    try {
      await toggleFollow({ followUserId: userId }).unwrap();
      const updatedState = !wasFollowing;
      setIsFollowingState(updatedState);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: updatedState ? 'Followed successfully' : 'Unfollowed successfully',
      });
      refetch();
    } catch (error: any) {
      console.error('Toggle Follow error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to toggle follow',
      });
    }
  };

  const handleMergeRequest = async () => {
    try {
      await sendMergeRequest({ targetUserId: userId }).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Merge request sent successfully',
      });
      // Refetch merge status to update UI
      setTimeout(() => {
        refetchMergeStatus();
      }, 500);
    } catch (error: any) {
      console.error('Send merge request error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to send merge request',
      });
    }
  };

  const handleUnmerge = async () => {
    try {
      console.log('Attempting to unmerge with userId:', userId);
      const result = await unmergeMutualConnection(userId).unwrap();
      console.log('Unmerge success:', result);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Connection unmerged successfully',
      });
      // Force refetch all related queries to update UI immediately
      // Small delay to ensure backend has processed the unmerge
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch merge status first (this is the primary source of truth)
      const mergeStatusResult = await refetchMergeStatus();
      console.log('Refetched merge status:', mergeStatusResult.data);
      
      // Then refetch mutual connection (may return 404, which is expected after unmerge)
      try {
        await refetchMutualConnection();
      } catch (err: any) {
        // 404 is expected after unmerge, so we can ignore it
        if (err?.status !== 404 && err?.originalStatus !== 404) {
          console.error('Error refetching mutual connection:', err);
        }
      }
      
      // Refetch user posts to update any related data
      await refetch();
    } catch (error: any) {
      console.error('Unmerge error details:', {
        error,
        message: error?.data?.message,
        status: error?.status,
        data: error?.data,
        userId
      });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || error?.message || 'Failed to unmerge connection',
      });
    }
  };

  useEffect(() => {
    if (userProfile?.isFollowing === undefined) return;
    setIsFollowingState(Boolean(userProfile.isFollowing));
  }, [userProfile?.isFollowing]);

  const handlePostPress = (post: any) => {
    // Ensure we have the latest post data from cache, including isLiked status
    const cachedPost = userPosts.find((p: any) => p._id === post._id);
    const postToShow = cachedPost || post;
    console.log('Opening post modal:', {
      postId: postToShow._id,
      isLiked: postToShow.isLiked,
      likeCount: postToShow.likeCount || postToShow.likes
    });
    setSelectedPost(postToShow);
    setPostModalVisible(true);
  };

  const handleClosePostModal = () => {
    setPostModalVisible(false);
    setSelectedPost(null);
    setNewComment('');
  };

  const handleLikePost = async (postId: string) => {
    try {
      // Read current state directly from selectedPost to avoid stale closures
      let currentIsLiked = false;
      let currentLikeCount = 0;
      
      // Get current state from selectedPost if modal is open
      if (selectedPost && selectedPost._id === postId) {
        currentIsLiked = Boolean(selectedPost.isLiked);
        currentLikeCount = typeof selectedPost.likes === 'number' 
          ? selectedPost.likes 
          : (Array.isArray(selectedPost.likes) ? selectedPost.likes.length : (selectedPost.likeCount || 0));
      } else {
        // Fallback: get from cache
        const cachedPost = userPosts.find((p: any) => p._id === postId);
        if (cachedPost) {
          currentIsLiked = Boolean(cachedPost.isLiked);
          currentLikeCount = typeof cachedPost.likes === 'number' 
            ? cachedPost.likes 
            : (Array.isArray(cachedPost.likes) ? cachedPost.likes.length : (cachedPost.likeCount || 0));
        }
      }
      
      // Toggle: if currently liked, unlike (action=0), if not liked, like (action=1)
      const action = currentIsLiked ? 0 : 1;
      const newIsLiked = action === 1;
      
      // Log the current state for debugging
      console.log('Like button clicked (TOGGLE):', {
        postId,
        currentIsLiked,
        action,
        newIsLiked,
        currentLikeCount,
        message: currentIsLiked ? 'UNLIKING (sending action=0)' : 'LIKING (sending action=1)'
      });
      
      // Optimistically update selectedPost state immediately for UI feedback
      if (selectedPost && selectedPost._id === postId) {
        setSelectedPost((prev: any) => {
          if (prev && prev._id === postId) {
            const prevLikeCount = typeof prev.likes === 'number' 
              ? prev.likes 
              : (Array.isArray(prev.likes) ? prev.likes.length : (prev.likeCount || 0));
            
            return {
              ...prev,
              isLiked: newIsLiked,
              likes: newIsLiked ? prevLikeCount + 1 : Math.max(0, prevLikeCount - 1),
              likeCount: newIsLiked ? prevLikeCount + 1 : Math.max(0, prevLikeCount - 1),
            };
          }
          return prev;
        });
      }
      
      // Optimistically update the cache for immediate UI feedback
      const patchResult = dispatch(
        postsApi.util.updateQueryData('getUserPosts', userId, (draft) => {
          const post = draft.userPosts?.find((p) => p._id === postId);
          if (post) {
            const prevLikeCount = typeof post.likes === 'number' 
              ? post.likes 
              : (Array.isArray(post.likes) ? post.likes.length : (post.likeCount || 0));
            
            post.isLiked = newIsLiked;
            post.likes = newIsLiked ? prevLikeCount + 1 : Math.max(0, prevLikeCount - 1);
            post.likeCount = newIsLiked ? prevLikeCount + 1 : Math.max(0, prevLikeCount - 1);
            
            console.log('Cache optimistic update:', {
              postId,
              newIsLiked,
              prevCount: prevLikeCount,
              newCount: post.likeCount
            });
          }
        })
      );
      
      try {
        const result = await likePost({ postId, action }).unwrap();
        console.log('Like result:', result);
        
        // Update cache with server response data (more reliable than refetch)
        dispatch(
          postsApi.util.updateQueryData('getUserPosts', userId, (draft) => {
            const post = draft.userPosts?.find((p) => p._id === postId);
            if (post && result && result.success) {
              // Use server response values - these are the authoritative values
              if (result.isLiked !== undefined) {
                post.isLiked = result.isLiked;
              }
              // Prefer likeCount from server, fallback to likes if it's a number
              const serverLikeCount = result.likeCount ?? (typeof result.likes === 'number' ? result.likes : undefined);
              if (serverLikeCount !== undefined) {
                post.likes = serverLikeCount;
                post.likeCount = serverLikeCount;
              }
            }
          })
        );
        
        // Update selected post if modal is open with server response
        if (selectedPost && selectedPost._id === postId && result && result.success) {
          setSelectedPost((prev: any) => {
            if (prev && prev._id === postId) {
              const serverLikeCount = result.likeCount ?? (typeof result.likes === 'number' ? result.likes : undefined);
              const newState = {
                ...prev,
                isLiked: result.isLiked !== undefined ? result.isLiked : prev.isLiked,
                likes: serverLikeCount !== undefined ? serverLikeCount : prev.likes,
                likeCount: serverLikeCount !== undefined ? serverLikeCount : prev.likeCount,
              };
              console.log('Updated selectedPost state:', {
                postId,
                isLiked: newState.isLiked,
                likeCount: newState.likeCount,
                serverResponse: result
              });
              return newState;
            }
            return prev;
          });
        }
      } catch (error: any) {
        // Revert optimistic update on error
        patchResult.undo();
        // Revert selectedPost state on error
        if (selectedPost && selectedPost._id === postId) {
          setSelectedPost((prev: any) => {
            if (prev && prev._id === postId) {
              return {
                ...prev,
                isLiked: !newIsLiked, // Revert to previous state
                likes: typeof prev.likes === 'number' ? prev.likes : (prev.likeCount || 0),
                likeCount: prev.likeCount || (typeof prev.likes === 'number' ? prev.likes : 0),
              };
            }
            return prev;
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Like post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to like post',
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedPost || !newComment?.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a comment',
      });
      return;
    }

    try {
      await commentPost({ postId: selectedPost._id, text: newComment }).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Comment added successfully',
      });
      setNewComment('');
      
      // Refetch posts to get updated comments
      const updatedPosts = await refetch();
      if (selectedPost) {
        const updatedPost = updatedPosts.data?.userPosts?.find((p: any) => p._id === selectedPost._id);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (error: any) {
      console.error('Comment post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to add comment',
      });
    }
  };

  // Debug logging and refetch on mount - MUST be before early returns
  useEffect(() => {
    if (userId) {
      refetchMergeStatus();
      refetchMutualConnection();
    }
  }, [userId, refetchMergeStatus, refetchMutualConnection]);

  useEffect(() => {
    console.log('Merge Status Debug:', {
      userId,
      mergeStatusHasMutualConnection: mergeStatus?.hasMutualConnection,
      mutualConnectionDataSuccess: mutualConnectionData?.success,
      hasPendingRequest: mergeStatus?.hasPendingRequest,
      isRequester: mergeStatus?.isRequester,
      fullMergeStatus: mergeStatus,
      fullMutualConnectionData: mutualConnectionData,
      isLoadingMergeStatus,
      computedHasMutualConnection: mergeStatus?.hasMutualConnection === true || mutualConnectionData?.success === true
    });
  }, [mergeStatus, mutualConnectionData, userId, isLoadingMergeStatus]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load user profile</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#6B7280', marginTop: 10 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const username = userProfile.username || 'User';
  const bio = userProfile.bio || 'No bio yet';
  const profilePicture = userProfile.profilePicture ? API_URL + "/" + userProfile.profilePicture.replace(/^\//, '') : 'https://picsum.photos/150/150?random=10';
  const followersCount = userProfile.followersCount || 0;
  const followingCount = userProfile.followingCount || 0;
  const postsCount = userProfile.postsCount || 0;
  const isFollowing = isFollowingState;
  
  // Extract followers and following arrays from API response
  const followers = Array.isArray(followersData?.followers) 
    ? followersData.followers 
    : [];
  const following = Array.isArray(followingData?.following) 
    ? followingData.following 
    : [];
  const hasPendingMergeRequest = mergeStatus?.hasPendingRequest || false;
  const isMergeRequester = mergeStatus?.isRequester || false;
  // Check both mergeStatus and direct mutual connection query
  // If mutual connection query returns 404, it means no connection exists
  const hasMutualConnection = 
    (mergeStatus?.hasMutualConnection === true) || 
    (mutualConnectionData?.success === true && !mutualConnectionError);

  // Data for the circular items
  const circularItemsData = [
    {
      id: 1,
      name: 'KrishRadha',
      emoji: '💙',
      imageUrl: 'https://picsum.photos/150/150?random=10'
    },
    {
      id: 2,
      name: 'BrahmaSaraswati',
      emoji: '🧡',
      imageUrl: 'https://picsum.photos/150/150?random=11'
    },
    {
      id: 3,
      name: 'Heeranjha',
      emoji: '💜',
      imageUrl: 'https://picsum.photos/150/150?random=12'
    },
    {
      id: 4,
      name: 'shivasati',
      emoji: '💙',
      imageUrl: 'https://picsum.photos/150/150?random=13'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <FontAwesome name="user-circle-o" size={35} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Picture and Stats Section */}
        <View style={styles.profileStatsSection}>
          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePictureBorder}>
              <View style={styles.profilePicture}>
                <Image source={{ uri: profilePicture }} style={{ width: 96, height: 96, borderRadius: 48, }} resizeMode="cover" />
              </View>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{username}</Text>
              
            </View>
            <View style={styles.statsWithIcon}>
              <View style={styles.statsRow}>
                <View style={styles.statColumn}>
                  <Text style={styles.statNumber}>{postsCount}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <TouchableOpacity 
                  style={styles.statColumn}
                  onPress={() => {
                    setModalType('followers');
                    setFollowersFollowingModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{followersCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statColumn}
                  onPress={() => {
                    setModalType('following');
                    setFollowersFollowingModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioSection}>
          <View style={styles.bioHeader}>
            <Text style={styles.bioLabel}>Bio</Text>
            <Text style={styles.leafEmoji}>🍃</Text>
          </View>
          <Text style={styles.bioText}>
            {bio}
          </Text>
        </View>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            onPress={handleFollowToggle}
            disabled={isTogglingFollow}
            style={[
              styles.followButton,
              isFollowing && styles.followingButton
            ]}
          >
            {isTogglingFollow ? (
              <ActivityIndicator size="small" color={isFollowing ? "#8B5CF6" : "#ffffff"} />
            ) : (
              <View style={styles.followButtonContent}>
               <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Merge Button */}
          {hasMutualConnection ? (
            <TouchableOpacity 
              onPress={handleUnmerge}
              disabled={isUnmerging}
              style={[styles.mergeButton, styles.mergeButtonMerged]}
            >
              {isUnmerging ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Text style={[styles.mergeButtonText, styles.mergeButtonMergedText]}>
                  Merged
                </Text>
              )}
            </TouchableOpacity>
          ) : hasPendingMergeRequest ? (
            <View style={[styles.mergeButton, styles.mergeButtonPending]}>
              <Text style={[styles.mergeButtonText, styles.mergeButtonPendingText]}>
                {isMergeRequester ? "Merge Sent" : "Merge Request"}
              </Text>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={handleMergeRequest}
              disabled={isSendingMerge}
              style={styles.mergeButton}
            >
              {isSendingMerge ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.mergeButtonText}>Merge</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {/* Image Grid Section */}
        <View style={styles.imageGridContainer}>
          <View style={styles.gridWrapper}>
            {userPosts.length > 0 ? (
              userPosts.map((post: Post) => (
                <TouchableOpacity 
                  key={post._id} 
                  style={styles.gridImage}
                  onPress={() => handlePostPress(post)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: post.image ? API_URL + "/" + post.image.replace(/^\//, '') : 'https://picsum.photos/150/150?random=10' }}
                    style={styles.gridImageContent}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noPostsContainer}>
                <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noPostsText}>No posts yet</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Post Modal */}
      <Modal
        visible={postModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleClosePostModal}
      >
        <SafeAreaView style={styles.postModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          
          {/* Header */}
          <View style={styles.postModalHeader}>
            <TouchableOpacity onPress={handleClosePostModal} style={styles.postModalBackButton}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.postModalTitle}>Post</Text>
            <View style={styles.postModalHeaderRight} />
          </View>

          {selectedPost && (
            <ScrollView 
              style={styles.postModalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Post Image */}
              <View style={styles.postModalImageContainer}>
                <Image 
                  source={{ uri: API_URL + "/" + selectedPost.image }} 
                  style={styles.postModalImage}
                  resizeMode="cover" 
                />
              </View>

              {/* Post Content */}
              <View style={styles.postModalPostContent}>
                {/* Post Actions */}
                <View style={styles.postModalActions}>
                  <TouchableOpacity 
                    style={styles.postModalActionButton}
                    onPress={() => handleLikePost(selectedPost._id)}
                  >
                    <Entypo 
                      name={selectedPost.isLiked ? "heart" : "heart-outlined"} 
                      size={24} 
                      color={selectedPost.isLiked ? "#EF4444" : "#374151"} 
                    /> 
                    <Text style={styles.postModalActionText}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.postModalActionButton}
                  >
                    <Entypo name="chat" size={24} color="#374151" />
                    <Text style={styles.postModalActionText}>Comment</Text>
                  </TouchableOpacity>
                </View>

                {/* Likes Count */}
                <View style={styles.postModalEngagement}>
                  <Text style={styles.postModalHeartIcon}>❤️</Text>
                  <Text style={styles.postModalLikesText}>
                    {selectedPost.likeCount || selectedPost.likes || 0} {(selectedPost.likeCount || selectedPost.likes || 0) === 1 ? 'like' : 'likes'}
                  </Text>
                </View>

                {/* Caption */}
                <View style={styles.postModalCaptionContainer}>
                  <Text style={styles.postModalCaption}>
                    <Text style={styles.postModalUsername}>{username}</Text> {selectedPost.caption || 'No caption'}
                  </Text>
                </View>

                {/* Comments Section */}
                {selectedPost.comments && selectedPost.comments.length > 0 && (
                  <View style={styles.postModalCommentsSection}>
                    <Text style={styles.postModalCommentsTitle}>
                      {selectedPost.comments.length} {selectedPost.comments.length === 1 ? 'comment' : 'comments'}
                    </Text>
                    {selectedPost.comments.map((comment: any) => (
                      <View key={comment._id} style={styles.postModalCommentItem}>
                        <Text style={styles.postModalCommentUsername}>{comment.user?.username || comment.username}</Text>
                        <Text style={styles.postModalCommentText}>{comment.text || comment.comment}</Text>
                        <Text style={styles.postModalCommentTime}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Post Date */}
                <Text style={styles.postModalDate}>
                  {new Date(selectedPost.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Add Comment Input */}
              <View style={styles.postModalAddCommentContainer}>
                <Image 
                  source={{ uri: reduxUser?.profilePicture ? API_URL + "/" + reduxUser.profilePicture : 'https://picsum.photos/150/150?random=10' }} 
                  style={styles.postModalCommentAvatar}
                  resizeMode="cover" 
                />
                <TextInput
                  style={styles.postModalCommentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#9CA3AF"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  onPress={handleSubmitComment}
                  disabled={!newComment?.trim() || isCommenting}
                  style={styles.postModalCommentSubmit}
                >
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={[styles.postModalCommentSubmitText, !newComment?.trim() && styles.postModalCommentSubmitTextDisabled]}>
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Followers/Following Modal */}
      <Modal
        visible={followersFollowingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFollowersFollowingModalVisible(false)}
      >
        <View style={styles.followersFollowingModalContainer}>
          <View style={styles.followersFollowingModalContent}>
            {/* Header */}
            <View style={styles.followersFollowingModalHeader}>
              <Text style={styles.followersFollowingModalTitle}>
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <TouchableOpacity
                onPress={() => setFollowersFollowingModalVisible(false)}
                style={styles.followersFollowingModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.followersFollowingTabs}>
              <TouchableOpacity
                style={[
                  styles.followersFollowingTab,
                  modalType === 'followers' && styles.followersFollowingTabActive
                ]}
                onPress={() => setModalType('followers')}
              >
                <Text style={[
                  styles.followersFollowingTabText,
                  modalType === 'followers' && styles.followersFollowingTabTextActive
                ]}>
                  Followers ({followersCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.followersFollowingTab,
                  modalType === 'following' && styles.followersFollowingTabActive
                ]}
                onPress={() => setModalType('following')}
              >
                <Text style={[
                  styles.followersFollowingTabText,
                  modalType === 'following' && styles.followersFollowingTabTextActive
                ]}>
                  Following ({followingCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* List Container */}
            <View style={{ height: 400, backgroundColor: '#FFFFFF' }}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={styles.followersFollowingListContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {modalType === 'followers' ? (
                  isLoadingFollowers || isFetchingFollowers ? (
                    <View style={styles.followersFollowingLoading}>
                      <ActivityIndicator size="large" color="#8B5CF6" />
                      <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading followers...</Text>
                    </View>
                  ) : followersError ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                      <Text style={styles.followersFollowingEmptyText}>Error loading followers</Text>
                      <TouchableOpacity 
                        onPress={() => refetchFollowers()} 
                        style={{ marginTop: 12, padding: 8, backgroundColor: '#8B5CF6', borderRadius: 8 }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : followers.length === 0 ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                      <Text style={styles.followersFollowingEmptyText}>No followers yet</Text>
                    </View>
                  ) : (
                    followers.map((follower: any) => {
                      if (!follower || !follower._id) return null;
                      return (
                        <TouchableOpacity
                          key={follower._id}
                          style={styles.followersFollowingItem}
                          onPress={() => {
                            setFollowersFollowingModalVisible(false);
                            navigation.navigate('UserInfo', { userId: follower._id });
                          }}
                          activeOpacity={0.7}
                        >
                          {follower.profilePicture ? (
                            <Image
                              source={{
                                uri: follower.profilePicture.startsWith('http') 
                                  ? follower.profilePicture 
                                  : API_URL + "/" + follower.profilePicture.replace(/^\//, '')
                              }}
                              style={styles.followersFollowingAvatar}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.followersFollowingAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                              <Text style={{ color: '#9CA3AF', fontSize: 20, fontWeight: '600' }}>
                                {follower.username?.charAt(0)?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.followersFollowingUserInfo}>
                            <View style={styles.followersFollowingUsernameRow}>
                              <Text style={styles.followersFollowingUsername}>{follower.username || 'Unknown'}</Text>
                              {follower.isVerified && (
                                <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" style={{ marginLeft: 4 }} />
                              )}
                            </View>
                            {follower.bio && (
                              <Text style={styles.followersFollowingBio} numberOfLines={1}>
                                {follower.bio}
                              </Text>
                            )}
                          </View>
                          {follower.isFollowing && (
                            <View style={styles.followersFollowingBadge}>
                              <Text style={styles.followersFollowingBadgeText}>Following</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )
                ) : (
                  isLoadingFollowing || isFetchingFollowing ? (
                    <View style={styles.followersFollowingLoading}>
                      <ActivityIndicator size="large" color="#8B5CF6" />
                      <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading following...</Text>
                    </View>
                  ) : followingError ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                      <Text style={styles.followersFollowingEmptyText}>Error loading following</Text>
                      <TouchableOpacity 
                        onPress={() => refetchFollowing()} 
                        style={{ marginTop: 12, padding: 8, backgroundColor: '#8B5CF6', borderRadius: 8 }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : following.length === 0 ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                      <Text style={styles.followersFollowingEmptyText}>Not following anyone yet</Text>
                    </View>
                  ) : (
                    following.map((followedUser: any) => {
                      if (!followedUser || !followedUser._id) return null;
                      return (
                        <TouchableOpacity
                          key={followedUser._id}
                          style={styles.followersFollowingItem}
                          onPress={() => {
                            setFollowersFollowingModalVisible(false);
                            navigation.navigate('UserInfo', { userId: followedUser._id });
                          }}
                          activeOpacity={0.7}
                        >
                          {followedUser.profilePicture ? (
                            <Image
                              source={{
                                uri: followedUser.profilePicture.startsWith('http') 
                                  ? followedUser.profilePicture 
                                  : API_URL + "/" + followedUser.profilePicture.replace(/^\//, '')
                              }}
                              style={styles.followersFollowingAvatar}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.followersFollowingAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                              <Text style={{ color: '#9CA3AF', fontSize: 20, fontWeight: '600' }}>
                                {followedUser.username?.charAt(0)?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.followersFollowingUserInfo}>
                            <View style={styles.followersFollowingUsernameRow}>
                              <Text style={styles.followersFollowingUsername} numberOfLines={1}>
                                {followedUser.username || 'Unknown User'}
                              </Text>
                              {followedUser.isVerified && (
                                <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" style={{ marginLeft: 4 }} />
                              )}
                            </View>
                            {followedUser.bio && followedUser.bio.trim() && (
                              <Text style={styles.followersFollowingBio} numberOfLines={1}>
                                {followedUser.bio}
                              </Text>
                            )}
                          </View>
                          {followedUser.isFollowing && (
                            <View style={styles.followersFollowingBadge}>
                              <Text style={styles.followersFollowingBadgeText}>Following</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // borderWidth: 1,
    // borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileStatsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  profilePictureContainer: {
    marginRight: 25,
  },
  profilePictureBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#10B981',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicture: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmoji: {
    fontSize: 40,
  },
  statsContainer: {
    flex: 1,
    paddingTop: 10,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 8,
  },
  statsWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  statColumn: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  bioSection: {
    paddingVertical: 15,
    paddingTop: 0,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 3,
  },
  leafEmoji: {
    fontSize: 12,
  },
  bioText: {
    paddingLeft: 20,
    fontSize: 14,
    color: '#222',
    lineHeight: 18,
    fontWeight: 'bold',
  },
  imageGridContainer: {
    paddingVertical: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridImage: {
    width: (width - 60) / 3,
    height: (width - 60) / 3 * 1.3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 10,
  },
  gridReel: {
    width: (width - 60) / 3,
    height: (width - 60) / 3 * 1.3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    position: 'relative',
  },
  gridImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  reelsIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 20,
    gap: 10,
  },
  followButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    elevation: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: 48,
  },
  mergeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: 48,
  },
  mergeButtonPending: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  mergeButtonMerged: {
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  mergeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mergeButtonPendingText: {
    color: '#10B981',
  },
  mergeButtonMergedText: {
    color: '#6B7280',
  },
  followingButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  followButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonIcon: {
    marginRight: 8,
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  followingButtonText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noPostsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPostsText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: 'bold',
  },
  // Post Modal Styles
  postModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  postModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  postModalBackButton: {
    padding: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  postModalHeaderRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postModalContent: {
    flex: 1,
  },
  postModalImageContainer: {
    width: '100%',
    height: 400,
  },
  postModalImage: {
    width: '100%',
    height: '100%',
  },
  postModalPostContent: {
    padding: 15,
  },
  postModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 20,
  },
  postModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  postModalActionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  postModalEngagement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  postModalHeartIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  postModalLikesText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
  postModalCaptionContainer: {
    marginBottom: 15,
  },
  postModalCaption: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    fontWeight: 'bold',
  },
  postModalUsername: {
    fontWeight: 'bold',
    color: '#000000',
  },
  postModalCommentsSection: {
    marginTop: 15,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postModalCommentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  postModalCommentItem: {
    marginBottom: 15,
  },
  postModalCommentUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  postModalCommentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  postModalCommentTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  postModalDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
    fontWeight: 'bold',
  },
  postModalAddCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  postModalCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postModalCommentInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 14,
    color: '#000000',
    maxHeight: 100,
  },
  postModalCommentSubmit: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postModalCommentSubmitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  postModalCommentSubmitTextDisabled: {
    color: '#9CA3AF',
  },
  // Followers/Following Modal Styles
  followersFollowingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followersFollowingModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  followersFollowingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  followersFollowingModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  followersFollowingModalCloseButton: {
    padding: 5,
  },
  followersFollowingTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  followersFollowingTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  followersFollowingTabActive: {
    borderBottomColor: '#8B5CF6',
  },
  followersFollowingTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  followersFollowingTabTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  followersFollowingListContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  followersFollowingLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  followersFollowingEmpty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  followersFollowingEmptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  followersFollowingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 60,
    width: '100%',
  },
  followersFollowingAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
  },
  followersFollowingUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followersFollowingUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followersFollowingUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  },
  followersFollowingBio: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  followersFollowingBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followersFollowingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});

