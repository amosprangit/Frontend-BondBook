import React, { useState } from 'react';
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
  useWindowDimensions,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import {
  useGetMutualConnectionByIdQuery,
  useGetMutualConnectionPostsQuery,
  useCreateMutualConnectionPostMutation,
  useUpdateMutualConnectionProfileMutation,
  useUploadMutualConnectionProfilePictureMutation,
} from '../store/api/mutualConnectionsApi';
import { API_URL } from '@env';
import { useAppSelector } from '../store/hooks';

export default function MutualConnectionProfileScreen({ route, navigation }: { route: any; navigation: any }) {
  const { mutualConnectionId, displayName, connectionId } = route.params || {};
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);

  const { width } = useWindowDimensions();
  const isCompactLayout = width < 380;
  // Calculate grid tile size: (screen width - horizontal padding - gaps between items) / 3
  // 40px total horizontal padding (20px each side), 4px gap between items (2 gaps for 3 items)
  const gridGap = 2;
  const horizontalPadding = 40;
  const gridTileSize = Math.floor((width - horizontalPadding - (gridGap * 2)) / 3);

  const { data: connectionData, isLoading, refetch } = useGetMutualConnectionByIdQuery(mutualConnectionId, {
    skip: !mutualConnectionId,
  });

  const {
    data: postsData,
    isLoading: isLoadingPosts,
    isFetching: isFetchingPosts,
    refetch: refetchPosts,
  } = useGetMutualConnectionPostsQuery(
    { mutualConnectionId, page: 1, limit: 12 },
    { skip: !mutualConnectionId }
  );

  const [createMutualPost, { isLoading: isCreatingMutualPost }] = useCreateMutualConnectionPostMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateMutualConnectionProfileMutation();
  const [uploadProfilePicture, { isLoading: isUploadingPicture }] = useUploadMutualConnectionProfilePictureMutation();

  // Edit modal states
  const [isEditBioModalVisible, setIsEditBioModalVisible] = useState(false);
  const [editingBio, setEditingBio] = useState('');

  const connection = connectionData?.mutualConnection;
  const connectionPosts = postsData?.posts || [];

  // Check if current user is part of this connection
  const isPartOfConnection = connection?.users?.some(
    (user: any) => user._id === currentUser?._id
  ) || false;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const tasks = [refetch()];
      if (mutualConnectionId) {
        tasks.push(refetchPosts());
      }
      await Promise.all(tasks);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchPosts, mutualConnectionId]);

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profilePicture = connection?.profilePicture
    ? `${API_URL}/${connection.profilePicture.replace(/^\//, '')}?v=${imageVersion}&t=${connection.updatedAt || Date.now()}`
    : 'https://picsum.photos/150/150?random=10';
  const postsCount = connection?.postsCount ?? postsData?.pagination?.total ?? connectionPosts.length ?? 0;
  const followersCount = connection?.followersCount || 0;
  const followingCount = connection?.followingCount || 0;
  const bioText = connection?.bio || 'No bio yet';

  const users = connection?.users || [];
  const user1 = users[0];
  const user2 = users[1];

  const handleEditProfilePicture = async () => {
    if (!mutualConnectionId) {
      Toast.show({
        type: 'error',
        text1: 'Unavailable',
        text2: 'Mutual connection not found',
      });
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission denied',
          text2: 'Please allow photo access to update profile picture.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Toast.show({
          type: 'error',
          text1: 'Invalid file',
          text2: 'Unable to read selected image.',
        });
        return;
      }

      const formData = new FormData();
      const fileName = asset.fileName || `mutual-profile-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any);

      await uploadProfilePicture({ mutualConnectionId, formData }).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile picture updated successfully!',
      });

      // Force image reload by updating version and refetching data
      setImageVersion(prev => prev + 1);
      await refetch();
    } catch (error: any) {
      console.error('Update profile picture error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update picture',
        text2: error?.data?.message || 'Please try again later.',
      });
    }
  };

  const handleEditBio = () => {
    setEditingBio(connection?.bio || '');
    setIsEditBioModalVisible(true);
  };

  const handleSaveBio = async () => {
    if (!mutualConnectionId) {
      Toast.show({
        type: 'error',
        text1: 'Unavailable',
        text2: 'Mutual connection not found',
      });
      return;
    }

    try {
      await updateProfile({
        mutualConnectionId,
        data: { bio: editingBio.trim() },
      }).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Bio updated successfully!',
      });

      setIsEditBioModalVisible(false);
      refetch();
    } catch (error: any) {
      console.error('Update bio error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update bio',
        text2: error?.data?.message || 'Please try again later.',
      });
    }
  };

  const handleCreateMutualPost = async () => {
    if (!mutualConnectionId) {
      Toast.show({
        type: 'error',
        text1: 'Unavailable',
        text2: 'Mutual connection not found',
      });
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission denied',
          text2: 'Please allow photo access to share a post.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Toast.show({
          type: 'error',
          text1: 'Invalid file',
          text2: 'Unable to read selected media.',
        });
        return;
      }

      const formData = new FormData();
      const isVideo = asset.type === 'video';
      const fileName = asset.fileName || `mutual-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');

      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any);

      formData.append('caption', `Shared on ${connection?.displayName || 'our mutual connection'}`);

      await createMutualPost({ mutualConnectionId, data: formData }).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Post shared',
        text2: 'Your mutual connection post is live.',
      });

      if (mutualConnectionId) {
        refetchPosts();
      }
      refetch();
    } catch (error: any) {
      console.error('Create mutual connection post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to create post',
        text2: error?.data?.message || 'Please try again later.',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mutual Connection</Text>
        <View style={styles.headerButton} />
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
        <View style={[styles.profileStatsSection, isCompactLayout && styles.profileStatsSectionCompact]}>
          <View style={[styles.profileHeader, isCompactLayout && styles.profileHeaderCompact]}>
            <View style={[styles.profilePictureContainer, isCompactLayout && styles.profilePictureContainerCompact]}>
              <View style={styles.profilePictureBorder}>
                <Image
                  key={`profile-${imageVersion}`}
                  source={{ uri: profilePicture }}
                  style={styles.fullProfileImage}
                  resizeMode="cover"
                />
              </View>
              {isPartOfConnection && (
                <TouchableOpacity
                  style={styles.editProfilePictureButton}
                  onPress={handleEditProfilePicture}
                  disabled={isUploadingPicture}
                >
                  {isUploadingPicture ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.profileDetails, isCompactLayout && styles.profileDetailsCompact]}>
              <View style={[styles.usernameRow, isCompactLayout && styles.usernameRowCompact]}>
                <Text style={[styles.username, isCompactLayout && styles.usernameCompact]}>{connection?.displayName || displayName}</Text>
              </View>

              <View style={[styles.statsRow, isCompactLayout && styles.statsRowCompact]}>
                <View style={[styles.statColumn, isCompactLayout && styles.statColumnCompact]}>
                  <Text style={styles.statNumber}>{postsCount}</Text>
                  <Text style={styles.statLabel}>{postsCount === 1 ? 'post' : 'posts'}</Text>
                </View>
                <View style={[styles.statColumn, isCompactLayout && styles.statColumnCompact]}>
                  <Text style={styles.statNumber}>{followersCount}</Text>
                  <Text style={styles.statLabel}>followers</Text>
                </View>
                <View style={[styles.statColumn, isCompactLayout && styles.statColumnCompact]}>
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>following</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.bioSection, isCompactLayout && styles.bioSectionCompact]}>
            <View style={styles.bioRow}>
              <Text style={[styles.bioText, isCompactLayout && styles.bioTextCompact]}>{bioText}</Text>
              {isPartOfConnection && (
                <TouchableOpacity
                  style={styles.editBioButton}
                  onPress={handleEditBio}
                >
                  <Ionicons name="create-outline" size={18} color="#8B5CF6" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Users Section temporarily disabled */}
        {false && (
          <View style={styles.usersSection}>
            <Text style={styles.sectionTitle}>Connection Members</Text>
            {users.map((user, index) => (
              <View key={user._id} style={styles.userItem}>
                <Image
                  source={{ uri: user.profilePicture ? API_URL + "/" + user.profilePicture.replace(/^\//, '') : 'https://picsum.photos/150/150?random=' + (index + 1) }}
                  style={styles.userAvatar}
                  resizeMode="cover"
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userUsername}>{user.username}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChatScreen', {
              mutualConnectionId: connection?._id,
              displayName: connection?.displayName,
              connectionId: connection?.connectionId,
            })}
          >
            <Ionicons name="chatbubbles" size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              (isCreatingMutualPost || !mutualConnectionId) && styles.actionButtonDisabled,
            ]}
            onPress={handleCreateMutualPost}
            disabled={isCreatingMutualPost || !mutualConnectionId}
          >
            {isCreatingMutualPost ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>Create Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <View style={styles.postsHeader}>
            <Text style={styles.sectionTitle}>Posts</Text>
            {(isLoadingPosts || isFetchingPosts) && (
              <ActivityIndicator size="small" color="#8B5CF6" />
            )}
          </View>
          {isLoadingPosts ? (
            <View style={styles.postsLoadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.postsLoadingText}>Loading posts...</Text>
            </View>
          ) : connectionPosts.length === 0 ? (
            <View style={styles.emptyPostsContainer}>
              <Ionicons name="images-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Create your first post together!</Text>
            </View>
          ) : (
            <View style={styles.gridWrapper}>
              {connectionPosts.map((post, index) => {
                const mediaUri = post.image
                  ? `${API_URL}/${post.image}`
                  : post.video
                    ? `${API_URL}/${post.video}`
                    : null;
                const isVideo = Boolean(post.video && !post.image);
                
                // Calculate margin: right margin for items not at the end of row, bottom margin for all
                const isLastInRow = (index + 1) % 3 === 0;
                const marginRight = isLastInRow ? 0 : gridGap;

                return (
                  <TouchableOpacity
                    key={post._id}
                    style={[
                      styles.gridImage,
                      { 
                        width: gridTileSize, 
                        height: gridTileSize,
                        marginRight: marginRight,
                        marginBottom: gridGap,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {mediaUri ? (
                      <>
                        <Image
                          source={{ uri: mediaUri }}
                          style={styles.gridImageContent}
                          resizeMode="cover"
                        />
                        {isVideo && (
                          <View style={styles.videoBadge}>
                            <Ionicons name="play" size={14} color="#ffffff" />
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.postPlaceholder}>
                        <Ionicons name="image" size={22} color="#9CA3AF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Bio Modal */}
      <Modal
        visible={isEditBioModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditBioModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Bio</Text>
              <TouchableOpacity
                onPress={() => setIsEditBioModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.bioInput}
              placeholder="Write a bio..."
              placeholderTextColor="#9CA3AF"
              value={editingBio}
              onChangeText={setEditingBio}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.bioInputLength}>{editingBio.length}/200</Text>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                (isUpdatingProfile || !editingBio.trim()) && styles.modalSaveButtonDisabled,
              ]}
              onPress={handleSaveBio}
              disabled={isUpdatingProfile || !editingBio.trim()}
            >
              {isUpdatingProfile ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSaveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileStatsSection: {
    paddingVertical: 20,
  },
  profileStatsSectionCompact: {
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  profilePictureContainer: {
    marginBottom: 0,
    position: 'relative',
  },
  profilePictureContainerCompact: {
    marginBottom: 16,
  },
  profilePictureBorder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePicture: {
    width: 106,
    height: 106,
    borderRadius: 53,
    overflow: 'hidden',
  },
  fullProfileImage: {
    width: 106,
    height: 106,
    borderRadius: 53,
  },
  profileDetails: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 10,
  },
  profileDetailsCompact: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  profilePictureLeft: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePictureRight: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  halfProfileImage: {
    width: '100%',
    height: '100%',
  },
  usernameRow: {
    width: '100%',
  },
  usernameRowCompact: {
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'right',
  },
  usernameCompact: {
    textAlign: 'center',
  },
  bioSection: {
    width: '100%',
    marginTop: 16,
    alignItems: 'flex-start',
  },
  bioSectionCompact: {
    alignItems: 'flex-start',
  },
  bioText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  bioTextCompact: {
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 16,
  },
  statsRowCompact: {
    justifyContent: 'space-between',
  },
  statColumn: {
    alignItems: 'flex-end',
  },
  statColumnCompact: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  usersSection: {
    marginVertical: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 10,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postsSection: {
    marginBottom: 30,
  },
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  postsLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  postsLoadingText: {
    marginTop: 10,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  emptyPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: 'bold',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridImage: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  gridImageContent: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfilePictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  editBioButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 4,
  },
  bioInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  bioInputLength: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 20,
  },
  modalSaveButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

