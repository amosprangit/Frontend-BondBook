import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  Animated,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Dimensions,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

// Import components
import PostItem from '../components/PostItem';
import StoriesSection from '../components/StoriesSection';
import StoryViewer from '../components/StoryViewer';
import CommentsModal from '../components/CommentModal';
import ShareModal from '../components/ShareModal';

// Import custom hooks
import { useNotificationCount } from '../services/useNotificationCount';

// Import API hooks
import {
  useGetStoriesFeedQuery,
  useGetMyStoriesQuery,
  useUploadStoryMutation,
  useDeleteStoryMutation,
  useLikeStoryMutation,
  useUnlikeStoryMutation
} from '../store/api/storiesApi';
import { useGetPostsQuery, useLikePostMutation, useCommentPostMutation, postsApi } from '../store/api/postsApi';
import { useToggleFollowMutation, useGetProfileQuery } from '../store/api/authApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const { user: reduxUser, token } = useAppSelector((state) => state.auth);
  const { data: profileData } = useGetProfileQuery();
  const { data: storiesData, isLoading, refetch } = useGetStoriesFeedQuery();
  const { data: myStoriesData, refetch: refetchMyStories } = useGetMyStoriesQuery();
  const [uploadStory, { isLoading: isUploading }] = useUploadStoryMutation();
  const [deleteStory, { isLoading: isDeletingStory }] = useDeleteStoryMutation();

  // ✅ Get real-time notification count for the bell icon
  const { unreadCount, hasUnread, totalCount } = useNotificationCount();

  // Story like hooks
  const [likeStory] = useLikeStoryMutation();
  const [unlikeStory] = useUnlikeStoryMutation();

  const [storyLikeState, setStoryLikeState] = useState<Record<string, boolean>>({});
  const [storyLikeCount, setStoryLikeCount] = useState<Record<string, number>>({});

  useEffect(() => {
    if (storiesData?.stories) {
      const initialLikeState: Record<string, boolean> = {};
      const initialLikeCount: Record<string, number> = {};

      storiesData.stories.forEach((userStory: any) => {
        if (userStory.stories) {
          userStory.stories.forEach((story: any) => {
            initialLikeState[story._id] = story.isLiked || false;
            initialLikeCount[story._id] = story.likes || 0;
          });
        }
      });

      setStoryLikeState(initialLikeState);
      setStoryLikeCount(initialLikeCount);
    }
  }, [storiesData]);

  const handleStoryLike = async (storyId: string, isCurrentlyLiked: boolean) => {
    try {
      setStoryLikeState(prev => ({
        ...prev,
        [storyId]: !isCurrentlyLiked
      }));
      setStoryLikeCount(prev => ({
        ...prev,
        [storyId]: isCurrentlyLiked
          ? Math.max(0, (prev[storyId] || 0) - 1)
          : (prev[storyId] || 0) + 1
      }));

      if (isCurrentlyLiked) {
        await unlikeStory({ storyId }).unwrap();
      } else {
        await likeStory({ storyId }).unwrap();
      }
    } catch (error: any) {
      setStoryLikeState(prev => ({
        ...prev,
        [storyId]: isCurrentlyLiked
      }));
      setStoryLikeCount(prev => ({
        ...prev,
        [storyId]: isCurrentlyLiked
          ? (prev[storyId] || 0) + 1
          : Math.max(0, (prev[storyId] || 0) - 1)
      }));
    }
  };

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
            {/* ✅ Heart Icon - Navigates to Notifications */}
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="heart-outline" size={24} color="#000" />
              {/* Show badge on heart icon for all notifications */}
              {totalCount > 0 && (
                <View style={[styles.badge, styles.heartBadge]}>
                  <Text style={styles.badgeText}>
                    {totalCount > 99 ? '99+' : totalCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => navigation.navigate('ChatScreen')}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#000" />
              {/* ✅ Dynamic Badge for unread notifications */}
              {hasUnread && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Main Feed */}
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostItem
            post={item}
            user={user}
            navigation={navigation}
            handleFollowUser={handleFollowUser}
            handleCommentPress={(post: any) => {
              setSelectedPost(post);
              setCommentsModalVisible(true);
            }}
            handleSharePost={(post: any) => {
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
            <StoriesSection
              stories={stories}
              myStories={myStories}
              user={user}
              isLoading={isLoading}
              isUploading={isUploading}
              handleStoryPress={handleStoryPress}
              handleAddStory={handleAddStory}
            />
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Animated.View
          style={[
            styles.scrollTopButton,
            {
              transform: [{
                scale: scrollY.interpolate({
                  inputRange: [300, 400],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              }],
            }
          ]}
        >
          <TouchableOpacity onPress={scrollToTop}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.scrollTopGradient}
            >
              <Ionicons name="arrow-up" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={storyViewerVisible}
        onClose={handleCloseStory}
        currentStories={currentStories}
        currentStoryIndex={currentStoryIndex}
        setCurrentStoryIndex={setCurrentStoryIndex}
        viewingMyStories={viewingMyStories}
        handleDeleteStory={handleDeleteStory}
        storyLikeState={storyLikeState}
        storyLikeCount={storyLikeCount}
        handleStoryLike={handleStoryLike}
        stories={stories}
        currentViewingUserIndex={currentViewingUserIndex}
        setCurrentViewingUserIndex={setCurrentViewingUserIndex}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={handleCloseCommentsModal}
        selectedPost={selectedPost}
        user={user}
        newComment={newComment}
        setNewComment={setNewComment}
        handleSubmitComment={handleSubmitComment}
        isCommenting={isCommenting}
      />

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={handleCloseShareModal}
        postToShare={postToShare}
        handleShareToApp={handleShareToApp}
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
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
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  heartBadge: {
    backgroundColor: '#EF4444', // Red color for heart badge
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollTopGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});