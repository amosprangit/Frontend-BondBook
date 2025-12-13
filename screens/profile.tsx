import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, FontAwesome, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useGetProfileQuery, useUpdateProfilePictureMutation, useUpdateProfileMutation, useGetFollowersQuery, useGetFollowingQuery } from '../store/api/authApi';
import { useGetPostsQuery, useCreatePostMutation, useGetMyPostsQuery, useLikePostMutation, useCommentPostMutation, useDeletePostMutation, postsApi } from '../store/api/postsApi';
import { useGetMutualConnectionsQuery } from '../store/api/mutualConnectionsApi';
import { Reminder, useLazyCheckDueRemindersQuery } from '../store/api/remindersApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { API_URL, BASE_URL } from '@env';

const { width, height } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 60) / 3;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH * 1.3;

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const { user: reduxUser, token } = useAppSelector((state) => state.auth);
  const { data: profileData, isLoading, error, refetch } = useGetProfileQuery();
  // const { data: postsData, refetch: refetchPosts } = useGetPostsQuery();
  const { data: postsData, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useGetMyPostsQuery();
  const [updateProfilePicture, { isLoading: isUpdating }] = useUpdateProfilePictureMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();
  const [likePost] = useLikePostMutation();
  const [commentPost, { isLoading: isCommenting }] = useCommentPostMutation();
  const [deletePost, { isLoading: isDeletingPost }] = useDeletePostMutation();
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Track previous user to detect login changes
  const previousUserIdRef = useRef<string | null>(null);
  
  // Edit profile modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  
  // Post modal state
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  
  // Mutual connections modal state
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const { data: mutualConnectionsData } = useGetMutualConnectionsQuery();
  const mutualConnections = mutualConnectionsData?.mutualConnections || [];

  // Followers/Following modal state
  const [followersFollowingModalVisible, setFollowersFollowingModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  // Reminders due state
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [triggerCheckDueReminders, { isFetching: isCheckingDueReminders }] = useLazyCheckDueRemindersQuery();
  
  const fetchDueReminders = useCallback(async () => {
    try {
      const response = await triggerCheckDueReminders().unwrap();
      const remindersList = response?.reminders || [];
      setDueReminders(remindersList);
      if (remindersList.length > 0) {
        Toast.show({
          type: 'info',
          text1: 'Reminder due',
          text2: remindersList.length === 1
            ? `${remindersList[0].title} is due now`
            : `${remindersList.length} reminders are due now`,
        });
      }
    } catch (error) {
      console.error('Check due reminders error:', error);
    }
  }, [triggerCheckDueReminders]);

  // Monitor user changes and refetch data when user logs in or switches
  useEffect(() => {
    const currentUserId = reduxUser?._id || reduxUser?.id;
    
    // If user changed (different user logged in)
    if (currentUserId && previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      console.log('User changed in profile, refreshing data...');
      // Refetch profile and posts for new user
      refetch();
      refetchPosts();
    }
    
    // Update previous user ID
    previousUserIdRef.current = currentUserId || null;
  }, [reduxUser, refetch, refetchPosts]);

  useEffect(() => {
    fetchDueReminders();
    
    // Check for due reminders every 30 seconds
    const interval = setInterval(() => {
      fetchDueReminders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchDueReminders]);

  const handleUpdateProfilePicture = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Camera roll permission is required',
        });
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);

        // Upload profile picture
        const response = await updateProfilePicture(formData).unwrap();
        
        if (response.success) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Profile picture updated successfully!',
          });
          refetch();
        }
      }
    } catch (error: any) {
      console.error('Update profile picture error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error?.data?.message || 'Failed to update profile picture',
      });
    }
  };

  const posts = postsData?.posts || [];

  const formatReminderDateTime = (reminder: Reminder) => {
    const date = new Date(reminder.reminderDate);
    const formattedDate = date.toLocaleDateString();
    const time = reminder.reminderTime || '';
    return `${formattedDate} • ${time}`;
  };

  // Debug logging
  useEffect(() => {
    if (postsData) {
      console.log('Posts data received:', postsData);
      console.log('Posts count:', posts?.length);
    }
    if (postsError) {
      console.error('Posts error:', postsError);
    }
  }, [postsData, postsError, posts]);

  const handleCreatePost = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Please allow access to your photos',
        });
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        
        // TODO: Add caption input dialog
        const caption = 'New post'; // For now, default caption
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'post.jpg',
        } as any);
        formData.append('caption', caption);

        // Create post
        const response = await createPost(formData).unwrap();
        
        if (response.success) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Post created successfully!',
          });
          refetchPosts();
        }
      }
    } catch (error: any) {
      console.error('Create post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error?.data?.message || 'Failed to create post',
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      await refetchPosts();
      await fetchDueReminders();
    } catch (err) {
      console.error('Refresh error:', err);
    }
    setRefreshing(false);
  }, [refetch, refetchPosts, fetchDueReminders]);


  const handleEditProfile = () => {
    setEditUsername(username);
    setEditBio(bio);
    setEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!editUsername.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Username cannot be empty',
      });
      return;
    }

    try {
      const result = await updateProfile({
        username: editUsername.trim(),
        bio: editBio.trim(),
      }).unwrap();

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'Profile updated successfully',
        });
        setEditModalVisible(false);
        refetch();
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to update profile',
      });
    }
  };

  const handlePostPress = (post: any) => {
    setSelectedPost(post);
    setPostModalVisible(true);
  };

  const handleClosePostModal = () => {
    setPostModalVisible(false);
    setSelectedPost(null);
    setNewComment('');
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    try {
      // Send 1 to like, 0 to unlike
      const action = isLiked ? 0 : 1;
      
      // Optimistically update the cache for immediate UI feedback
      // Update getMyPosts cache
      const patchResult1 = dispatch(
        postsApi.util.updateQueryData('getMyPosts', undefined, (draft) => {
          const post = draft.posts?.find((p) => p._id === postId);
          if (post) {
            const newIsLiked = action === 1;
            // Get current like count - handle all possible formats
            let currentLikeCount = 0;
            if (typeof post.likes === 'number') {
              currentLikeCount = post.likes;
            } else if (Array.isArray(post.likes)) {
              currentLikeCount = post.likes.length;
            } else if (typeof post.likeCount === 'number') {
              currentLikeCount = post.likeCount;
            }
            
            // Update the post state
            post.isLiked = newIsLiked;
            if (newIsLiked) {
              // Like: increment count
              post.likes = currentLikeCount + 1;
              post.likeCount = currentLikeCount + 1;
            } else {
              // Unlike: decrement count (but never go below 0)
              const newCount = Math.max(0, currentLikeCount - 1);
              post.likes = newCount;
              post.likeCount = newCount;
            }
          }
        })
      );
      
      // Also update getPosts cache for consistency
      const patchResult2 = dispatch(
        postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
          const post = draft.posts?.find((p) => p._id === postId);
          if (post) {
            const newIsLiked = action === 1;
            // Get current like count - handle all possible formats
            let currentLikeCount = 0;
            if (typeof post.likes === 'number') {
              currentLikeCount = post.likes;
            } else if (Array.isArray(post.likes)) {
              currentLikeCount = post.likes.length;
            } else if (typeof post.likeCount === 'number') {
              currentLikeCount = post.likeCount;
            }
            
            // Update the post state
            post.isLiked = newIsLiked;
            if (newIsLiked) {
              // Like: increment count
              post.likes = currentLikeCount + 1;
              post.likeCount = currentLikeCount + 1;
            } else {
              // Unlike: decrement count (but never go below 0)
              const newCount = Math.max(0, currentLikeCount - 1);
              post.likes = newCount;
              post.likeCount = newCount;
            }
          }
        })
      );
      
      try {
        const result = await likePost({ postId, action }).unwrap();
        console.log('Like result:', result);
        
        // Update cache with server response data (more reliable than refetch)
        // Update getMyPosts cache
        dispatch(
          postsApi.util.updateQueryData('getMyPosts', undefined, (draft) => {
            const post = draft.posts?.find((p) => p._id === postId);
            if (post && result && result.success) {
              // Always update isLiked if provided
              if (result.isLiked !== undefined) {
                post.isLiked = result.isLiked;
              }
              
              // Get server like count - handle both likeCount and likes fields
              let serverLikeCount = null;
              if (result.likeCount !== undefined && result.likeCount !== null) {
                serverLikeCount = result.likeCount;
              } else if (typeof result.likes === 'number') {
                serverLikeCount = result.likes;
              }
              
              // Always update with server values (even if 0)
              if (serverLikeCount !== null) {
                post.likes = serverLikeCount;
                post.likeCount = serverLikeCount;
              }
            }
          })
        );
        
        // Also update getPosts cache to ensure consistency across all screens
        dispatch(
          postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
            const post = draft.posts?.find((p) => p._id === postId);
            if (post && result && result.success) {
              // Always update isLiked if provided
              if (result.isLiked !== undefined) {
                post.isLiked = result.isLiked;
              }
              
              // Get server like count
              let serverLikeCount = null;
              if (result.likeCount !== undefined && result.likeCount !== null) {
                serverLikeCount = result.likeCount;
              } else if (typeof result.likes === 'number') {
                serverLikeCount = result.likes;
              }
              
              // Always update with server values (even if 0)
              if (serverLikeCount !== null) {
                post.likes = serverLikeCount;
                post.likeCount = serverLikeCount;
              }
            }
          })
        );
        
        // Update selected post if modal is open
        if (selectedPost && selectedPost._id === postId && result && result.success) {
          setSelectedPost((prev: any) => {
            if (prev && prev._id === postId) {
              const serverLikeCount = result.likeCount ?? (typeof result.likes === 'number' ? result.likes : undefined);
              return {
                ...prev,
                isLiked: result.isLiked !== undefined ? result.isLiked : prev.isLiked,
                likes: serverLikeCount !== undefined ? serverLikeCount : prev.likes,
                likeCount: serverLikeCount !== undefined ? serverLikeCount : prev.likeCount,
              };
            }
            return prev;
          });
        }
      } catch (error: any) {
        // Revert optimistic updates on error
        patchResult1.undo();
        patchResult2.undo();
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
        text2: 'Comment added successfully!',
      });
      setNewComment('');
      refetchPosts();
      // Refresh the selected post data
      const updatedPosts = await refetchPosts();
      const updatedPost = updatedPosts.data?.posts.find((p: any) => p._id === selectedPost._id);
      if (updatedPost) {
        setSelectedPost(updatedPost);
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

  const handleDeletePost = () => {
    if (!selectedPost) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(selectedPost._id).unwrap();
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Post deleted successfully!',
              });
              handleClosePostModal();
              refetchPosts();
            } catch (error: any) {
              console.error('Delete post error:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error?.data?.message || 'Failed to delete post',
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSharePost = async () => {
    if (!selectedPost) return;
    try {
      const imageUrl = (selectedPost as any).imageUrl || ((selectedPost as any).image ? `${API_URL}/${(selectedPost as any).image}` : undefined);
      const postLink = `${BASE_URL}/post/${selectedPost._id}`;
      const shareMessage = `Check out this post by ${username}!\n\n${selectedPost.caption || 'No caption'}\n\nView post: ${postLink}`;
      const result = await Share.share({
        message: shareMessage,
        url: imageUrl,
        title: `Post by ${username}`,
      });
      if (result.action === Share.sharedAction) {
        Toast.show({
          type: 'success',
          text1: 'Shared!',
          text2: 'Post shared successfully',
        });
      }
    } catch (error: any) {
      console.error('Share error:', error);
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: error.message || 'Failed to share post',
      });
    }
  };

