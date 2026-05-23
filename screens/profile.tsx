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
  Platform,
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

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

const { width, height } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 60) / 3;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH * 1.3;

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const { user: reduxUser, token } = useAppSelector((state) => state.auth);
  const { data: profileData, isLoading, error, refetch } = useGetProfileQuery();
  const { data: postsData, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useGetMyPostsQuery();
  const [updateProfilePicture, { isLoading: isUpdating }] = useUpdateProfilePictureMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();
  const [likePost] = useLikePostMutation();
  const [commentPost, { isLoading: isCommenting }] = useCommentPostMutation();
  const [deletePost, { isLoading: isDeletingPost }] = useDeletePostMutation();
  const [refreshing, setRefreshing] = React.useState(false);

  const previousUserIdRef = useRef<string | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newComment, setNewComment] = useState('');

  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const { data: mutualConnectionsData } = useGetMutualConnectionsQuery();
  const mutualConnections = mutualConnectionsData?.mutualConnections || [];

  const [followersFollowingModalVisible, setFollowersFollowingModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

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

  useEffect(() => {
    const currentUserId = reduxUser?._id || reduxUser?.id;
    if (currentUserId && previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      refetch();
      refetchPosts();
    }
    previousUserIdRef.current = currentUserId || null;
  }, [reduxUser, refetch, refetchPosts]);

  useEffect(() => {
    fetchDueReminders();
    const interval = setInterval(() => fetchDueReminders(), 30000);
    return () => clearInterval(interval);
  }, [fetchDueReminders]);

  const handleUpdateProfilePicture = async () => {
    // try {
    //   const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    //   if (status !== 'granted') {
    //     Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Camera roll permission is required' });
    //     return;
    //   }

    //   const result = await ImagePicker.launchImageLibraryAsync({
    //     mediaTypes: ['images'],
    //     allowsEditing: true,
    //     aspect: [1, 1],
    //     quality: 0.8,
    //   });

    //   if (!result.canceled && result.assets[0]) {
    //     const imageUri = result.assets[0].uri;
    //     const formData = new FormData();
    //     formData.append('image', {
    //       uri: imageUri,
    //       type: 'image/jpeg',
    //       name: 'profile.jpg',
    //     } as any);

    //     const response = await updateProfilePicture(formData).unwrap();
    //     if (response.success) {
    //       Toast.show({ type: 'success', text1: 'Success', text2: 'Profile picture updated successfully!' });
    //       refetch();
    //     }
    //   }
    // } catch (error: any) {
    //   Toast.show({ type: 'error', text1: 'Upload Failed', text2: error?.data?.message || 'Failed to update profile picture' });
    // }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {

      const asset = result.assets[0];

      const formData = new FormData();

      formData.append("image", {
        uri:
          Platform.OS === "ios"
            ? asset.uri.replace("file://", "")
            : asset.uri,

        type: asset.mimeType || "image/jpeg",

        name:
          asset.fileName ||
          `image-${Date.now()}.jpg`,
      } as any);

      console.log("📤 Sending Image =>", {
        uri: asset.uri,
        type: asset.mimeType,
        name: asset.fileName,
      });

      await updateProfilePicture(formData).unwrap();
    }
  };

  const posts = postsData?.posts || [];

  const formatReminderDateTime = (reminder: Reminder) => {
    const date = new Date(reminder.reminderDate);
    const formattedDate = date.toLocaleDateString();
    const time = reminder.reminderTime || '';
    return `${formattedDate} • ${time}`;
  };

  const handleCreatePost = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Please allow access to your photos' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        const caption = 'New post';

        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'post.jpg',
        } as any);
        formData.append('caption', caption);

        const response = await createPost(formData).unwrap();
        if (response.success) {
          Toast.show({ type: 'success', text1: 'Success', text2: 'Post created successfully!' });
          refetchPosts();
        }
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: error?.data?.message || 'Failed to create post' });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchPosts(),
        fetchDueReminders()
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchPosts, fetchDueReminders]);

  const handleEditProfile = () => {
    setEditUsername(username);
    setEditBio(bio);
    setEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!editUsername.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Username cannot be empty' });
      return;
    }

    try {
      const result = await updateProfile({
        username: editUsername.trim(),
        bio: editBio.trim(),
      }).unwrap();

      if (result.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: result.message || 'Profile updated successfully' });
        setEditModalVisible(false);
        await refetch();
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to update profile' });
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
      const action = isLiked ? 0 : 1;

      // Optimistic update for My Posts
      const patchResult1 = dispatch(
        postsApi.util.updateQueryData('getMyPosts', undefined, (draft) => {
          const post = draft.posts?.find((p: any) => p._id === postId);
          if (post) {
            const newIsLiked = action === 1;
            let currentLikeCount = 0;
            if (typeof post.likes === 'number') {
              currentLikeCount = post.likes;
            } else if (Array.isArray(post.likes)) {
              currentLikeCount = post.likes.length;
            } else if (typeof post.likeCount === 'number') {
              currentLikeCount = post.likeCount;
            }

            post.isLiked = newIsLiked;
            if (newIsLiked) {
              post.likes = currentLikeCount + 1;
              post.likeCount = currentLikeCount + 1;
            } else {
              const newCount = Math.max(0, currentLikeCount - 1);
              post.likes = newCount;
              post.likeCount = newCount;
            }
          }
        })
      );

      // Optimistic update for All Posts
      const patchResult2 = dispatch(
        postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
          const post = draft.posts?.find((p: any) => p._id === postId);
          if (post) {
            const newIsLiked = action === 1;
            let currentLikeCount = 0;
            if (typeof post.likes === 'number') {
              currentLikeCount = post.likes;
            } else if (Array.isArray(post.likes)) {
              currentLikeCount = post.likes.length;
            } else if (typeof post.likeCount === 'number') {
              currentLikeCount = post.likeCount;
            }

            post.isLiked = newIsLiked;
            if (newIsLiked) {
              post.likes = currentLikeCount + 1;
              post.likeCount = currentLikeCount + 1;
            } else {
              const newCount = Math.max(0, currentLikeCount - 1);
              post.likes = newCount;
              post.likeCount = newCount;
            }
          }
        })
      );

      try {
        const result = await likePost({ postId, action }).unwrap();

        // Update with server data
        dispatch(
          postsApi.util.updateQueryData('getMyPosts', undefined, (draft) => {
            const post = draft.posts?.find((p: any) => p._id === postId);
            if (post && result && result.success) {
              if (result.isLiked !== undefined) post.isLiked = result.isLiked;
              let serverLikeCount = null;
              if (result.likeCount !== undefined && result.likeCount !== null) {
                serverLikeCount = result.likeCount;
              } else if (typeof result.likes === 'number') {
                serverLikeCount = result.likes;
              }
              if (serverLikeCount !== null) {
                post.likes = serverLikeCount;
                post.likeCount = serverLikeCount;
              }
            }
          })
        );

        dispatch(
          postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
            const post = draft.posts?.find((p: any) => p._id === postId);
            if (post && result && result.success) {
              if (result.isLiked !== undefined) post.isLiked = result.isLiked;
              let serverLikeCount = null;
              if (result.likeCount !== undefined && result.likeCount !== null) {
                serverLikeCount = result.likeCount;
              } else if (typeof result.likes === 'number') {
                serverLikeCount = result.likes;
              }
              if (serverLikeCount !== null) {
                post.likes = serverLikeCount;
                post.likeCount = serverLikeCount;
              }
            }
          })
        );

        // Update selected post if open
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
        // Rollback optimistic updates
        patchResult1.undo();
        patchResult2.undo();
        throw error;
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to like post' });
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedPost || !newComment?.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a comment' });
      return;
    }

    try {
      const result = await commentPost({ postId: selectedPost._id, text: newComment }).unwrap();
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Comment added successfully!' });
        setNewComment('');
        await refetchPosts();
        // Refresh selected post data
        const updatedPosts = await refetchPosts();
        const updatedPost = updatedPosts.data?.posts?.find((p: any) => p._id === selectedPost._id);
        if (updatedPost) setSelectedPost(updatedPost);
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to add comment' });
    }
  };

  const handleDeletePost = () => {
    if (!selectedPost) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(selectedPost._id).unwrap();
              Toast.show({ type: 'success', text1: 'Success', text2: 'Post deleted successfully!' });
              handleClosePostModal();
              await refetchPosts();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to delete post' });
            }
          },
        },
      ]
    );
  };

  const handleSharePost = async () => {
    if (!selectedPost) return;
    try {
      const imageUrl = selectedPost.imageUrl || selectedPost.image ? `${API_URL}/${selectedPost.image}` : undefined;
      const postLink = `${BASE_URL}/post/${selectedPost._id}`;
      const shareMessage = `Check out this post by ${username}!\n\n${selectedPost.caption || 'No caption'}\n\nView post: ${postLink}`;

      const result = await Share.share({
        message: shareMessage,
        url: imageUrl,
        title: `Post by ${username}`,
      });

      if (result.action === Share.sharedAction) {
        Toast.show({ type: 'success', text1: 'Shared!', text2: 'Post shared successfully' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Share Failed', text2: error.message || 'Failed to share post' });
    }
  };

  // Get user data from various sources
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
  const profilePicture = user?.profilePicture ?
    (user.profilePicture.startsWith('http') ? user.profilePicture : `${API_URL}/${user.profilePicture}`) :
    'https://picsum.photos/150/150?random=10';
  const followersCount = user?.followers?.length || 0;
  const followingCount = user?.following?.length || 0;
  const postsCount = posts.length || 0;

  const userId = user?._id || user?.id;

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

  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  useEffect(() => {
    if (followersFollowingModalVisible && userId) {
      const timer = setTimeout(() => {
        refetchFollowers().catch(err => console.error('Followers refetch error:', err));
        refetchFollowing().catch(err => console.error('Following refetch error:', err));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [followersFollowingModalVisible, userId, refetchFollowers, refetchFollowing]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
          <Feather name="settings" size={24} color="#8B5CF6" />
        </TouchableOpacity>
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
        {/* Enhanced Profile Header Section */}
        <View style={styles.profileHeader}>
          <View style={styles.profilePictureSection}>
            <TouchableOpacity
              onPress={handleUpdateProfilePicture}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              <View style={styles.profilePictureWrapper}>
                <Image source={{ uri: profilePicture }} style={styles.profileImage} />
                {isUpdating && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera" size={18} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.userInfoSection}>
            <View style={styles.usernameContainer}>
              <Text style={styles.username}>{username}</Text>
              <TouchableOpacity onPress={handleEditProfile} style={styles.editIconButton}>
                <Ionicons name="create-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {bio && bio !== 'No bio yet' && (
              <Text style={styles.bioText}>{bio}</Text>
            )}

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>posts</Text>
              </View>
              <TouchableOpacity
                style={styles.statItem}
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
                style={styles.statItem}
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

        {/* Enhanced Due Reminders Card */}
        {dueReminders.length > 0 && (
          <View style={styles.dueRemindersCard}>
            <View style={styles.dueRemindersHeader}>
              <View style={styles.dueRemindersIconContainer}>
                <Ionicons name="alarm" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.dueRemindersTitle}>
                {dueReminders.length === 1 ? 'Reminder Due' : `${dueReminders.length} Reminders Due`}
              </Text>
            </View>
            {dueReminders.map((reminder, index) => (
              <View
                key={reminder._id}
                style={[
                  styles.dueReminderItem,
                  index === dueReminders.length - 1 && styles.lastReminderItem
                ]}
              >
                <View style={styles.dueReminderContent}>
                  <Text style={styles.dueReminderItemTitle}>{reminder.title}</Text>
                  {reminder.description ? (
                    <Text style={styles.dueReminderItemDescription} numberOfLines={1}>
                      {reminder.description}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.dueReminderTimeContainer}>
                  <Ionicons name="time-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.dueReminderItemTime}>
                    {formatReminderDateTime(reminder)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Enhanced Image Grid Section */}
        <View style={styles.imageGridContainer}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridHeaderTitle}>My Posts</Text>
            <TouchableOpacity onPress={handleCreatePost} style={styles.addPostButton}>
              <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
              <Text style={styles.addPostText}>Add</Text>
            </TouchableOpacity>
          </View>

          {postsLoading ? (
            <View style={styles.postsLoadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.postsLoadingText}>Loading posts...</Text>
            </View>
          ) : (
            <View style={styles.gridWrapper}>
              {posts.length === 0 ? (
                <View style={styles.noPostsContainer}>
                  <View style={styles.noPostsIconContainer}>
                    <Ionicons name="images-outline" size={64} color="#E5E7EB" />
                  </View>
                  <Text style={styles.noPostsTitle}>No posts yet</Text>
                  <Text style={styles.noPostsSubtext}>Share your first photo with the community</Text>
                  <TouchableOpacity style={styles.createFirstPostButton} onPress={handleCreatePost}>
                    <Text style={styles.createFirstPostButtonText}>Create First Post</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.createPostCard}
                    onPress={handleCreatePost}
                    disabled={isCreatingPost}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#F3F4F6', '#E5E7EB']}
                      style={styles.createPostGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isCreatingPost ? (
                        <ActivityIndicator size="large" color="#8B5CF6" />
                      ) : (
                        <>
                          <Ionicons name="add" size={48} color="#8B5CF6" />
                          <Text style={styles.createPostText}>New Post</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {posts.map((post: any) => (
                    <TouchableOpacity
                      key={post._id}
                      style={styles.gridImageCard}
                      onPress={() => handlePostPress(post)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: `${API_URL}/${post.image || post.imageUrl}` }}
                        style={styles.gridImage}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.gridImageOverlay}
                      >
                        <View style={styles.likesOverlay}>
                          <Ionicons name="heart" size={14} color="#ffffff" />
                          <Text style={styles.likesOverlayText}>
                            {post.likeCount || post.likes || 0}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enhanced Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
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
                placeholder="Tell something about yourself"
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

      {/* Enhanced Followers/Following Modal */}
      <Modal
        visible={followersFollowingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFollowersFollowingModalVisible(false)}
      >
        <View style={styles.followersFollowingModalContainer}>
          <View style={styles.followersFollowingModalContent}>
            <View style={styles.followersFollowingModalHeader}>
              <Text style={styles.followersFollowingModalTitle}>
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <TouchableOpacity
                onPress={() => setFollowersFollowingModalVisible(false)}
                style={styles.followersFollowingModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

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

            <View style={styles.followersFollowingListContainer}>
              <ScrollView
                style={styles.followersFollowingList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {modalType === 'followers' ? (
                  isLoadingFollowers || isFetchingFollowers ? (
                    <View style={styles.followersFollowingLoading}>
                      <ActivityIndicator size="large" color="#8B5CF6" />
                      <Text style={styles.followersFollowingLoadingText}>Loading followers...</Text>
                    </View>
                  ) : followersError ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                      <Text style={styles.followersFollowingEmptyText}>Error loading followers</Text>
                      <TouchableOpacity onPress={() => refetchFollowers()} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : followers.length === 0 ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                      <Text style={styles.followersFollowingEmptyText}>No followers yet</Text>
                    </View>
                  ) : (
                    followers.map((follower: any) => (
                      <TouchableOpacity
                        key={follower._id}
                        style={styles.followersFollowingItem}
                        onPress={() => {
                          setFollowersFollowingModalVisible(false);
                          navigation.navigate('UserInfo', { userId: follower._id });
                        }}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{
                            uri: follower.profilePicture?.startsWith('http')
                              ? follower.profilePicture
                              : follower.profilePicture ? `${API_URL}/${follower.profilePicture.replace(/^\//, '')}` : 'https://picsum.photos/150/150?random=1'
                          }}
                          style={styles.followersFollowingAvatar}
                        />
                        <View style={styles.followersFollowingUserInfo}>
                          <Text style={styles.followersFollowingUsername}>{follower.username || 'Unknown'}</Text>
                          {follower.bio && (
                            <Text style={styles.followersFollowingBio} numberOfLines={1}>
                              {follower.bio}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )
                ) : (
                  isLoadingFollowing || isFetchingFollowing ? (
                    <View style={styles.followersFollowingLoading}>
                      <ActivityIndicator size="large" color="#8B5CF6" />
                      <Text style={styles.followersFollowingLoadingText}>Loading following...</Text>
                    </View>
                  ) : followingError ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                      <Text style={styles.followersFollowingEmptyText}>Error loading following</Text>
                      <TouchableOpacity onPress={() => refetchFollowing()} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : following.length === 0 ? (
                    <View style={styles.followersFollowingEmpty}>
                      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                      <Text style={styles.followersFollowingEmptyText}>Not following anyone yet</Text>
                    </View>
                  ) : (
                    following.map((followedUser: any) => (
                      <TouchableOpacity
                        key={followedUser._id}
                        style={styles.followersFollowingItem}
                        onPress={() => {
                          setFollowersFollowingModalVisible(false);
                          navigation.navigate('UserInfo', { userId: followedUser._id });
                        }}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{
                            uri: followedUser.profilePicture?.startsWith('http')
                              ? followedUser.profilePicture
                              : followedUser.profilePicture ? `${API_URL}/${followedUser.profilePicture.replace(/^\//, '')}` : 'https://picsum.photos/150/150?random=1'
                          }}
                          style={styles.followersFollowingAvatar}
                        />
                        <View style={styles.followersFollowingUserInfo}>
                          <Text style={styles.followersFollowingUsername}>{followedUser.username || 'Unknown'}</Text>
                          {followedUser.bio && (
                            <Text style={styles.followersFollowingBio} numberOfLines={1}>
                              {followedUser.bio}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Post Modal */}
      <Modal
        visible={postModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleClosePostModal}
      >
        <SafeAreaView style={styles.postModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

          <View style={styles.postModalHeader}>
            <TouchableOpacity onPress={handleClosePostModal} style={styles.postModalBackButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.postModalTitle}>Post</Text>
            {selectedPost && (
              <TouchableOpacity onPress={handleDeletePost} style={styles.postModalDeleteButton}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          {selectedPost && (
            <ScrollView style={styles.postModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.postModalImageContainer}>
                <Image
                  source={{ uri: `${API_URL}/${selectedPost.image || selectedPost.imageUrl}` }}
                  style={styles.postModalImage}
                />
              </View>

              <View style={styles.postModalPostContent}>
                <View style={styles.postModalActions}>
                  <TouchableOpacity
                    style={styles.postModalActionButton}
                    onPress={() => handleLikePost(selectedPost._id, Boolean(selectedPost.isLiked))}
                  >
                    <Entypo
                      name={selectedPost.isLiked ? "heart" : "heart-outlined"}
                      size={28}
                      color={selectedPost.isLiked ? "#EF4444" : "#6B7280"}
                    />
                    <Text style={[styles.postModalActionText, selectedPost.isLiked && styles.postModalActionTextActive]}>
                      {selectedPost.likeCount || selectedPost.likes || 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.postModalActionButton}>
                    <Entypo name="chat" size={28} color="#6B7280" />
                    <Text style={styles.postModalActionText}>
                      {selectedPost.comments?.length || 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.postModalActionButton} onPress={handleSharePost}>
                    <Entypo name="share" size={28} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.postModalCaptionContainer}>
                  <Text style={styles.postModalCaption}>
                    <Text style={styles.postModalUsername}>{username}</Text> {selectedPost.caption || 'No caption'}
                  </Text>
                  <Text style={styles.postModalDate}>
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {selectedPost.comments && selectedPost.comments.length > 0 && (
                  <View style={styles.postModalCommentsSection}>
                    <Text style={styles.postModalCommentsTitle}>
                      Comments ({selectedPost.comments.length})
                    </Text>
                    {selectedPost.comments.map((comment: any) => (
                      <View key={comment._id} style={styles.postModalCommentItem}>
                        <Text style={styles.postModalCommentUsername}>{comment.user?.username || comment.username}</Text>
                        <Text style={styles.postModalCommentText}>{comment.text || comment.comment}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.postModalAddCommentContainer}>
                <Image source={{ uri: profilePicture }} style={styles.postModalCommentAvatar} />
                <TextInput
                  style={styles.postModalCommentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#9CA3AF"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={!newComment.trim() || isCommenting}
                  style={styles.postModalPostCommentButton}
                >
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={[styles.postModalPostCommentText, !newComment.trim() && styles.postModalPostCommentDisabled]}>
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
  },
  profilePictureSection: {
    marginRight: 20,
  },
  profilePictureWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  editIconButton: {
    padding: 4,
  },
  bioText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dueRemindersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dueRemindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dueRemindersIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dueRemindersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dueReminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  lastReminderItem: {
    borderBottomWidth: 0,
  },
  dueReminderContent: {
    flex: 1,
    marginRight: 12,
  },
  dueReminderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dueReminderItemDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  dueReminderTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueReminderItemTime: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  imageGridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addPostText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  postsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  postsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  createPostCard: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_HEIGHT,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createPostGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  createPostText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  gridImageCard: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_HEIGHT,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  likesOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesOverlayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  noPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  noPostsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noPostsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  noPostsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
    textAlign: 'center',
  },
  createFirstPostButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createFirstPostButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
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
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
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
    fontWeight: '600',
  },
  followersFollowingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followersFollowingModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  followersFollowingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  followersFollowingModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  followersFollowingModalCloseButton: {
    padding: 4,
  },
  followersFollowingTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  followersFollowingTab: {
    flex: 1,
    paddingVertical: 12,
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
  followersFollowingListContainer: {
    height: 400,
  },
  followersFollowingList: {
    flex: 1,
  },
  followersFollowingLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  followersFollowingLoadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  followersFollowingAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  followersFollowingUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followersFollowingUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  followersFollowingBio: {
    fontSize: 13,
    color: '#6B7280',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  postModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  postModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postModalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  postModalDeleteButton: {
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
    padding: 16,
  },
  postModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postModalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  postModalActionTextActive: {
    color: '#EF4444',
  },
  postModalCaptionContainer: {
    marginTop: 16,
  },
  postModalCaption: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  postModalUsername: {
    fontWeight: '700',
    color: '#111827',
  },
  postModalDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  postModalCommentsSection: {
    marginTop: 20,
  },
  postModalCommentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  postModalCommentItem: {
    marginBottom: 12,
  },
  postModalCommentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  postModalCommentText: {
    fontSize: 14,
    color: '#374151',
  },
  postModalAddCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  postModalCommentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  postModalCommentInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 15,
    color: '#111827',
    maxHeight: 80,
  },
  postModalPostCommentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postModalPostCommentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  postModalPostCommentDisabled: {
    opacity: 0.3,
  },
});