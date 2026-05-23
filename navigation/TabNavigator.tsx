// In CameraScreen.tsx - remove the useFocusEffect tab bar hiding code
// Keep only essential camera functionality

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useCreatePostMutation } from '../store/api/postsApi';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../store/hooks';
import { SafeAreaView } from 'react-native-safe-area-context'; 

const { width, height } = Dimensions.get('window');

interface Filter {
  id: string;
  name: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export default function CameraScreen({ navigation }: any) {
  const { user } = useAppSelector((state) => state.auth);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

  // Publish modal state
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();

  // Gallery selection state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaLibrary.Asset[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const filters: Filter[] = [
    { id: 'normal', name: 'Normal', value: 'none', icon: 'camera-alt' },
    { id: 'sepia', name: 'Sepia', value: 'sepia(1)', icon: 'wb-sunny' },
    { id: 'grayscale', name: 'B&W', value: 'grayscale(1)', icon: 'tonality' },
    { id: 'vintage', name: 'Vintage', value: 'contrast(1.2) brightness(1.1) saturate(0.9)', icon: 'history' },
    { id: 'cool', name: 'Cool', value: 'brightness(1.05) saturate(1.05) hue-rotate(-10deg)', icon: 'ac-unit' },
    { id: 'warm', name: 'Warm', value: 'sepia(0.3) saturate(1.2) brightness(1.05)', icon: 'wb-incandescent' },
  ];

  useEffect(() => {
    requestPermissions();
    loadRecentImages();
  }, []);