let user;
  if (profileData?.user) {
    user = profileData.user;
  } else if (profileData?._id || profileData?.username) {
    user = profileData;
  } else {
    user = reduxUser;
  }

  const username = user?.username || 'User';
  const bio = user?.bio || 'No bio yet';
  const profilePicture = user?.profilePicture ? API_URL + "/" + user.profilePicture : 'https://picsum.photos/150/150?random=10';
  const followersCount = user?.followers?.length || 0;
  const followingCount = user?.following?.length || 0;
  const postsCount = posts.length || 0;

  // Get userId for followers/following API calls
  const userId = user?._id || user?.id;
  
  // Fetch both lists when modal is visible for instant tab switching
  // Use empty string as fallback to prevent query errors, but skip if no userId
  const { 
    data: followersData, 
    isLoading: isLoadingFollowers, 
    error: followersError,
    refetch: refetchFollowers,
    isFetching: isFetchingFollowers
  } = useGetFollowersQuery(userId || '', {
    skip: !userId || !followersFollowingModalVisible
  });
  
  const { 
    data: followingData, 
    isLoading: isLoadingFollowing, 
    error: followingError,
    refetch: refetchFollowing,
    isFetching: isFetchingFollowing
  } = useGetFollowingQuery(userId || '', {
    skip: !userId || !followersFollowingModalVisible
  });

  // Extract followers and following arrays from API response
  // Handle both direct array and nested response structure
  const followers = Array.isArray(followersData?.followers) 
    ? followersData.followers 
    : (Array.isArray(followersData) ? followersData : []);
  const following = Array.isArray(followingData?.following) 
    ? followingData.following 
    : (Array.isArray(followingData) ? followingData : []);
  
  // Also create direct references for rendering
  const followingList = followingData?.following || [];
  const followersList = followersData?.followers || [];
  
  // Debug: Log the extracted arrays
  useEffect(() => {
    if (followersFollowingModalVisible) {
      console.log('📊 Extracted Data:');
      console.log('Raw followersData:', JSON.stringify(followersData, null, 2));
      console.log('Raw followingData:', JSON.stringify(followingData, null, 2));
      console.log('Followers array:', followers);
      console.log('Followers length:', followers.length);
      console.log('Following array:', following);
      console.log('Following length:', following.length);
      console.log('First follower:', followers[0]);
      console.log('First following:', following[0]);
    }
  }, [followersFollowingModalVisible, followers, following, followersData, followingData]);

  // Debug logging
  useEffect(() => {
    if (followersFollowingModalVisible) {
      console.log('=== Followers/Following Modal Debug ===');
      console.log('Modal Type:', modalType);
      console.log('User ID:', userId);
      console.log('Should Fetch:', !!(userId && followersFollowingModalVisible));
      console.log('Followers Count:', followers.length);
      console.log('Following Count:', following.length);
      console.log('Is Loading Followers:', isLoadingFollowers);
      console.log('Is Loading Following:', isLoadingFollowing);
      console.log('Is Fetching Followers:', isFetchingFollowers);
      console.log('Is Fetching Following:', isFetchingFollowing);
      console.log('Followers Error:', followersError);
      console.log('Following Error:', followingError);
      console.log('Followers Data:', followersData);
      console.log('Following Data:', followingData);
      console.log('========================================');
    }
  }, [followersFollowingModalVisible, modalType, followers, following, followersData, followingData, isLoadingFollowers, isLoadingFollowing, isFetchingFollowers, isFetchingFollowing, followersError, followingError, userId]);

  // Force refetch when modal opens - this ensures data is fresh
  useEffect(() => {
    if (followersFollowingModalVisible && userId) {
      console.log('🔄 Modal opened - triggering refetch for userId:', userId);
      // Use requestId to force a fresh request
      const timer = setTimeout(() => {
        console.log('🔄 Executing refetch...');
        refetchFollowers().then((result) => {
          console.log('✅ Followers refetch result:', result);
        }).catch((err) => {
          console.error('❌ Followers refetch error:', err);
        });
        refetchFollowing().then((result) => {
          console.log('✅ Following refetch result:', result);
        }).catch((err) => {
          console.error('❌ Following refetch error:', err);
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [followersFollowingModalVisible, userId, refetchFollowers, refetchFollowing]);

  // Filter posts by current user
  // const userPosts = postsData?.posts?.filter(post => post.user._id === user?._id) || [];
  // const postsCount = userPosts.length;
// Show loading state
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

  // Show error if API fails
  if (error) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to load profile data',
    });
  }

  // Show error if posts API fails
  if (postsError) {
    console.error('Posts loading error:', postsError);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to load posts',
    });
  }

return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
            <Feather name="menu" size={30} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
      >

        {/* Profile Picture and Stats Section */}
        <View style={styles.profileStatsSection}>
          <View style={styles.profilePictureContainer}>
            <TouchableOpacity 
              onPress={handleUpdateProfilePicture}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              <View style={styles.profilePictureBorder}>
                <View style={styles.profilePicture}>
                  <Image source={{ uri: profilePicture }} style={{ width: 96, height: 96, borderRadius: 48, }} resizeMode="cover" />
                  {isUpdating && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                </View>
                <View style={styles.editIconContainer}>
                  <Ionicons name="camera" size={16} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{username}</Text>
              <TouchableOpacity onPress={handleEditProfile}>
                <Ionicons name="create-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>
                {bio}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>{postsCount === 1 ? 'post' : 'posts'}</Text>
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
                <Text style={styles.statLabel}>followers</Text>
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
                <Text style={styles.statLabel}>following</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {dueReminders.length > 0 && (
          <View style={styles.dueRemindersCard}>
            <View style={styles.dueRemindersHeader}>
              <Ionicons name="alarm-outline" size={18} color="#8B5CF6" />
              <Text style={styles.dueRemindersTitle}>
                {dueReminders.length === 1 ? 'Reminder due' : 'Reminders due'}
              </Text>
            </View>
            {dueReminders.map((reminder, index) => (
              <View
                key={reminder._id}
                style={[
                  styles.dueReminderItem,
                  index === 0 && styles.dueReminderItemFirst
                ]}
              >
                <View style={styles.dueReminderInfo}>
                  <Text style={styles.dueReminderItemTitle}>{reminder.title}</Text>
                  {reminder.description ? (
                    <Text style={styles.dueReminderItemDescription} numberOfLines={1}>
                      {reminder.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.dueReminderItemTime}>
                  {formatReminderDateTime(reminder)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Image Grid Section */}
        <View style={styles.imageGridContainer}>
          {postsLoading ? (
            <View style={styles.postsLoadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.postsLoadingText}>Loading posts...</Text>
            </View>
          ) : (
            <View style={styles.gridWrapper}>
              {/* Create Post Button - Always first */}
              <TouchableOpacity 
                style={styles.gridImage}
                onPress={handleCreatePost}
                disabled={isCreatingPost}
                activeOpacity={0.7}
              >
                <View style={styles.createPostContainer}>
                  {isCreatingPost ? (
                    <ActivityIndicator size="large" color="#8B5CF6" />
                  ) : (
                    <Ionicons name="add" size={40} color="#8B5CF6" />
                  )}
                </View>
              </TouchableOpacity>

              {/* User Posts */}
              {posts.length === 0 ? (
                <View style={styles.noPostsContainer}>
                  <Text style={styles.noPostsText}>No posts yet</Text>
                </View>
              ) : (
                posts.map((post) => (
              <TouchableOpacity 
                key={post._id} 
                style={styles.gridImage}
                onPress={() => handlePostPress(post)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: API_URL + "/" + ((post as any).image || post.imageUrl) }}
                  style={styles.gridImageContent}
                  resizeMode="cover"
                />
              </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Enter username"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Enter bio"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mutual Connections Modal */}
      <Modal
        visible={connectionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConnectionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: height * 0.7 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Connections</Text>
              <TouchableOpacity onPress={() => setConnectionsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.connectionsListContainer} showsVerticalScrollIndicator={false}>
              {mutualConnections.length === 0 ? (
                <View style={styles.emptyConnectionsContainer}>
                  <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyConnectionsText}>No connections yet</Text>
                  <Text style={styles.emptyConnectionsSubtext}>
                    Accept follow requests to create connections
                  </Text>
                </View>
              ) : (
                mutualConnections.map((connection) => (
                  <TouchableOpacity
                    key={connection._id}
                    style={styles.connectionItem}
                    onPress={() => {
                      setConnectionsModalVisible(false);
                      navigation.navigate('MutualConnectionProfile', {
                        mutualConnectionId: connection._id,
                        displayName: connection.displayName,
                        connectionId: connection.connectionId,
                      });
                    }}
                  >
                    <View style={styles.connectionAvatarContainer}>
                      <Image
                        source={{
                          uri: connection.profilePicture
                            ? API_URL + "/" + connection.profilePicture
                            : (connection.otherUser?.profilePicture
                              ? API_URL + "/" + connection.otherUser.profilePicture
                              : 'https://picsum.photos/150/150?random=1'),
                        }}
                        style={styles.connectionAvatar}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.connectionInfo}>
                      <Text style={styles.connectionName}>{connection.displayName}</Text>
                      <Text style={styles.connectionStats}>
                        {connection.postsCount} posts • {connection.followersCount} followers
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
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

            {/* List Container - Fixed height */}
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
                    <Text style={{ marginTop: 8, color: '#9CA3AF', fontSize: 12 }}>
                      {(followersError as any)?.data?.message || 'Please try again'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => refetchFollowers()} 
                      style={{ marginTop: 12, padding: 8, backgroundColor: '#8B5CF6', borderRadius: 8 }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : ((!followers || followers.length === 0) && (!followersList || followersList.length === 0)) ? (
                  <View style={styles.followersFollowingEmpty}>
                    <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.followersFollowingEmptyText}>No followers yet</Text>
                    {__DEV__ && (
                      <Text style={{ marginTop: 8, color: '#9CA3AF', fontSize: 12 }}>
                        Debug: followersData = {followersData ? JSON.stringify(followersData).substring(0, 100) : 'null'}, followers.length = {followers?.length || 0}
                      </Text>
                    )}
                  </View>
                ) : (
                  (followers.length > 0 ? followers : followersList).map((follower: any) => {
                    if (!follower || !follower._id) {
                      console.warn('Invalid follower:', follower);
                      return null;
                    }
                    console.log('Rendering follower:', follower.username);
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
                    <Text style={{ marginTop: 8, color: '#9CA3AF', fontSize: 12 }}>
                      {(followingError as any)?.data?.message || 'Please try again'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => refetchFollowing()} 
                      style={{ marginTop: 12, padding: 8, backgroundColor: '#8B5CF6', borderRadius: 8 }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (followingList.length === 0 && following.length === 0) ? (
                  <View style={styles.followersFollowingEmpty}>
                    <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.followersFollowingEmptyText}>Not following anyone yet</Text>
                  </View>
                ) : (
                  (followingList.length > 0 ? followingList : following).map((followedUser: any, index: number) => {
                    console.log(`[FOLLOWING LIST] Rendering user ${index}:`, {
                      username: followedUser?.username,
                      _id: followedUser?._id,
                      hasProfilePicture: !!followedUser?.profilePicture
                    });
                    if (!followedUser || !followedUser._id) {
                      console.warn('Invalid followedUser at index', index, ':', followedUser);
                      return null;
                    }
                    console.log(`Rendering followedUser ${index}:`, followedUser.username, followedUser._id);
                    return (
                    <TouchableOpacity
                      key={followedUser._id}
                      style={[styles.followersFollowingItem, { backgroundColor: '#FFFFFF' }]}
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

      {/* Full Post Modal */}
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
            <View style={styles.postModalHeaderRight}>
              {selectedPost && (
                <TouchableOpacity 
                  onPress={handleDeletePost} 
                  style={styles.postModalDeleteButton}
                  disabled={isDeletingPost}
                >
                  {isDeletingPost ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {selectedPost && (
            <ScrollView 
              style={styles.postModalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Post Image */}
              <View style={styles.postModalImageContainer}>
                <Image 
                  source={{ uri: API_URL + "/" + ((selectedPost as any).image || selectedPost.imageUrl) }} 
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
                    onPress={() => handleLikePost(selectedPost._id, Boolean(selectedPost.isLiked))}
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
                  <TouchableOpacity 
                    style={styles.postModalActionButton}
                    onPress={handleSharePost}
                  >
                    <Entypo name="share" size={24} color="#374151" />
                    <Text style={styles.postModalActionText}>Share</Text>
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
                  source={{ uri: profilePicture }} 
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
                  disabled={!newComment.trim() || isCommenting}
                  style={styles.postModalPostCommentButton}
                >
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={[
                      styles.postModalPostCommentText,
                      { opacity: newComment.trim() ? 1 : 0.3 }
                    ]}>
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectionsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  connectionsBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectionsListContainer: {
    flex: 1,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 10,
  },
  connectionAvatarContainer: {
    marginRight: 12,
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  connectionStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyConnectionsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyConnectionsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyConnectionsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dueRemindersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dueRemindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dueRemindersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  dueReminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dueReminderItemFirst: {
    borderTopWidth: 0,
  },
  dueReminderInfo: {
    flex: 1,
    marginRight: 12,
  },
  dueReminderItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  dueReminderItemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dueReminderItemTime: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  profileStatsSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profilePictureContainer: {
    marginBottom: 0,
  },
  profilePictureBorder: {
    width: 110,
    height: 110,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#10B981',
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileEmoji: {
    fontSize: 40,
  },
  statsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  heartEmoji: {
    fontSize: 16,
  },
  statsWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  statColumn: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  bioSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  bioText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  deleteAccountSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteAccountText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageGridContainer: {
    paddingVertical: 20,
  },
  postsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  postsLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  noPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  noPostsText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridImage: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_HEIGHT,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 10,
  },
  createPostContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  gridReel: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_HEIGHT,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: width - 48,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9FAFB',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
  postModalDeleteButton: {
    padding: 5,
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
    justifyContent: 'space-around',
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  postModalPostCommentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postModalPostCommentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
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
  followersFollowingList: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
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



 {/* Image Grid Section */}
        // <View style={styles.imageGridContainer}>
        //   <View style={styles.gridRow}>
        //     <View style={styles.gridImage}>
        //       <Image
        //         source={{ uri: 'https://picsum.photos/300/400?random=1' }}
        //         style={styles.gridImageContent}
        //         resizeMode="cover"
        //       />
        //     </View>
        //     <View style={styles.gridReel}>
        //       <Image
        //         source={{ uri: 'https://picsum.photos/300/400?random=2' }}
        //         style={styles.gridImageContent}
        //         resizeMode="cover"
        //       />
        //       <View style={styles.reelsIconContainer}>
        //         <Ionicons name="play" size={16} color="#ffffff" />
        //       </View>
        //     </View>
        //     <View style={styles.gridImage}>
        //       <Image
        //         source={{ uri: 'https://picsum.photos/300/400?random=3' }}
        //         style={styles.gridImageContent}
        //         resizeMode="cover"
        //       />
        //     </View>
        //   </View>
        //   <View style={styles.gridRow}>
        //     <View style={styles.gridReel}>
        //       <Image
        //         source={{ uri: 'https://picsum.photos/300/400?random=4' }}
        //         style={styles.gridImageContent}
        //         resizeMode="cover"
        //       />
        //       <View style={styles.reelsIconContainer}>
        //         <Ionicons name="play" size={16} color="#ffffff" />
        //       </View>
        //     </View>
        //     <View style={styles.gridImage}>
        //       <Image
        //         source={{ uri: 'https://picsum.photos/300/400?random=5' }}
        //         style={styles.gridImageContent}
        //         resizeMode="cover"
        //       />
        //     </View>
        //     <View style={styles.gridReel}>
        //       <Image
        //         source={{ uri: 'https://picsum.photos/300/400?random=6' }}
        //         style={styles.gridImageContent}
        //         resizeMode="cover"
        //       />
        //       <View style={styles.reelsIconContainer}>
        //         <Ionicons name="play" size={16} color="#ffffff" />
        //       </View>
        //     </View>
        //   </View>
        // </View>