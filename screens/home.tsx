import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  Animated,
  TouchableWithoutFeedback,
  Share,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Entypo, Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Notifications from '../screens/notifications';
import ReminderPopup from '../components/ReminderPopup';
import { useGetStoriesQuery, useGetStoriesFeedQuery, useGetMyStoriesQuery, useUploadStoryMutation, useDeleteStoryMutation } from '../store/api/storiesApi';
import { useGetPostsQuery, useCreatePostMutation, useLikePostMutation, useCommentPostMutation, postsApi } from '../store/api/postsApi';
import { useToggleFollowMutation, useGetProfileQuery, useCheckFollowRequestByPostQuery } from '../store/api/authApi';
import { useGetRemindersQuery, useLazyGetActiveDueRemindersQuery, useDismissReminderMutation, Reminder } from '../store/api/remindersApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { TapGestureHandler } from 'react-native-gesture-handler';
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
const { width, height } = Dimensions.get('window');

interface Comment {
  _id: string;
  userId: string;
  username: string;
  profilePictureUrl?: string;
  comment: string;
  createdAt: string;
}

interface Post {
  _id: string;
  user?: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
    isFollowing?: boolean;
    hasPendingRequest?: boolean;
  };
  comments: Comment[];
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  likes?: number;
  likeCount?: number;
  isLiked?: boolean;
  imageUrl?: string;
  image?: string;
  caption?: string;
  createdAt: string;
}

