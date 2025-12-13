/**
 * DEBUG HELPER - Testing New Follow Request API
 * 
 * Is file ko temporary use karo testing ke liye
 * Production mein delete kar dena
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useGetPostsQuery } from '../store/api/postsApi';
import { useCheckFollowRequestByPostQuery } from '../store/api/authApi';

export default function DebugFollowRequestAPI() {
  const { data: postsData, isLoading: postsLoading } = useGetPostsQuery();
  
  if (postsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.text}>Loading posts...</Text>
      </View>
    );
  }

  const posts = postsData?.posts || [];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Debug: Follow Request API Testing</Text>
      <Text style={styles.subtitle}>Total Posts: {posts.length}</Text>
      
      {posts.slice(0, 5).map((post, index) => (
        <DebugPostItem key={post._id} post={post} index={index} />
      ))}
    </ScrollView>
  );
}

function DebugPostItem({ post, index }: { post: any; index: number }) {
  const { data, isLoading, error } = useCheckFollowRequestByPostQuery(post._id);

  useEffect(() => {
    if (data) {
      console.log(`\n📊 POST ${index + 1} - ${post.user?.username}:`);
      console.log('Post ID:', post._id);
      console.log('Follow Status:', data);
      console.log('---');
    }
    if (error) {
      console.error(`❌ ERROR for POST ${index + 1}:`, error);
    }
  }, [data, error, index, post]);

  return (
    <View style={styles.postItem}>
      <Text style={styles.postTitle}>Post {index + 1}: {post.user?.username}</Text>
      <Text style={styles.postId}>ID: {post._id}</Text>
      
      {isLoading && (
        <Text style={styles.loading}>⏳ Loading status...</Text>
      )}
      
      {error && (
        <Text style={styles.error}>
          ❌ Error: {JSON.stringify(error, null, 2)}
        </Text>
      )}
      
      {data && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>✅ API Response:</Text>
          
          <View style={styles.dataRow}>
            <Text style={styles.label}>Success:</Text>
            <Text style={styles.value}>{data.success ? '✓' : '✗'}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.label}>Is Own Post:</Text>
            <Text style={[styles.value, data.isOwnPost && styles.highlight]}>
              {data.isOwnPost ? '✓ YES' : '✗ NO'}
            </Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.label}>Is Following:</Text>
            <Text style={[styles.value, data.isFollowing && styles.highlight]}>
              {data.isFollowing ? '✓ YES' : '✗ NO'}
            </Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.label}>Has Pending Request:</Text>
            <Text style={[styles.value, data.hasPendingRequest && styles.highlight]}>
              {data.hasPendingRequest ? '⏳ YES' : '✗ NO'}
            </Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, styles.statusBadge, styles[`status_${data.status}`]]}>
              {data.status?.toUpperCase()}
            </Text>
          </View>
          
          {data.postOwnerId && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>Owner ID:</Text>
              <Text style={[styles.value, styles.small]}>
                {data.postOwnerId.substring(0, 8)}...
              </Text>
            </View>
          )}
          
          {data.requestId && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>Request ID:</Text>
              <Text style={[styles.value, styles.small]}>
                {data.requestId.substring(0, 8)}...
              </Text>
            </View>
          )}

          {/* Recommended Button State */}
          <View style={styles.recommendation}>
            <Text style={styles.recommendLabel}>🎯 Button to Show:</Text>
            {data.isOwnPost ? (
              <Text style={styles.recommendValue}>❌ HIDE (Own Post)</Text>
            ) : data.hasPendingRequest ? (
              <Text style={[styles.recommendValue, styles.pendingButton]}>
                ⏳ REQUEST PENDING (Disabled)
              </Text>
            ) : data.isFollowing ? (
              <Text style={[styles.recommendValue, styles.followingButton]}>
                ✓ FOLLOWING
              </Text>
            ) : (
              <Text style={[styles.recommendValue, styles.followButton]}>
                ➕ FOLLOW
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 10,
  },
  postItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  postId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  loading: {
    fontSize: 14,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 6,
    fontFamily: 'monospace',
  },
  dataContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  highlight: {
    color: '#8B5CF6',
  },
  small: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  status_own_post: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
  },
  status_none: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  status_pending: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  status_following: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  recommendation: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#8B5CF6',
  },
  recommendLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
  },
  recommendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 10,
    borderRadius: 6,
    textAlign: 'center',
  },
  followButton: {
    backgroundColor: '#8B5CF6',
    color: '#ffffff',
  },
  followingButton: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
  },
  pendingButton: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
});

