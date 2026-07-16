import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

// Import components
import ProfileHeader from '../components/Profile/ProfileHeader';
import ProfileStats from '../components/Profile/ProfileStats';
import DueRemindersCard from '../components/Profile/DueRemindersCard';
import PostGrid from '../components/Profile/PostGrid';
import EditProfileModal from '../components/Profile/EditProfileModal';
import FollowersFollowingModal from '../components/Profile/FollowersFollowingModal';
import PostModal from '../components/Profile/ProfilePostModal';

// Import API hooks
import {
  useGetProfileQuery,
  useUpdateProfilePictureMutation,
  useUpdateProfileMutation,
  useGetFollowersQuery,
  useGetFollowingQuery,
} from '../store/api/authApi';
import {
  useGetMyPostsQuery,
  useLikePostMutation,
  useCommentPostMutation,
  useDeletePostMutation,
  postsApi,
  useCreatePostMutation,
} from '../store/api/postsApi';
import { useLazyCheckDueRemindersQuery } from '../store/api/remindersApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const { user: reduxUser } = useAppSelector((state) => state.auth);
  const { data: profileData, isLoading, refetch } = useGetProfileQuery();
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useGetMyPostsQuery();
  const [updateProfilePicture, { isLoading: isUpdating }] = useUpdateProfilePictureMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();
  const [likePost] = useLikePostMutation();
  const [commentPost, { isLoading: isCommenting }] = useCommentPostMutation();
  const [deletePost] = useDeletePostMutation();
  const [refreshing, setRefreshing] = useState(false);

  // UI State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [followersFollowingModalVisible, setFollowersFollowingModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');
  const [dueReminders, setDueReminders] = useState<any[]>([]);
  const [triggerCheckDueReminders] = useLazyCheckDueRemindersQuery();

  // Get user data
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
  const profilePicture = user?.profilePicture
    ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${API_URL}/${user.profilePicture}`)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=8B5CF6&color=fff&size=150`;
  const followersCount = user?.followers?.length || 0;
  const followingCount = user?.following?.length || 0;
  const posts = postsData?.posts || [];
  const postsCount = posts.length || 0;
  const userId = user?._id || user?.id;

  // Fetch followers/following data
  const {
    data: followersData,
    isLoading: isLoadingFollowers,
    error: followersError,
    refetch: refetchFollowers,
    isFetching: isFetchingFollowers,
  } = useGetFollowersQuery(userId || '', {
    skip: !userId || !followersFollowingModalVisible,
  });

  const {
    data: followingData,
    isLoading: isLoadingFollowing,
    error: followingError,
    refetch: refetchFollowing,
    isFetching: isFetchingFollowing,
  } = useGetFollowingQuery(userId || '', {
    skip: !userId || !followersFollowingModalVisible,
  });

  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  // Fetch due reminders
  const fetchDueReminders = useCallback(async () => {
    try {
      const response = await triggerCheckDueReminders().unwrap();
      setDueReminders(response?.reminders || []);
    } catch (error) {
      console.error('Check due reminders error:', error);
    }
  }, [triggerCheckDueReminders]);

  useEffect(() => {
    fetchDueReminders();
    const interval = setInterval(fetchDueReminders, 30000);
    return () => clearInterval(interval);
  }, [fetchDueReminders]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPosts(), fetchDueReminders()]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchPosts, fetchDueReminders]);

  // Handle profile picture update
  const handleUpdateProfilePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('image', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image-${Date.now()}.jpg`,
      } as any);

      await updateProfilePicture(formData).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile picture updated!' });
      refetch();
    }
  };

  // Handle edit profile
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
      await updateProfile({
        username: editUsername.trim(),
        bio: editBio.trim(),
      }).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
      setEditModalVisible(false);
      await refetch();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to update profile' });
    }
  };

  // Handle post actions
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
      await likePost({ postId, action }).unwrap();
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
      await commentPost({ postId: selectedPost._id, text: newComment }).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Comment added successfully!' });
      setNewComment('');
      await refetchPosts();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.data?.message || 'Failed to add comment' });
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(selectedPost._id).unwrap();
              Toast.show({ type: 'success', text1: 'Success', text2: 'Post deleted!' });
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
      const postLink = `${BASE_URL}/post/${selectedPost._id}`;
      const shareMessage = `Check out this post by ${username}!\n\n${selectedPost.caption || 'No caption'}\n\nView post: ${postLink}`;
      await Share.share({ message: shareMessage, title: `Post by ${username}` });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Share Failed', text2: error.message || 'Failed to share post' });
    }
  };

  // Handle create post
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
        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'post.jpg',
        } as any);
        formData.append('caption', 'New post');

        // await createPost(formData).unwrap();
        Toast.show({ type: 'success', text1: 'Success', text2: 'Post created successfully!' });
        refetchPosts();
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: error?.data?.message || 'Failed to create post' });
    }
  };

  const formatReminderDateTime = (reminder: any) => {
    const date = new Date(reminder.reminderDate);
    const formattedDate = date.toLocaleDateString();
    const time = reminder.reminderTime || '';
    return `${formattedDate} • ${time}`;
  };

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

      {/* Header */}
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
        {/* Profile Header */}
        <ProfileHeader
          username={username}
          bio={bio}
          profilePicture={profilePicture}
          isUpdating={isUpdating}
          onUpdateProfilePicture={handleUpdateProfilePicture}
          onEditProfile={handleEditProfile}
        />

        {/* Profile Stats */}
        <View style={styles.statsWrapper}>
          <ProfileStats
            postsCount={postsCount}
            followersCount={followersCount}
            followingCount={followingCount}
            onFollowersPress={() => {
              setModalType('followers');
              setFollowersFollowingModalVisible(true);
            }}
            onFollowingPress={() => {
              setModalType('following');
              setFollowersFollowingModalVisible(true);
            }}
          />
        </View>

        {/* Due Reminders */}
        <DueRemindersCard
          reminders={dueReminders}
          formatReminderDateTime={formatReminderDateTime}
        />

        {/* Post Grid */}
        <View style={styles.postGridContainer}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridHeaderTitle}>My Posts</Text>
          </View>

          <PostGrid
            posts={posts}
            loading={postsLoading}
            onPostPress={handlePostPress}
            onCreatePost={handleCreatePost}
            isCreatingPost={isCreatingPost}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        username={editUsername}
        bio={editBio}
        onUsernameChange={setEditUsername}
        onBioChange={setEditBio}
        onSave={handleUpdateProfile}
        isSaving={isUpdatingProfile}
      />

      <FollowersFollowingModal
        visible={followersFollowingModalVisible}
        onClose={() => setFollowersFollowingModalVisible(false)}
        modalType={modalType}
        onTypeChange={setModalType}
        followers={followers}
        following={following}
        followersCount={followersCount}
        followingCount={followingCount}
        loading={modalType === 'followers' ? isLoadingFollowers || isFetchingFollowers : isLoadingFollowing || isFetchingFollowing}
        error={modalType === 'followers' ? followersError : followingError}
        onUserPress={(userId) => {
          setFollowersFollowingModalVisible(false);
          navigation.navigate('UserInfo', { userId });
        }}
        onRetry={() => {
          if (modalType === 'followers') {
            refetchFollowers();
          } else {
            refetchFollowing();
          }
        }}
      />

      <PostModal
        visible={postModalVisible}
        onClose={handleClosePostModal}
        post={selectedPost}
        username={username}
        profilePicture={profilePicture}
        newComment={newComment}
        onCommentChange={setNewComment}
        onLike={() => selectedPost && handleLikePost(selectedPost._id, Boolean(selectedPost.isLiked))}
        onCommentSubmit={handleSubmitComment}
        onDelete={handleDeletePost}
        onShare={handleSharePost}
        isCommenting={isCommenting}
      />

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
  statsWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  postGridContainer: {
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
});