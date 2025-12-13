/**
 * EXAMPLE: How to integrate useCheckFollowRequestByPostQuery in home.tsx
 * 
 * Yeh file sirf example hai - actual home.tsx mein integrate karne ke liye
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useCheckFollowRequestByPostQuery } from '../store/api/authApi';

// ============================================
// METHOD 1: Individual Post Component with API Check
// ============================================
interface PostWithFollowCheckProps {
  post: any;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
}

function PostWithFollowCheck({ post, onFollow, onUnfollow }: PostWithFollowCheckProps) {
  // ✅ Use new API to check follow status by postId
  const { data: followStatus, isLoading } = useCheckFollowRequestByPostQuery(post._id, {
    skip: !post._id, // Skip if no postId
  });

  const renderFollowButton = () => {
    if (isLoading) {
      return <Text>Loading...</Text>;
    }

    // Don't show button for own posts
    if (followStatus?.isOwnPost) {
      return null;
    }

    // Show "Request Pending" if follow request is pending
    if (followStatus?.hasPendingRequest) {
      return (
        <View style={styles.pendingRequestButton}>
          <Text style={styles.pendingRequestButtonText}>Request Pending</Text>
        </View>
      );
    }

    // Show "Following" if already following
    if (followStatus?.isFollowing) {
      return (
        <TouchableOpacity 
          style={styles.followingButton}
          onPress={() => followStatus.postOwnerId && onUnfollow(followStatus.postOwnerId)}
        >
          <Text style={styles.followingButtonText}>Following</Text>
        </TouchableOpacity>
      );
    }

    // Show "Follow" button
    return (
      <TouchableOpacity 
        style={styles.followButton}
        onPress={() => followStatus?.postOwnerId && onFollow(followStatus.postOwnerId)}
      >
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: post.user?.profilePicture }} 
          style={styles.profileImage}
        />
        <Text style={styles.username}>{post.user?.username}</Text>
        {renderFollowButton()}
      </View>
      <Image source={{ uri: post.image }} style={styles.postImage} />
      <Text style={styles.caption}>{post.caption}</Text>
    </View>
  );
}

// ============================================
// METHOD 2: Inline Usage in Existing Post Component
// ============================================
function ExistingPostComponent({ post }: { post: any }) {
  // Add this hook to existing component
  const { data: followStatus } = useCheckFollowRequestByPostQuery(post._id);

  return (
    <View style={styles.postCard}>
      {/* Your existing post header */}
      <View style={styles.postHeader}>
        <Text>{post.user?.username}</Text>
        
        {/* Replace existing follow button logic with this: */}
        {!followStatus?.isOwnPost && (
          followStatus?.hasPendingRequest ? (
            <View style={styles.pendingRequestButton}>
              <Text style={styles.pendingRequestButtonText}>Request Pending</Text>
            </View>
          ) : followStatus?.isFollowing ? (
            <TouchableOpacity style={styles.followingButton}>
              <Text style={styles.followingButtonText}>Following</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      
      {/* Your existing post content */}
    </View>
  );
}

// ============================================
// METHOD 3: Conditional Check Before API Call
// ============================================
function SmartPostComponent({ post, currentUserId }: { post: any; currentUserId: string }) {
  // Only call API if post is not from current user
  const shouldCheckStatus = post.user?._id !== currentUserId;
  
  const { data: followStatus } = useCheckFollowRequestByPostQuery(post._id, {
    skip: !shouldCheckStatus, // Skip API call for own posts
  });

  if (!shouldCheckStatus) {
    // Own post - no follow button
    return (
      <View style={styles.postCard}>
        <Text>Your Post</Text>
        {/* Rest of post content */}
      </View>
    );
  }

  return (
    <View style={styles.postCard}>
      {/* Show follow button based on API response */}
      {followStatus?.hasPendingRequest && (
        <Text>Request Pending ⏳</Text>
      )}
      {followStatus?.isFollowing && (
        <Text>Following ✓</Text>
      )}
      {!followStatus?.hasPendingRequest && !followStatus?.isFollowing && (
        <TouchableOpacity>
          <Text>Follow</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// METHOD 4: Integration with Existing handleFollowUser
// ============================================
function IntegratedPostComponent({ post }: { post: any }) {
  const { data: followStatus, refetch } = useCheckFollowRequestByPostQuery(post._id);
  
  const handleFollowUser = async (userId: string) => {
    // Check from API instead of props
    if (followStatus?.hasPendingRequest) {
      console.log('Request already pending');
      return;
    }

    try {
      // Your existing toggleFollow API call
      // await toggleFollow({ followUserId: userId });
      
      // Refetch status after action
      await refetch();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <View style={styles.postCard}>
      <TouchableOpacity 
        onPress={() => followStatus?.postOwnerId && handleFollowUser(followStatus.postOwnerId)}
        disabled={followStatus?.hasPendingRequest}
      >
        <Text>
          {followStatus?.hasPendingRequest ? 'Request Pending' : 
           followStatus?.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// METHOD 5: Bulk Check with Multiple Posts
// ============================================
function PostListWithFollowCheck({ posts }: { posts: any[] }) {
  return (
    <View>
      {posts.map((post) => (
        <SinglePostWithCheck key={post._id} post={post} />
      ))}
    </View>
  );
}

function SinglePostWithCheck({ post }: { post: any }) {
  // Each post will check its own follow status
  const { data: followStatus } = useCheckFollowRequestByPostQuery(post._id);
  
  return (
    <View style={styles.postCard}>
      <Text>{post.user?.username}</Text>
      <StatusBadge followStatus={followStatus} />
    </View>
  );
}

function StatusBadge({ followStatus }: { followStatus: any }) {
  if (!followStatus) return null;
  
  if (followStatus.isOwnPost) {
    return <Text style={styles.badge}>Your Post</Text>;
  }
  
  if (followStatus.hasPendingRequest) {
    return <Text style={styles.badge}>⏳ Pending</Text>;
  }
  
  if (followStatus.isFollowing) {
    return <Text style={styles.badge}>✓ Following</Text>;
  }
  
  return <Text style={styles.badge}>Not Following</Text>;
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    borderRadius: 8,
    padding: 15,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  followButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  followingButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followingButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pendingRequestButton: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingRequestButtonText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginVertical: 10,
  },
  caption: {
    fontSize: 14,
    color: '#374151',
  },
  badge: {
    fontSize: 12,
    padding: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
});

export default PostWithFollowCheck;

