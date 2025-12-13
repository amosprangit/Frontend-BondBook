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
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Entypo, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import TabHeader from '../components/tabHeader';
import ReminderPopup from '../components/ReminderPopup';
import { useGetStoriesQuery, useGetStoriesFeedQuery, useGetMyStoriesQuery, useUploadStoryMutation, useDeleteStoryMutation } from '../store/api/storiesApi';
import { useGetPostsQuery, useCreatePostMutation, useLikePostMutation, useCommentPostMutation, postsApi } from '../store/api/postsApi';
import { useToggleFollowMutation, useGetProfileQuery, useCheckFollowRequestByPostQuery } from '../store/api/authApi';
import { useLazyGetActiveDueRemindersQuery, useDismissReminderMutation, Reminder } from '../store/api/remindersApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { API_URL, BASE_URL } from '@env';

const { width } = Dimensions.get('window');

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
  caption?: string;
  createdAt: string;
}

// Post Item Component with Real-time Follow Status Check
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
  // ✅ Real-time follow status check using new API
  const { data: followStatus, isLoading: statusLoading, refetch: refetchFollowStatus } = useCheckFollowRequestByPostQuery(
    post._id,
    { 
      skip: !post._id || post.user?._id === user?._id // Skip for own posts
    }
  );

  const isOwnPost = post.user?._id === user?._id;
  
  return (
    <View key={post._id} style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postProfileInfo}>
          <View style={styles.postProfileImage}>
            
            <Image 
              source={{uri: post.user?.profilePicture ? API_URL + "/" + post.user.profilePicture : 'https://picsum.photos/150/150?random=10'}} 
              style={{ width: 40, height: 40, borderRadius: 20 }} 
              resizeMode="cover" 
            />
          </View>
          <TouchableOpacity 
            onPress={() => {
              if (post.user?._id) {
                navigation.navigate('UserInfo', { userId: post.user._id });
              }
            }} 
            style={styles.postUserInfo}
            disabled={!post.user?._id}
          >
            <Text style={styles.postUserName}>{post.user?.username || 'Unknown User'}</Text>
            <Text style={styles.postTime}> {new Date(post.createdAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
          
          {/* Follow button */}
          {!isOwnPost && post.user?._id && (
            <>
              {statusLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" style={{ marginRight: 8 }} />
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
                      // Refetch follow status after follow action
                      if (refetchFollowStatus) {
                        refetchFollowStatus();
                      }
                    }
                  }}
                  disabled={isTogglingFollow || !post.user?._id}
                >
                  <Text style={[
                    styles.followButtonText,
                    followStatus?.isFollowing && styles.followingButtonText
                  ]}>
                    {followStatus?.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        {/* <View style={styles.postHeaderRight}>
          <TouchableOpacity>
            <Entypo name="dots-three-vertical" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View> */}
      </View>

      <View style={styles.postImageContainer}>
        
        <View style={styles.postImagePlaceholder}>
          
          <Image source={{uri: API_URL + "/" + post.image}}  style={{ width: '100%', height: '100%', borderRadius: 8, }} resizeMode="cover" />
        </View>
      </View>

      <View style={styles.postContent}>
        <Text style={styles.postCaption}>{post.caption}</Text>
        
        <View style={styles.postEngagement}>
          <View style={styles.likeSection}>
            <Text style={styles.heartIcon}>❤️</Text>
            <Text style={styles.viewCommentsText}>
              {post.likeCount || post.likes || 0} {(post.likeCount || post.likes || 0) === 1 ? 'like' : 'likes'}
            </Text>
            <Text style={styles.viewCommentsText}> • </Text>
            <TouchableOpacity onPress={() => handleCommentPress(post)}>
              <Text style={styles.viewCommentsText}>
                {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLikePost(post._id, Boolean(post.isLiked))}
          >
            <Entypo 
              name={post.isLiked ? "heart" : "heart-outlined"} 
              size={20} 
              color={post.isLiked ? "#EF4444" : "#374151"} 
            /> 
            <Text style={styles.actionText}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleCommentPress(post)}
          >
            <Entypo name="chat" size={20} color="#374151" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleSharePost(post)}
          >
            <Entypo name="share" size={20} color="#374151" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({navigation}: {navigation: any}) {
  const dispatch = useAppDispatch();
  const { user: reduxUser, token } = useAppSelector((state) => state.auth);
  const { data: profileData } = useGetProfileQuery();
  const { data: storiesData, isLoading, error, refetch } = useGetStoriesFeedQuery();
  const { data: myStoriesData, refetch: refetchMyStories } = useGetMyStoriesQuery();
  const [uploadStory, { isLoading: isUploading }] = useUploadStoryMutation();
  const [deleteStory, { isLoading: isDeletingStory }] = useDeleteStoryMutation();

  // Reminder popup state
  const [reminderPopupVisible, setReminderPopupVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [getActiveDueReminders] = useLazyGetActiveDueRemindersQuery();
  const [dismissReminder] = useDismissReminderMutation();
  const hasCheckedReminders = useRef(false);

  // Track previous user to detect login changes
  const previousUserIdRef = useRef<string | null>(null);

  // Get user data from API or Redux
  let user;
  if (profileData?.user) {
    user = profileData.user;
  } else if (profileData?._id || profileData?.username) {
    user = profileData;
  } else {
    user = reduxUser;
  }

  const profilePictureUrl = user?.profilePictureUrl;

  const [isModalVisible, setIsModalVisible] = useState(false);
const [selectedComments, setSelectedComments] = useState<any[]>([]);
const handleViewComments = (comments: any) => {
  setSelectedComments(comments);
  setIsModalVisible(true);
};

  
  // Posts API
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useGetPostsQuery();
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();
  const [likePost] = useLikePostMutation();
  const [commentPost, { isLoading: isCommenting }] = useCommentPostMutation();
  
  // Follow API
  const [toggleFollow, { isLoading: isTogglingFollow }] = useToggleFollowMutation();

  // Comment state - track which post has comment input open and text per post
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});
  
  // Comments modal state
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchMyStories(),
        refetchPosts()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Monitor user changes and refetch data when user logs in or switches
  useEffect(() => {
    const currentUserId = reduxUser?._id || reduxUser?.id;

    // If user changed (different user logged in)
    if (currentUserId && previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      console.log('User changed, refreshing all data...');
      // Refetch all data for new user
      refetch();
      refetchMyStories();
      refetchPosts();
      // Reset reminder check flag for new user
      hasCheckedReminders.current = false;
    }

    // Update previous user ID
    previousUserIdRef.current = currentUserId || null;
  }, [reduxUser, refetch, refetchMyStories, refetchPosts]);

  // Check for due reminders when screen is focused
  useFocusEffect(
    useCallback(() => {
      const checkReminders = async () => {
        if (!token) return;

        try {
          const result = await getActiveDueReminders().unwrap();
          if (result.success && result.reminders && result.reminders.length > 0) {
            // Store all pending reminders
            setPendingReminders(result.reminders);
            // Show the first reminder
            setCurrentReminder(result.reminders[0]);
            setReminderPopupVisible(true);
          }
        } catch (error) {
          console.error('Error checking due reminders:', error);
        }
      };

      // Check reminders when screen is focused
      checkReminders();

      return () => {
        // Cleanup if needed
      };
    }, [token, getActiveDueReminders])
  );

  // Handle closing popup (just close, will show again on next app open)
  const handleCloseReminderPopup = () => {
    setReminderPopupVisible(false);
    // Check if there are more reminders to show
    const remainingReminders = pendingReminders.filter(
      (r) => r._id !== currentReminder?._id
    );
    if (remainingReminders.length > 0) {
      // Show next reminder after a short delay
      setTimeout(() => {
        setCurrentReminder(remainingReminders[0]);
        setPendingReminders(remainingReminders);
        setReminderPopupVisible(true);
      }, 500);
    } else {
      setCurrentReminder(null);
      setPendingReminders([]);
    }
  };

  // Handle dismissing reminder (turn off permanently)
  const handleDismissReminder = async (reminderId: string) => {
    try {
      await dismissReminder(reminderId).unwrap();
      setReminderPopupVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Reminder Off',
        text2: 'This reminder will not show again',
      });
      // Check if there are more reminders to show
      const remainingReminders = pendingReminders.filter((r) => r._id !== reminderId);
      if (remainingReminders.length > 0) {
        // Show next reminder after a short delay
        setTimeout(() => {
          setCurrentReminder(remainingReminders[0]);
          setPendingReminders(remainingReminders);
          setReminderPopupVisible(true);
        }, 500);
      } else {
        setCurrentReminder(null);
        setPendingReminders([]);
      }
    } catch (error: any) {
      console.error('Error dismissing reminder:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to dismiss reminder',
      });
    }
  };

  const [newComment, setNewComment] = useState('');
  
  // Story viewer state
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewingMyStories, setViewingMyStories] = useState(false);
  const [currentViewingUserIndex, setCurrentViewingUserIndex] = useState<number>(0);
  
  // Share modal state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<Post | null>(null);

  const handleProfilePress = () => {
    // Navigate to ProfileTab from any screen
    navigation.navigate('ProfileTab');
  };

  const handleAddStory = async () => {
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
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'story.jpg',
        } as any);

        // Upload story
        const response = await uploadStory(formData).unwrap();
        
        if (response.success) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Story uploaded successfully!',
          });
          refetch();
          refetchMyStories();
        }
      }
    } catch (error: any) {
      console.error('Upload story error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error?.data?.message || 'Failed to upload story',
      });
    }
  };

  const stories = storiesData?.stories || [];
  const myStories = myStoriesData?.stories || [];
  const allPosts = postsData?.posts || [];

  // Debug: Log posts data to check isLiked
  if (allPosts.length > 0) {
    console.log('📝 First post isLiked:', allPosts[0]?.isLiked, 'likes:', allPosts[0]?.likes, 'likeCount:', allPosts[0]?.likeCount);
  }

  // Posts to display
  const posts = allPosts;

  const userCandidates = [
    ...allPosts.map(p => p.user).filter(Boolean),
    ...stories.map(s => s.user).filter(Boolean),
    ...myStories.map(m => m.user).filter(Boolean),
  ];
  const suggestedUsers = searchQuery
    ? Array.from(new Map(userCandidates.filter(u => u?._id).map(u => [u._id, u])).values())
        .filter(u => (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  
  // Flatten grouped stories for viewer (feed returns grouped by user)
  const flattenedStories = stories.flatMap(userStory => 
    (userStory.stories || []).map(story => ({
      ...story,
      user: userStory.user
    }))
  );
  
  // Handle myStories - could be grouped or flat
  const flattenedMyStories = myStories.flatMap((item: any) => 
    item.stories ? item.stories.map((story: any) => ({ ...story, user: item.user })) : [item]
  );
  
  // Reverse stories so newest appears last (Instagram style)
  const reversedMyStories = [...flattenedMyStories].reverse();
  const reversedStories = [...flattenedStories].reverse();
  
  // Determine which stories to show in viewer
  let currentStories: any[] = [];
  if (viewingMyStories) {
    currentStories = reversedMyStories;
  } else {
    // For following users, show only the selected user's stories
    const selectedUserStories = stories[currentViewingUserIndex];
    if (selectedUserStories) {
      currentStories = selectedUserStories.stories.map(story => ({
        ...story,
        user: selectedUserStories.user
      }));
    }
  }

  const handleStoryPress = (userIndex: number, isMyStory = false) => {
    if (isMyStory) {
      // For my stories, use flattened format
      setCurrentStoryIndex(0);
      setViewingMyStories(true);
      setCurrentViewingUserIndex(0);
    } else {
      // For following users, set the user index to view their stories
      setCurrentViewingUserIndex(userIndex);
      setCurrentStoryIndex(0);
      setViewingMyStories(false);
    }
    setStoryViewerVisible(true);
  };

  const handleMyStoryPress = () => {
    if (myStories.length > 0) {
      handleStoryPress(0, true);
    }
  };

  const handleCloseStory = () => {
    setStoryViewerVisible(false);
  };

  const handleNextStory = () => {
    if (currentStoryIndex < currentStories.length - 1) {
      // Move to next story of current user
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (!viewingMyStories && currentViewingUserIndex < stories.length - 1) {
      // Move to next user's stories
      setCurrentViewingUserIndex(currentViewingUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // No more stories, close viewer
      handleCloseStory();
    }
  };

  const handleDeleteStory = async () => {
    if (!viewingMyStories || !currentStories[currentStoryIndex]) return;
    
    try {
      const storyId = currentStories[currentStoryIndex]._id;
      await deleteStory(storyId).unwrap();
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Story deleted successfully!',
      });
      
      refetchMyStories();
      
      // Move to next story or close if it was the last one
      if (myStories.length > 1) {
        if (currentStoryIndex >= myStories.length - 1) {
          setCurrentStoryIndex(Math.max(0, currentStoryIndex - 1));
        }
      } else {
        handleCloseStory();
      }
    } catch (error: any) {
      console.error('Delete story error:', error);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: error?.data?.message || 'Failed to delete story',
      });
    }
  };

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    // Send 1 to like, 0 to unlike
    const action = isLiked ? 0 : 1;
    const newIsLiked = action === 1;

    console.log('❤️ Like Action:', { postId, isCurrentlyLiked: isLiked, action, newIsLiked });

    // Optimistic update - update UI immediately
    dispatch(
      postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
        const post = draft.posts?.find((p) => p._id === postId);
        if (post) {
          const currentCount = Number(post.likeCount) || Number(post.likes) || 0;
          post.isLiked = newIsLiked;
          post.likes = newIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
          post.likeCount = post.likes;
        }
      })
    );

    try {
      const result = await likePost({ postId, action }).unwrap();
      console.log('✅ Like result:', result);

      // Update with server response
      dispatch(
        postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
          const post = draft.posts?.find((p) => p._id === postId);
          if (post && result.success) {
            post.isLiked = result.isLiked;
            post.likes = result.likeCount ?? result.likes;
            post.likeCount = result.likeCount ?? result.likes;
          }
        })
      );
    } catch (error: any) {
      console.error('❌ Like error:', error);
      // Revert on error
      dispatch(
        postsApi.util.updateQueryData('getPosts', undefined, (draft) => {
          const post = draft.posts?.find((p) => p._id === postId);
          if (post) {
            const currentCount = Number(post.likeCount) || Number(post.likes) || 0;
            post.isLiked = isLiked; // Revert to original
            post.likes = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
            post.likeCount = post.likes;
          }
        })
      );
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to like post',
      });
    }
  };

  const handleCommentPress = (post: Post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const handleCloseCommentsModal = () => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
    setNewComment('');
  };

  const handleSharePost = (post: Post) => {
    setPostToShare(post);
    setShareModalVisible(true);
  };

  const handleCloseShareModal = () => {
    setShareModalVisible(false);
    setPostToShare(null);
  };

  const handleShareToApp = async () => {
    if (!postToShare) return;
    
    try {
      // Create post link
      const postLink = `${BASE_URL}/post/${postToShare._id}`;
      
      // Share with image URL and post link
      const shareMessage = `Check out this post by ${postToShare.user?.username}!\n\n${postToShare.caption || 'No caption'}\n\nImage: ${postToShare.imageUrl}\n\nView post: ${postLink}`;
      
      const result = await Share.share({
        message: shareMessage,
        url: postToShare.imageUrl,
        title: `Post by ${postToShare.user?.username}`,
      });

      if (result.action === Share.sharedAction) {
        Toast.show({
          type: 'success',
          text1: 'Shared!',
          text2: 'Post shared successfully',
        });
        handleCloseShareModal();
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

  const handleCommentTextChange = (postId: string, text: string) => {
    setCommentTexts(prev => ({ ...prev, [postId]: text }));
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
      const updatedPost = updatedPosts.data?.posts.find(p => p._id === selectedPost._id);
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

  const handleFollowUser = async (userId: string, isFollowing: boolean) => {
    try {
      await toggleFollow({ followUserId: userId }).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      });
      // Refetch posts to update follow status
      await refetchPosts();
    } catch (error: any) {
      console.error('Toggle Follow error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to toggle follow',
      });
    }
  };

   const slideAnim = new Animated.Value(Dimensions.get("window").height);

   const openModal = () => {
    setIsModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsModalVisible(false));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Tab Header */}
      <TabHeader onProfilePress={handleProfilePress} />

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestedUsers.length === 0 ? (
            <View style={styles.suggestionItem}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <Text style={styles.suggestionEmptyText}>No users found</Text>
            </View>
          ) : (
            suggestedUsers.slice(0, 10).map((u: any) => (
              <TouchableOpacity
                key={u._id}
                style={styles.suggestionItem}
                onPress={() => {
                  navigation.navigate('UserInfo', { userId: u._id });
                  setSearchQuery('');
                }}
              >
                <Image
                  source={{ uri: u?.profilePicture ? API_URL + "/" + u.profilePicture : 'https://picsum.photos/150/150?random=' + u._id }}
                  style={styles.suggestionAvatar}
                  resizeMode="cover"
                />
                <Text style={styles.suggestionText}>{u.username}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      
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

      
        {/* Stories Section - Instagram Style */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.storiesContainer}
          contentContainerStyle={styles.storiesContent}
        >
          {/* Your Story - User Profile */}
          {myStories.length > 0 ? (
            <TouchableOpacity 
              onPress={handleMyStoryPress} 
              style={styles.storyItem}
              activeOpacity={0.7}
            >
              <View style={styles.storyGradientBorder}>
                <View style={styles.storyWhiteBorder}>
                  <Image 
                    source={{ uri: API_URL + "/" + (myStories[0]?.stories?.[0]?.image || myStories[0]?.image || user?.profilePicture) }} 
                    style={styles.storyProfileImage}
                    resizeMode="cover" 
                  />
                </View>
                <TouchableOpacity 
                  onPress={handleAddStory} 
                  style={styles.addMoreStoryButton}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Entypo name="plus" size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                Your Story
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={handleAddStory} 
              style={styles.storyItem}
              disabled={isUploading}
              activeOpacity={0.7}
            >
              <View style={styles.yourStoryBorder}>
                <View style={styles.yourStoryInner}>
                  <Image 
                    source={{ uri: user?.profilePicture ? API_URL + "/" + user.profilePicture : 'https://picsum.photos/150/150?random=10' }} 
                    style={styles.storyProfileImage}
                    resizeMode="cover" 
                  />
                  <View style={styles.addStoryPlusButton}>
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Entypo name="plus" size={16} color="#ffffff" />
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {isUploading ? 'Uploading...' : 'Your Story'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Story Items from API */}
          {isLoading ? (
            <View style={styles.storyItem}>
              <ActivityIndicator size="small" color="#8B5CF6" />
            </View>
          ) : (
            stories.map((userStory, index) => (
              <TouchableOpacity 
                key={userStory._id} 
                style={styles.storyItem}
                activeOpacity={0.7}
                onPress={() => handleStoryPress(index)}
              >
                <View style={styles.storyGradientBorder}>
                  <View style={styles.storyWhiteBorder}>
                    <Image 
                      source={{ uri: API_URL + "/" + userStory.stories[0]?.image }} 
                      style={styles.storyProfileImage}
                      resizeMode="cover" 
                    />
                  </View>
                </View>
                <Text style={styles.storyName} numberOfLines={1}>
                  {userStory.user?.username}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Posts Feed */}
         <View style={styles.feedContainer}>
          {postsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={{ color: '#6B7280', fontSize: 16, marginTop: 10, fontWeight: 'bold' }}>
                No posts yet
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <PostItemWithFollowStatus 
                key={post._id} 
                post={post} 
                user={user}
                navigation={navigation}
                handleFollowUser={handleFollowUser}
                handleCommentPress={handleCommentPress}
                handleSharePost={handleSharePost}
                handleLikePost={handleLikePost}
                isTogglingFollow={isTogglingFollow}
              />
            ))
          )}
        </View> 
   
     
      </ScrollView>

      {/* Story Viewer Modal - Instagram Style */}
      <Modal
        visible={storyViewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseStory}
      >
        <SafeAreaView style={styles.storyViewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          {currentStories.length > 0 && currentStories[currentStoryIndex] && (
            <>
              {/* Story Header */}
              <View style={styles.storyHeader}>
                {/* Progress Bars */}
                <View style={styles.progressBarsContainer}>
                  {currentStories.map((_, index) => (
                    <View key={index} style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill,
                          { width: index === currentStoryIndex ? '100%' : index < currentStoryIndex ? '100%' : '0%' }
                        ]} 
                      />
                    </View>
                  ))}
                </View>

                {/* User Info */}
                <View style={styles.storyUserInfo}>
                  <View style={styles.storyUserLeft}>
                    <Image 
                      source={{ uri: API_URL + "/" + (currentStories[currentStoryIndex].user?.profilePicture || currentStories[currentStoryIndex].user?.profilePictureUrl) }} 
                      style={styles.storyUserAvatar}
                      resizeMode="cover" 
                    />
                    <Text style={styles.storyUsername}>
                      {viewingMyStories ? 'Your Story' : currentStories[currentStoryIndex].user?.username}
                    </Text>
                    <Text style={styles.storyTime}>
                      {new Date(currentStories[currentStoryIndex].createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.storyHeaderRight}>
                    {viewingMyStories && (
                      <TouchableOpacity 
                        onPress={handleDeleteStory} 
                        style={styles.deleteButton}
                        disabled={isDeletingStory}
                      >
                        {isDeletingStory ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Ionicons name="trash-outline" size={24} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleCloseStory} style={styles.closeButton}>
                      <Ionicons name="close" size={28} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Story Image */}
              <Pressable 
                style={styles.storyImageContainer}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  if (locationX < width / 2) {
                    handlePreviousStory();
                  } else {
                    handleNextStory();
                  }
                }}
              >
                <Image 
                  source={{ uri: API_URL + "/" + currentStories[currentStoryIndex].image }} 
                  style={styles.storyFullImage}
                  resizeMode="contain" 
                />
              </Pressable>

              {/* Story Info Footer - Instagram Style */}
              {viewingMyStories && (
                <View style={styles.storyFooter}>
                  <View style={styles.storyViewsContainer}>
                    <Ionicons name="eye-outline" size={20} color="#ffffff" />
                    <Text style={styles.storyViewsText}>
                      {currentStories[currentStoryIndex].views?.length || 0} views
                    </Text>
                  </View>
                </View>
              )}

              {/* Navigation Hints */}
              <View style={styles.storyNavigationHints}>
                <View style={styles.leftHint} />
                <View style={styles.rightHint} />
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
     
     {/* Instagram-Style Comments Modal */}
     <Modal
        visible={commentsModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleCloseCommentsModal}
      >
        <SafeAreaView style={styles.commentsModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          
          {/* Header */}
          <View style={styles.commentsHeader}>
            <TouchableOpacity onPress={handleCloseCommentsModal} style={styles.commentsBackButton}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.commentsHeaderTitle}>Comments</Text>
            <View style={{ width: 24 }} />
          </View>

         {/* Comments List */}
          <ScrollView 
            style={styles.commentsListContainer}
            contentContainerStyle={styles.commentsListContent}
          >
            {selectedPost?.comments && selectedPost.comments.filter((comment: any) => Boolean(comment)).length > 0 ? (
              selectedPost.comments
                .filter((comment: any) => Boolean(comment))
                .map((comment: any) => {
                  const profilePath = comment?.profilePicture;
                  const avatarUri = profilePath
                    ? `${API_URL}/${profilePath}`
                    : `https://picsum.photos/150/150?random=${comment?._id || 'temp'}`;

                  return (
                  <View key={comment?._id || Math.random().toString()} style={styles.commentItemContainer}>
                    <Image 
                      source={{ uri: avatarUri }} 
                      style={styles.commentAvatar}
                      resizeMode="cover" 
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUsername}>{comment?.username || 'User'}</Text>
                        {comment?.createdAt && (
                          <Text style={styles.commentTime}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.commentText}>{comment?.comment || ''}</Text>
                    </View>
                  </View>
                )})
            ) : (
              <View style={styles.noCommentsContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment</Text>
              </View>
            )}
          </ScrollView>

          {/* Add Comment Input - Instagram Style */}
          <View style={styles.addCommentContainer}>
            <Image 
              source={{ uri: user?.profilePicture ? API_URL + "/" + user.profilePicture : 'https://picsum.photos/150/150?random=user' }} 
              style={styles.addCommentAvatar}
              resizeMode="cover" 
            />
            <TextInput
              style={styles.addCommentInput}
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
              style={styles.postCommentButton}
            >
              {isCommenting ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Text style={[
                  styles.postCommentText,
                  { opacity: newComment.trim() ? 1 : 0.3 }
                ]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

     {/* Instagram-Style Share Modal */}
     <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseShareModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseShareModal}>
          <View style={styles.shareModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.shareModalContainer}>
                {/* Header */}
                <View style={styles.shareModalHeader}>
                  <Text style={styles.shareModalTitle}>Share Post</Text>
                  <TouchableOpacity onPress={handleCloseShareModal}>
                    <Ionicons name="close" size={24} color="#000000" />
                  </TouchableOpacity>
                </View>

                {/* Post Preview */}
                {postToShare && (
                  <View style={styles.sharePostPreview}>
                    <Image 
                      source={{ uri: API_URL + "/" + postToShare.image }} 
                      style={styles.sharePostImage}
                      resizeMode="cover" 
                    />
                    <View style={styles.sharePostInfo}>
                      <View style={styles.sharePostHeader}>
                        <Image 
                          source={{ uri: postToShare.user?.profilePicture ? API_URL + "/" + postToShare.user.profilePicture : 'https://picsum.photos/150/150?random=10' }} 
                          style={styles.sharePostAvatar}
                          resizeMode="cover" 
                        />
                        <Text style={styles.sharePostUsername}>{postToShare.user?.username}</Text>
                      </View>
                      <Text style={styles.sharePostCaption} numberOfLines={3}>
                        {postToShare.caption || 'No caption'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Share Options */}
                <View style={styles.shareOptionsContainer}>
                  <TouchableOpacity 
                    style={styles.shareOptionButton}
                    onPress={handleShareToApp}
                  >
                    <View style={styles.shareOptionIcon}>
                      <Ionicons name="share-outline" size={24} color="#8B5CF6" />
                    </View>
                    <Text style={styles.shareOptionText}>Share to...</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.shareOptionButton}
                    onPress={() => {
                      if (postToShare?.imageUrl) {
                        // Copy image URL to clipboard (you can add Clipboard API)
                        Toast.show({
                          type: 'info',
                          text1: 'Image URL',
                          text2: postToShare.imageUrl,
                        });
                      }
                    }}
                  >
                    <View style={styles.shareOptionIcon}>
                      <Ionicons name="link-outline" size={24} color="#8B5CF6" />
                    </View>
                    <Text style={styles.shareOptionText}>Copy Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

     {/* comments modal*/}
     <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.modalTitle}>Comments</Text>

          <FlatList
            data={selectedComments}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Text style={styles.commentUser}>{item.username || 'User'}</Text>
                <Text style={styles.commentText}>{item.comment || item.text}</Text>
                <Text style={styles.commentTime}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            )}
          />

          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
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
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 15,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginHorizontal: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: 'bold',
  },
  suggestionEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storiesContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storiesContent: {
    paddingHorizontal: 15,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  // Your Story (without gradient)
  yourStoryBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#ffffff',
  },
  yourStoryInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
    position: 'relative',
  },
  addStoryPlusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  addMoreStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  // Story with gradient border (Instagram style)
  storyGradientBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  storyWhiteBorder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyProfileImage: {
    width: '100%',
    height: '100%',
  },
  storyName: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  feedContainer: {
    paddingHorizontal: 15,
  },
  postCard: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  postProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileEmoji: {
    fontSize: 20,
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  postImageContainer: {
    width: '100%',
    height: 250,
  },
  postImagePlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  postImageEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  postImageText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  postContent: {
    padding: 15,
  },
  postCaption: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  postEngagement: {
    marginBottom: 15,
  },
  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  commentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 4,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
    maxHeight: 100,
  },
  submitCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Story Viewer Styles
  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  storyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 10,
    paddingHorizontal: 15,
  },
  progressBarsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 15,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  storyUsername: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  storyTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  storyFullImage: {
    width: width,
    height: '100%',
  },
  storyNavigationHints: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  leftHint: {
    flex: 1,
  },
  rightHint: {
    flex: 1,
  },
  storyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  storyViewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  storyViewsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Comments Modal Styles - Instagram Style
  commentsModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  commentsBackButton: {
    padding: 5,
  },
  commentsHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  postPreviewContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  postPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postPreviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postPreviewTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  postPreviewUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  postPreviewCaption: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  commentsListContainer: {
    flex: 1,
  },
  commentsListContent: {
    paddingVertical: 10,
  },
  commentItemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  noCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: 'bold',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  addCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  addCommentInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 14,
    color: '#000000',
    maxHeight: 100,
  },
  postCommentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postCommentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  // Share Modal Styles - Instagram Style
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  sharePostPreview: {
    padding: 15,
  },
  sharePostImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
  },
  sharePostInfo: {
    gap: 8,
  },
  sharePostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sharePostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sharePostUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  sharePostCaption: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontWeight: 'bold',
  },
  shareOptionsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 10,
  },
  shareOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 15,
  },
  shareOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  //  viewCommentsText: {
  //   color: "#555",
  //   fontSize: 14,
  //   marginTop: 4,
  // },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 10,
    paddingHorizontal: 15,
    maxHeight: Dimensions.get("window").height * 0.75,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  commentItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 10,
  },
  commentUser: {
    fontWeight: "bold",
    fontSize: 14,
  },
  commentText: {
    color: "#333",
    fontSize: 14,
    marginTop: 2,
    fontWeight: 'bold',
  },
  commentTime: {
    color: "#999",
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
 
  closeText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  postHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  followButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  followingButton: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: '#6B7280',
    fontWeight: 'bold',
  },
  pendingRequestButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingRequestButtonText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: 'bold',
  },
});