// Post Item Component with Real-time Follow Status
function PostItemWithFollowStatus({
  post,
  user,
  navigation,
  handleFollowUser,
  handleCommentPress,
  handleSharePost,
  handleLikePost,
  isTogglingFollow
}: any) {
  const [localLiked, setLocalLiked] = useState(post.isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || post.likes || 0);

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const showHeartAnimation = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(0.8);

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 40,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLocalLike = () => {
    const newLiked = !localLiked;
    setLocalLiked(newLiked);
    setLocalLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    handleLikePost(post._id, localLiked);
    if (newLiked) {
      showHeartAnimation();
    }
  };

  const { data: followStatus, isLoading: statusLoading, refetch: refetchFollowStatus } =
    useCheckFollowRequestByPostQuery(post._id, {
      skip: !post._id || post.user?._id === user?._id
    });

  const isOwnPost = post.user?._id === user?._id;

  return (
    <View style={styles.postCard}>
      <LinearGradient
        colors={['#ffffff', '#fafafa']}
        style={StyleSheet.absoluteFill}
      />

      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postProfileInfo}>
          <TouchableOpacity
            onPress={() => {
              if (post.user?._id) {
                navigation.navigate('UserInfo', { userId: post.user._id });
              }
            }}
            style={styles.profileImageWrapper}
          >
            <Image
              source={{
                uri: post.user?.profilePicture
                  ? API_URL + "/" + post.user.profilePicture
                  : `https://ui-avatars.com/api/?name=${post.user?.username || 'User'}&background=8B5CF6&color=fff&size=40`
              }}
              style={styles.postProfileImage}
            />
            {!isOwnPost && followStatus?.isFollowing && (
              <View style={styles.followingBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.postUserInfo}>
            <TouchableOpacity
              onPress={() => {
                if (post.user?._id) {
                  navigation.navigate('UserInfo', { userId: post.user._id });
                }
              }}
            >
              <Text style={styles.postUserName}>{post.user?.username || 'Unknown User'}</Text>
            </TouchableOpacity>
            <Text style={styles.postTime}>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>

          {/* Follow Button */}
          {!isOwnPost && post.user?._id && (
            <View style={styles.followButtonWrapper}>
              {statusLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    followStatus?.isFollowing && styles.followingButton
                  ]}
                  onPress={async () => {
                    if (post.user?._id) {
                      await handleFollowUser(
                        post.user._id,
                        followStatus?.isFollowing || false
                      );
                      refetchFollowStatus?.();
                    }
                  }}
                  disabled={isTogglingFollow}
                >
                  <Text style={[
                    styles.followButtonText,
                    followStatus?.isFollowing && styles.followingButtonText
                  ]}>
                    {followStatus?.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Post Image with Double Tap Like */}
      <TapGestureHandler
        numberOfTaps={2}
        onActivated={() => {
          if (!localLiked) {
            handleLocalLike();
          }
        }}
      >
        <View style={styles.postImageContainer}>
          <Image
            source={{ uri: API_URL + "/" + post.image }}
            style={styles.postImage}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.03)']}
            style={styles.imageOverlay}
          />

          {/* Animated Heart */}
          <Animated.View
            style={[
              styles.animatedHeart,
              {
                opacity: heartOpacity,
                transform: [
                  { scale: heartScale },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={120} color="rgba(255,255,255,0.8)" />
          </Animated.View>
        </View>
      </TapGestureHandler>

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={handleLocalLike}
            style={styles.actionButton}
          >
            <Animated.View>
              <Ionicons
                name={localLiked ? "heart" : "heart-outline"}
                size={26}
                color={localLiked ? "#EF4444" : "#262626"}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleCommentPress(post)}
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#262626" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSharePost(post)}
            style={styles.actionButton}
          >
            <Ionicons name="paper-plane-outline" size={24} color="#262626" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton}>
          <Ionicons name="bookmark-outline" size={24} color="#262626" />
        </TouchableOpacity>
      </View>

      {/* Likes Count */}
      <View style={styles.postContent}>
        <Text style={styles.likeCount}>
          {localLikeCount.toLocaleString()} {localLikeCount === 1 ? 'like' : 'likes'}
        </Text>

        {/* Caption */}
        {post.caption && (
          <Text style={styles.postCaption}>
            <Text style={styles.captionUsername}>{post.user?.username}</Text>
            {' '}{post.caption}
          </Text>
        )}

        {/* Comments Preview */}
        {post.comments?.length > 0 && (
          <TouchableOpacity
            onPress={() => handleCommentPress(post)}
            style={styles.commentsPreview}
          >
            <Text style={styles.viewComments}>
              View all {post.comments.length} comments
            </Text>
            {post.comments[0] && (
              <Text style={styles.commentPreview} numberOfLines={1}>
                <Text style={styles.commentPreviewUsername}>
                  {post.comments[0].username}
                </Text>
                {' '}{post.comments[0].comment}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Time */}
        <Text style={styles.postTimeSmall}>
          {new Date(post.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const { user: reduxUser, token } = useAppSelector((state) => state.auth);
  const { data: profileData } = useGetProfileQuery();
  const { data: storiesData, isLoading, refetch } = useGetStoriesFeedQuery();
  const { data: myStoriesData, refetch: refetchMyStories } = useGetMyStoriesQuery();
  const [uploadStory, { isLoading: isUploading }] = useUploadStoryMutation();
  const [deleteStory, { isLoading: isDeletingStory }] = useDeleteStoryMutation();

  // Reminder popup state
  const [reminderPopupVisible, setReminderPopupVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const { data: remindersData, refetch: refetchReminders } = useGetRemindersQuery({ completed: false });
  const [getActiveDueReminders] = useLazyGetActiveDueRemindersQuery();
  const [dismissReminder] = useDismissReminderMutation();
  const isCheckingReminders = useRef(false);
  const lastShownReminderId = useRef<string | null>(null);

  // Get user data
  let user;
  if (profileData?.user) {
    user = profileData.user;
  } else if (profileData?._id || profileData?.username) {
    user = profileData;
  } else {
    user = reduxUser;
  }

  // Posts API
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useGetPostsQuery();
  const [likePost] = useLikePostMutation();
  const [commentPost, { isLoading: isCommenting }] = useCommentPostMutation();
  const [toggleFollow, { isLoading: isTogglingFollow }] = useToggleFollowMutation();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewingMyStories, setViewingMyStories] = useState(false);
  const [currentViewingUserIndex, setCurrentViewingUserIndex] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // Check reminders
  const checkReminders = useCallback(async () => {
    if (!token || reminderPopupVisible || isCheckingReminders.current) return;

    isCheckingReminders.current = true;

    try {
      const result = await getActiveDueReminders().unwrap();

      if (result?.success && result.reminders?.length > 0) {
        const newReminders = result.reminders.filter(
          (r: Reminder) => r._id !== lastShownReminderId.current
        );

        if (newReminders.length > 0) {
          setPendingReminders(newReminders);
          setCurrentReminder(newReminders[0]);
          lastShownReminderId.current = newReminders[0]._id;
          setReminderPopupVisible(true);
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    } finally {
      isCheckingReminders.current = false;
    }
  }, [token, getActiveDueReminders, reminderPopupVisible]);

  useEffect(() => {
    if (token) {
      const timer = setTimeout(checkReminders, 1000);
      return () => clearTimeout(timer);
    }
  }, [token, checkReminders]);

  useFocusEffect(
    useCallback(() => {
      refetchReminders();
      const interval = setInterval(checkReminders, 60000);
      return () => clearInterval(interval);
    }, [checkReminders, refetchReminders])
  );

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchMyStories(),
        refetchPosts()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle story upload
  const handleAddStory = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Please allow access to your photos',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const formData = new FormData();
        formData.append('image', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'story.jpg',
        } as any);

        await uploadStory(formData).unwrap();

        Toast.show({
          type: 'success',
          text1: 'Story Uploaded!',
          text2: 'Your story is now live',
        });
        refetch();
        refetchMyStories();
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error?.data?.message || 'Please try again',
      });
    }
  };

  // Handle like post
  const handleLikePost = async (postId: string, isLiked: boolean) => {
    const action = isLiked ? 0 : 1;

    dispatch(
      postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
        const post = draft.posts?.find((p) => p._id === postId);
        if (post) {
          const currentCount = Number(post.likeCount) || Number(post.likes) || 0;
          post.isLiked = action === 1;
          post.likes = action === 1 ? currentCount + 1 : Math.max(0, currentCount - 1);
          post.likeCount = post.likes;
        }
      })
    );

    try {
      await likePost({ postId, action }).unwrap();
    } catch (error) {
      // Revert on error
      dispatch(
        postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
          const post = draft.posts?.find((p) => p._id === postId);
          if (post) {
            const currentCount = Number(post.likeCount) || Number(post.likes) || 0;
            post.isLiked = isLiked;
            post.likes = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
            post.likeCount = post.likes;
          }
        })
      );
    }
  };

  // Handle comment
  const handleSubmitComment = async () => {
    if (!selectedPost || !newComment.trim()) return;

    try {
      await commentPost({
        postId: selectedPost._id,
        text: newComment.trim()
      }).unwrap();

      setNewComment('');
      refetchPosts();

      Toast.show({
        type: 'success',
        text1: 'Comment Added',
        text2: 'Your comment has been posted',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Comment',
        text2: error?.data?.message || 'Please try again',
      });
    }
  };

  // Handle follow
  const handleFollowUser = async (userId: string, isFollowing: boolean) => {
    try {
      await toggleFollow({ followUserId: userId }).unwrap();
      await refetchPosts();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: error?.data?.message || 'Please try again',
      });
    }
  };

  // Handle share
  const handleShareToApp = async () => {
    if (!postToShare) return;

    try {
      const postLink = `${BASE_URL}/post/${postToShare._id}`;

      await Share.share({
        message: `Check out this post by ${postToShare.user?.username} on Muse!`,
        url: postLink,
        title: `Post by ${postToShare.user?.username}`,
      });

      handleCloseShareModal();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: error.message || 'Please try again',
      });
    }
  };

  // Handle story navigation
  const handleStoryPress = (userIndex: number, isMyStory = false) => {
    if (isMyStory && myStories.length > 0) {
      setViewingMyStories(true);
      setCurrentViewingUserIndex(0);
      setCurrentStoryIndex(0);
    } else {
      setViewingMyStories(false);
      setCurrentViewingUserIndex(userIndex);
      setCurrentStoryIndex(0);
    }
    setStoryViewerVisible(true);
  };

  const handleCloseStory = () => {
    setStoryViewerVisible(false);
  };

  const handleDeleteStory = async () => {
    if (!viewingMyStories || !currentStories[currentStoryIndex]) return;

    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const storyId = currentStories[currentStoryIndex]._id;
              await deleteStory(storyId).unwrap();

              Toast.show({
                type: 'success',
                text1: 'Story Deleted',
                text2: 'Your story has been removed',
              });

              refetchMyStories();

              if (myStories.length <= 1) {
                handleCloseStory();
              }
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: 'Please try again',
              });
            }
          },
        },
      ]
    );
  };

  // Data preparation
  const stories = storiesData?.stories || [];
  const myStories = myStoriesData?.stories || [];
  const allPosts = postsData?.posts || [];
  const posts = allPosts;

  // Story viewer data
  let currentStories: any[] = [];
  if (viewingMyStories) {
    currentStories = myStories.flatMap((item: any) =>
      item.stories ? item.stories.map((story: any) => ({ ...story, user: item.user })) : [item]
    ).reverse();
  } else if (stories[currentViewingUserIndex]) {
    const userStory = stories[currentViewingUserIndex];
    currentStories = userStory.stories.map((story: any) => ({
      ...story,
      user: userStory.user
    }));
  }

  // Search suggestions
  const userCandidates = [
    ...allPosts.map(p => p.user).filter(Boolean),
    ...stories.map(s => s.user).filter(Boolean),
  ];

  const suggestedUsers = searchQuery
    ? Array.from(new Map(userCandidates.filter(u => u?._id).map(u => [u._id, u])).values())
      .filter(u => (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Scroll to top
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Track scroll for top button
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setShowScrollTop(offsetY > 300);
      },
      useNativeDriver: false,
    }
  );

  // Close modals
  const handleCloseCommentsModal = () => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
    setNewComment('');
  };

  const handleCloseShareModal = () => {
    setShareModalVisible(false);
    setPostToShare(null);
  };

  const handleCloseReminderPopup = useCallback(() => {
    setReminderPopupVisible(false);
    const remainingReminders = pendingReminders.filter(r => r._id !== currentReminder?._id);

    if (remainingReminders.length > 0) {
      setTimeout(() => {
        lastShownReminderId.current = remainingReminders[0]._id;
        setCurrentReminder(remainingReminders[0]);
        setPendingReminders(remainingReminders);
        setReminderPopupVisible(true);
      }, 500);
    } else {
      setCurrentReminder(null);
      setPendingReminders([]);
      lastShownReminderId.current = null;
    }
  }, [pendingReminders, currentReminder]);

  const handleDismissReminder = async (reminderId: string) => {
    try {
      await dismissReminder(reminderId).unwrap();
      setReminderPopupVisible(false);
      refetchReminders();

      Toast.show({
        type: 'success',
        text1: 'Reminder Dismissed',
        text2: 'You won\'t see this reminder again',
      });

      handleCloseReminderPopup();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: 'Please try again',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerContent}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="heart-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#000" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Suggestions */}
      {searchQuery.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestedUsers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => {
                  navigation.navigate('UserInfo', { userId: item._id });
                  setSearchQuery('');
                }}
              >
                <Image
                  source={{
                    uri: item?.profilePicture
                      ? API_URL + "/" + item.profilePicture
                      : `https://ui-avatars.com/api/?name=${item.username}&background=8B5CF6&color=fff`
                  }}
                  style={styles.suggestionAvatar}
                />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName}>{item.username}</Text>
                  <Text style={styles.suggestionHandle}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptySearchText}>No users found</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Main Feed */}
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostItemWithFollowStatus
            post={item}
            user={user}
            navigation={navigation}
            handleFollowUser={handleFollowUser}
            handleCommentPress={(post: Post) => {
              setSelectedPost(post);
              setCommentsModalVisible(true);
            }}
            handleSharePost={(post: Post) => {
              setPostToShare(post);
              setShareModalVisible(true);
            }}
            handleLikePost={handleLikePost}
            isTogglingFollow={isTogglingFollow}
          />
        )}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.feedContent}
        ListHeaderComponent={
          <>
            {/* Stories Section */}
            <View style={styles.storiesWrapper}>
              <View style={styles.storiesHeader}>
                <Text style={styles.storiesTitle}>Stories</Text>
                <TouchableOpacity>
                  <Text style={styles.storiesSeeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.storiesScroll}
              >
                {/* Your Story */}
                <TouchableOpacity
                  style={styles.storyItem}
                  onPress={() => myStories.length > 0 ? handleStoryPress(0, true) : handleAddStory()}
                  disabled={isUploading}
                >
                  <View style={styles.storyRing}>
                    <LinearGradient
                      colors={myStories.length > 0 ? ['#8B5CF6', '#EC4899'] : ['#E5E7EB', '#E5E7EB']}
                      style={styles.storyGradient}
                    >
                      <View style={styles.storyInnerRing}>
                        <Image
                          source={{
                            uri: user?.profilePicture
                              ? API_URL + "/" + user.profilePicture
                              : `https://ui-avatars.com/api/?name=${user?.username || 'You'}&background=8B5CF6&color=fff`
                          }}
                          style={styles.storyImage}
                        />
                      </View>
                    </LinearGradient>

                    {myStories.length === 0 && (
                      <View style={styles.addStoryButton}>
                        {isUploading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Entypo name="plus" size={14} color="#fff" />
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.storyName} numberOfLines={1}>
                    {myStories.length > 0 ? 'Your Story' : isUploading ? 'Uploading...' : 'Add Story'}
                  </Text>
                </TouchableOpacity>

                {/* Following Stories */}
                {stories.map((userStory, index) => (
                  <TouchableOpacity
                    key={userStory._id}
                    style={styles.storyItem}
                    onPress={() => handleStoryPress(index)}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#EC4899']}
                      style={styles.storyRing}
                    >
                      <View style={styles.storyInnerRing}>
                        <Image
                          source={{
                            uri: userStory.user?.profilePicture
                              ? API_URL + "/" + userStory.user.profilePicture
                              : `https://ui-avatars.com/api/?name=${userStory.user?.username}&background=8B5CF6&color=fff`
                          }}
                          style={styles.storyImage}
                        />
                      </View>
                    </LinearGradient>
                    <Text style={styles.storyName} numberOfLines={1}>
                      {userStory.user?.username}
                    </Text>
                  </TouchableOpacity>
                ))}

                {isLoading && (
                  <View style={styles.storyLoading}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  </View>
                )}
              </ScrollView>
            </View>
          </>
        }
        ListFooterComponent={
          posts.length > 0 && (
            <View style={styles.feedFooter}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.footerText}>Loading more posts...</Text>
            </View>
          )
        }
      />

      {/* Story Viewer Modal */}
      <Modal
        visible={storyViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseStory}
      >
        <View style={styles.storyViewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />

          {currentStories.length > 0 && currentStories[currentStoryIndex] && (
            <>
              {/* Progress Bars */}
              <View style={styles.storyProgressContainer}>
                {currentStories.map((_, index) => (
                  <View key={index} style={styles.storyProgressBar}>
                    <Animated.View
                      style={[
                        styles.storyProgressFill,
                        index === currentStoryIndex && { width: '100%' },
                        index < currentStoryIndex && { width: '100%' }
                      ]}
                    />
                  </View>
                ))}
              </View>

              {/* Header */}
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyViewerUser}>
                  <Image
                    source={{
                      uri: currentStories[currentStoryIndex].user?.profilePicture
                        ? API_URL + "/" + currentStories[currentStoryIndex].user.profilePicture
                        : `https://ui-avatars.com/api/?name=${currentStories[currentStoryIndex].user?.username}&background=8B5CF6&color=fff`
                    }}
                    style={styles.storyViewerAvatar}
                  />
                  <View>
                    <Text style={styles.storyViewerUsername}>
                      {currentStories[currentStoryIndex].user?.username}
                    </Text>
                    <Text style={styles.storyViewerTime}>
                      {new Date(currentStories[currentStoryIndex].createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.storyViewerActions}>
                  {viewingMyStories && (
                    <TouchableOpacity onPress={handleDeleteStory} style={styles.storyViewerButton}>
                      <Ionicons name="trash-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleCloseStory} style={styles.storyViewerButton}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Story Image */}
              <TouchableWithoutFeedback
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  if (locationX < width / 2) {
                    if (currentStoryIndex > 0) {
                      setCurrentStoryIndex(currentStoryIndex - 1);
                    } else if (currentViewingUserIndex > 0 && !viewingMyStories) {
                      setCurrentViewingUserIndex(currentViewingUserIndex - 1);
                      setCurrentStoryIndex(stories[currentViewingUserIndex - 1]?.stories.length - 1 || 0);
                    }
                  } else {
                    if (currentStoryIndex < currentStories.length - 1) {
                      setCurrentStoryIndex(currentStoryIndex + 1);
                    } else if (currentViewingUserIndex < stories.length - 1 && !viewingMyStories) {
                      setCurrentViewingUserIndex(currentViewingUserIndex + 1);
                      setCurrentStoryIndex(0);
                    } else {
                      handleCloseStory();
                    }
                  }
                }}
              >
                <Image
                  source={{ uri: API_URL + "/" + currentStories[currentStoryIndex].image }}
                  style={styles.storyViewerImage}
                  resizeMode="contain"
                />
              </TouchableWithoutFeedback>

              {/* Bottom Actions */}
              <View style={styles.storyViewerFooter}>
                <TouchableOpacity style={styles.storyReplyButton}>
                  <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                  <Text style={styles.storyReplyText}>Reply to story</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.storyMoreButton}>
                  <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCommentsModal}
      >
        <SafeAreaView style={styles.commentsModal}>
          <View style={styles.commentsHeader}>
            <TouchableOpacity onPress={handleCloseCommentsModal} style={styles.commentsBackButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.commentsTitle}>Comments</Text>
            <View style={{ width: 40 }} />
          </View>

          <FlatList
            data={selectedPost?.comments || []}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Image
                  source={{
                    uri: item.profilePictureUrl
                      ? API_URL + "/" + item.profilePictureUrl
                      : `https://ui-avatars.com/api/?name=${item.username}&background=8B5CF6&color=fff`
                  }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{item.username}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{item.comment}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-outline" size={60} color="#D1D5DB" />
                <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                <Text style={styles.emptyCommentsText}>Be the first to comment</Text>
              </View>
            }
            contentContainerStyle={styles.commentsList}
          />

          <View style={styles.addCommentWrapper}>
            <Image
              source={{
                uri: user?.profilePicture
                  ? API_URL + "/" + user.profilePicture
                  : `https://ui-avatars.com/api/?name=${user?.username || 'You'}&background=8B5CF6&color=fff`
              }}
              style={styles.commentInputAvatar}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#8E8E93"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              {newComment.trim().length > 0 && (
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={isCommenting}
                  style={styles.postCommentButton}
                >
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={styles.postCommentText}>Post</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseShareModal}
      >
        <BlurView intensity={90} style={styles.shareModalOverlay}>
          <TouchableWithoutFeedback onPress={handleCloseShareModal}>
            <View style={styles.shareModalOverlay} />
          </TouchableWithoutFeedback>

          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share Post</Text>
              <TouchableOpacity onPress={handleCloseShareModal}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {postToShare && (
              <View style={styles.sharePreview}>
                <Image
                  source={{ uri: API_URL + "/" + postToShare.image }}
                  style={styles.sharePreviewImage}
                />
                <View style={styles.sharePreviewInfo}>
                  <View style={styles.sharePreviewUser}>
                    <Image
                      source={{
                        uri: postToShare.user?.profilePicture
                          ? API_URL + "/" + postToShare.user.profilePicture
                          : `https://ui-avatars.com/api/?name=${postToShare.user?.username}&background=8B5CF6&color=fff`
                      }}
                      style={styles.sharePreviewAvatar}
                    />
                    <Text style={styles.sharePreviewUsername}>{postToShare.user?.username}</Text>
                  </View>
                  <Text style={styles.sharePreviewCaption} numberOfLines={2}>
                    {postToShare.caption || 'No caption'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareOption} onPress={handleShareToApp}>
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  style={styles.shareOptionIcon}
                >
                  <Ionicons name="share-outline" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareOptionText}>Share to...</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => {
                  Clipboard.setString(`${BASE_URL}/post/${postToShare?._id}`);
                  Toast.show({
                    type: 'success',
                    text1: 'Link Copied!',
                    text2: 'Post link copied to clipboard',
                  });
                  handleCloseShareModal();
                }}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="link-outline" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.shareOptionText}>Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => {
                  // Save image to device
                  Toast.show({
                    type: 'info',
                    text1: 'Saving...',
                    text2: 'Image download started',
                  });
                }}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="download-outline" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.shareOptionText}>Save Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Reminder Popup */}
      <ReminderPopup
        visible={reminderPopupVisible}
        reminder={currentReminder}
        onClose={handleCloseReminderPopup}
        onDismiss={handleDismissReminder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: {
    width: 110,
    height: 30,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerIcon: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  suggestionHandle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptySearch: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    fontWeight: '500',
  },
  storiesWrapper: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  storiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  storiesSeeAll: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  storiesScroll: {
    paddingLeft: 16,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  storyRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
    marginBottom: 6,
  },
  storyGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    padding: 2,
  },
  storyInnerRing: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyName: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    maxWidth: 72,
  },
  storyLoading: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  feedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  feedContent: {
    paddingBottom: 20,
  },
  feedFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  scrollTopButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  postHeader: {
    padding: 16,
  },
  postProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  postProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  followingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  followButtonWrapper: {
    marginLeft: 'auto',
  },
  followButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#000',
  },
  postImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  animatedHeart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  likeCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  postCaption: {
    fontSize: 15,
    lineHeight: 20,
    color: '#000',
    marginBottom: 6,
  },
  captionUsername: {
    fontWeight: '600',
  },
  commentsPreview: {
    marginTop: 4,
  },
  viewComments: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  commentPreview: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  commentPreviewUsername: {
    fontWeight: '600',
  },
  postTimeSmall: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyProgressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  storyProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  storyViewerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  storyViewerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyViewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyViewerUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  storyViewerTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  storyViewerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  storyViewerButton: {
    padding: 4,
  },
  storyViewerImage: {
    flex: 1,
    width: width,
    height: height,
  },
  storyViewerFooter: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  storyReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  storyReplyText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  storyMoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentsBackButton: {
    padding: 4,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  commentsList: {
    padding: 16,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCommentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  addCommentWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  commentInputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    maxHeight: 100,
    padding: 0,
    marginRight: 8,
  },
  postCommentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postCommentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  shareModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  sharePreview: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  sharePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  sharePreviewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sharePreviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sharePreviewAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sharePreviewUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  sharePreviewCaption: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  shareOptions: {
    gap: 12,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    gap: 12,
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});