  const requestPermissions = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    if (!mediaLibraryPermission?.granted) {
      await requestMediaLibraryPermission();
    }
  };

  const loadRecentImages = async () => {
    if (mediaLibraryPermission?.granted) {
      try {
        const media = await MediaLibrary.getAssetsAsync({
          first: 10,
          sortBy: ['creationTime'],
          mediaType: ['photo'],
        });
        setGalleryImages(media.assets);
      } catch (error) {
        console.error('Error loading gallery:', error);
      }
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
        });

        if (photo?.uri) {
          setCapturedImages(prev => [photo.uri, ...prev.slice(0, 4)]);

          if (mediaLibraryPermission?.granted) {
            try {
              await MediaLibrary.saveToLibraryAsync(photo.uri);
              await loadRecentImages();
            } catch (saveError) {
              console.warn('Failed to save to media library:', saveError);
            }
          }

          setSelectedImage(photo.uri);
          setPublishModalVisible(true);
        } else {
          Alert.alert('Error', 'Failed to capture image. Please try again.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Error taking picture:', error);
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Please allow access to your photos',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setPublishModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image',
      });
    }
  };

  const handlePublish = async () => {
    if (!selectedImage) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No image selected',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: `post_${Date.now()}.jpg`,
      } as any);

      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      const response = await createPost(formData).unwrap();

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Shared',
          text2: 'Your post has been shared!',
        });

        setPublishModalVisible(false);
        setSelectedImage(null);
        setCaption('');
        navigation.navigate('HomeTab');
      }
    } catch (error: any) {
      console.error('Publish post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || error?.message || 'Failed to share post',
      });
    }
  };

  const handleClosePublishModal = () => {
    setPublishModalVisible(false);
    setSelectedImage(null);
    setCaption('');
  };

  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
    setIsCameraReady(false);
    setTimeout(() => {
      setIsCameraReady(true);
    }, 500);
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return 'flash-on';
      case 'auto': return 'flash-auto';
      default: return 'flash-off';
    }
  };

  const openFullGallery = async () => {
    setShowGallery(true);
    setLoadingGallery(true);
    try {
      const media = await MediaLibrary.getAssetsAsync({
        first: 50,
        sortBy: ['creationTime'],
        mediaType: ['photo'],
      });
      setGalleryImages(media.assets);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoadingGallery(false);
    }
  };

  const selectFromGallery = (asset: MediaLibrary.Asset) => {
    setSelectedImage(asset.uri);
    setShowGallery(false);
    setPublishModalVisible(true);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera-alt" size={60} color="#999999" />
        <Text style={styles.permissionText}>Camera permission required</Text>
        <Text style={styles.permissionSubText}>We need access to your camera to take photos</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          flash={flashMode}
          onCameraReady={handleCameraReady}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Camera</Text>
            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={toggleFlash}
              >
                <MaterialIcons name={getFlashIcon()} size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={toggleCameraFacing}
              >
                <MaterialIcons name="flip-camera-ios" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters Bar */}
          <View style={styles.filtersBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScroll}
            >
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterButton,
                    selectedFilter === filter.id && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter(filter.id)}
                >
                  <MaterialIcons
                    name={filter.icon}
                    size={20}
                    color={selectedFilter === filter.id ? "#ffffff" : "#999999"}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === filter.id && styles.filterButtonTextActive
                  ]}>
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={openFullGallery}
            >
              {galleryImages.length > 0 ? (
                <Image
                  source={{ uri: galleryImages[0].uri }}
                  style={styles.galleryThumbnail}
                />
              ) : (
                <View style={styles.galleryPlaceholder}>
                  <MaterialIcons name="photo-library" size={24} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterButton}
              onPress={takePicture}
              activeOpacity={0.7}
            >
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.libraryButton}
              onPress={pickImageFromGallery}
            >
              <Feather name="image" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>

      {/* Gallery Modal */}
      <Modal
        visible={showGallery}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowGallery(false)}
      >
        <SafeAreaView style={styles.galleryModalContainer}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity onPress={() => setShowGallery(false)}>
              <Ionicons name="close" size={28} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.galleryTitle}>Recent Photos</Text>
            <View style={{ width: 28 }} />
          </View>

          {loadingGallery ? (
            <View style={styles.galleryLoading}>
              <ActivityIndicator size="large" color="#0095F6" />
            </View>
          ) : (
            <ScrollView>
              <View style={styles.galleryGrid}>
                {galleryImages.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    style={styles.galleryGridItem}
                    onPress={() => selectFromGallery(asset)}
                  >
                    <Image
                      source={{ uri: asset.uri }}
                      style={styles.galleryGridImage}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Publish Modal */}
      <Modal
        visible={publishModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClosePublishModal}
      >
        <View style={styles.publishModalContainer}>
          <View style={styles.publishModalContent}>
            <View style={styles.publishModalHeader}>
              <TouchableOpacity onPress={handleClosePublishModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.publishModalTitle}>New Post</Text>
              <TouchableOpacity
                onPress={handlePublish}
                disabled={isCreatingPost || !selectedImage}
              >
                {isCreatingPost ? (
                  <ActivityIndicator size="small" color="#0095F6" />
                ) : (
                  <Text style={[
                    styles.shareText,
                    (!selectedImage) && styles.shareTextDisabled
                  ]}>
                    Share
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.publishScroll}>
              <View style={styles.publishContent}>
                {selectedImage && (
                  <View style={styles.publishImageContainer}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.publishImage}
                    />
                    <TouchableOpacity
                      style={styles.editImageButton}
                      onPress={() => {
                        setShowGallery(true);
                        setPublishModalVisible(false);
                      }}
                    >
                      <Feather name="edit-2" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.captionContainer}>
                  <View style={styles.userInfo}>
                    {user?.profilePicture ? (
                      <Image
                        source={{ uri: user.profilePicture }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons name="person" size={20} color="#ffffff" />
                      </View>
                    )}
                    <Text style={styles.username}>
                      {user?.username || 'your_username'}
                    </Text>
                  </View>

                  <TextInput
                    style={styles.captionInput}
                    placeholder="Write a caption..."
                    placeholderTextColor="#8E8E93"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={2200}
                    textAlignVertical="top"
                    autoFocus={true}
                  />

                  <View style={styles.captionFooter}>
                    <Text style={styles.captionLength}>
                      {caption.length}/2200
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.locationButton}>
                    <Ionicons name="location-outline" size={20} color="#0095F6" />
                    <Text style={styles.locationText}>Add location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

// Styles remain the same as before...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 16,
  },
  filtersBar: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#0095F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  galleryThumbnail: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  libraryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
  },
  permissionSubText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0095F6',
  },
  secondaryButtonText: {
    color: '#0095F6',
    fontSize: 16,
    fontWeight: '600',
  },
  publishModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  publishModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '90%',
  },
  publishModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  cancelText: {
    fontSize: 16,
    color: '#000000',
  },
  publishModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0095F6',
  },
  shareTextDisabled: {
    opacity: 0.5,
  },
  publishScroll: {
    flex: 1,
  },
  publishContent: {
    padding: 12,
    gap: 12,
  },
  publishImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  publishImage: {
    width: '100%',
    height: '100%',
  },
  editImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0095F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  captionInput: {
    fontSize: 15,
    color: '#000000',
    minHeight: 100,
    padding: 0,
    textAlignVertical: 'top',
  },
  captionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  captionLength: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },
  locationText: {
    fontSize: 14,
    color: '#0095F6',
    fontWeight: '500',
  },
  galleryModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  galleryLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  galleryGridItem: {
    width: (width - 8) / 3,
    height: (width - 8) / 3,
    margin: 1,
    backgroundColor: '#F5F5F5',
  },
  galleryGridImage: {
    width: '100%',
    height: '100%',
  },
});